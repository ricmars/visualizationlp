import { Pool } from "pg";
import { registerRuleTypes } from "../types/ruleTypeDefinitions";
import { ruleTypeRegistry } from "../types/ruleTypeRegistry";

console.log("Database configuration:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("NODE_ENV:", process.env.NODE_ENV);

// Create a new pool using the DATABASE_URL environment variable
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    // Enable SSL for all environments (required for Neon)
  },
  // Performance optimizations for better response times
  max: 20, // Increased for better concurrency
  min: 2, // Keep some connections ready
  idleTimeoutMillis: 30000, // Reduced to 30 seconds for faster cleanup
  connectionTimeoutMillis: 5000, // Reduced to 5 seconds for faster connection attempts
  // Add connection retry logic
  allowExitOnIdle: true,
  // Better error handling
  maxUses: 10000, // Recycle connections after 10000 uses
  // Statement timeout to prevent long-running queries
  statement_timeout: 30000, // 30 seconds
});

console.log("Database pool created");

// Test the connection
pool.on("connect", (_client) => {
  console.log("Connected to the database");
  console.log("Client connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  console.error("Error stack:", err.stack);
  // Don't exit the process immediately, just log the error
  // process.exit(-1); // Removed to prevent app crashes
});

// Add connection cleanup on app shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down database pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down database pool...");
  await pool.end();
  process.exit(0);
});

// Connection health check function
export async function checkDatabaseConnection(): Promise<{
  status: "ok" | "error";
  message: string;
}> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return { status: "ok", message: "Database connection is healthy" };
  } catch (error) {
    console.error("Database connection check failed:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

// Retry wrapper for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Database operation failed (attempt ${attempt}/${maxRetries}):`,
        error,
      );

      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Register all rule types first
    registerRuleTypes();

    // Initialize tables for all registered rule types directly from rule type registry
    const ruleTypes = ruleTypeRegistry.getAll();
    for (const ruleType of ruleTypes) {
      const migration = ruleTypeRegistry.generateDatabaseMigration(ruleType.id);
      await pool.query(migration);
      console.log(`✅ Initialized table for ${ruleType.name}`);
    }

    // Create undo_log table for checkpoint functionality (this is not a rule type, so it stays hardcoded)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "undo_log" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checkpoint_id UUID NOT NULL,
        objectid INTEGER NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
        table_name TEXT NOT NULL,
        primary_key JSONB NOT NULL,
        previous_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        applied_at TIMESTAMP
      );
    `);

    // Create index for checkpoint operations
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS undo_log_checkpoint_idx ON "undo_log" (checkpoint_id, created_at DESC);
      `);
    } catch (_error) {
      console.log(
        "Index undo_log_checkpoint_idx may already exist, continuing...",
      );
    }

    // Create index for undo_log objectid (references Objects.id)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS undo_log_objectid_idx ON "undo_log" (objectid);
      `);
    } catch (_error) {
      console.log(
        "Index undo_log_objectid_idx may already exist, continuing...",
      );
    }

    // Create index for batch checkpoint queries (optimized for ANY() operations)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS undo_log_checkpoint_batch_idx ON "undo_log" (checkpoint_id) INCLUDE (operation, table_name, primary_key, previous_data, created_at);
      `);
    } catch (_error) {
      console.log(
        "Index undo_log_checkpoint_batch_idx may already exist, continuing...",
      );
    }

    // Create foreign key for undo_log objectid if it doesn't exist (to Objects)
    try {
      await pool.query(`
        ALTER TABLE "undo_log"
        ADD CONSTRAINT IF NOT EXISTS undo_log_objectid_fkey
        FOREIGN KEY (objectid) REFERENCES "Objects" (id) ON DELETE CASCADE;
      `);
    } catch (_error) {
      console.log(
        "Foreign key undo_log_objectid_fkey may already exist, continuing...",
      );
    }

    // Create checkpoints table for metadata
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "checkpoints" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        objectid INTEGER NOT NULL,
        applicationid INTEGER,
        description TEXT,
        user_command TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'rolled_back', 'historical')),
        created_at TIMESTAMP DEFAULT NOW(),
        finished_at TIMESTAMP,
        source TEXT DEFAULT 'LLM' CHECK (source IN ('LLM', 'MCP', 'API')),
        tools_executed JSONB DEFAULT '[]',
        changes_count INTEGER DEFAULT 0
      );
    `);

    // Create index for checkpoints objectid (references Objects.id)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS checkpoints_objectid_idx ON "checkpoints" (objectid, created_at DESC);
      `);
    } catch (_error) {
      console.log(
        "Index checkpoints_objectid_idx may already exist, continuing...",
      );
    }

    // Create index for checkpoints applicationid
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS checkpoints_applicationid_idx ON "checkpoints" (applicationid, created_at DESC);
      `);
    } catch (_error) {
      console.log(
        "Index checkpoints_applicationid_idx may already exist, continuing...",
      );
    }

    // Create composite index for active checkpoints query optimization
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS checkpoints_active_status_idx ON "checkpoints" (status, objectid, applicationid, created_at DESC);
      `);
    } catch (_error) {
      console.log(
        "Index checkpoints_active_status_idx may already exist, continuing...",
      );
    }

    // Create index for status-only queries
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS checkpoints_status_idx ON "checkpoints" (status, created_at DESC);
      `);
    } catch (_error) {
      console.log(
        "Index checkpoints_status_idx may already exist, continuing...",
      );
    }

    // Create foreign key for checkpoints objectid if it doesn't exist (to Objects)
    try {
      await pool.query(`
        ALTER TABLE "checkpoints"
        ADD CONSTRAINT IF NOT EXISTS checkpoints_objectid_fkey
        FOREIGN KEY (objectid) REFERENCES "Objects" (id) ON DELETE CASCADE;
      `);
    } catch (_error) {
      console.log(
        "Foreign key checkpoints_objectid_fkey may already exist, continuing...",
      );
    }

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
    throw error;
  }
}

// Drop all tables and recreate schema
export async function resetDatabase() {
  try {
    // First, check what tables exist
    const existingTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `);
    console.log("Existing tables before drop:", existingTables.rows);

    // Drop tables dynamically using the rule type registry first, then non-registry tables
    console.log("Dropping tables...");
    const ruleTypes = ruleTypeRegistry.getAll();
    // Best-effort: drop rule-type tables; the CASCADE will resolve order
    for (const rt of ruleTypes) {
      const table = rt.databaseSchema?.tableName;
      if (table) {
        try {
          await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        } catch (err) {
          console.warn(`Failed to drop table ${table}:`, err);
        }
      }
    }
    // Drop checkpoint-related tables
    await pool.query(`
      DROP TABLE IF EXISTS "undo_log" CASCADE;
      DROP TABLE IF EXISTS "checkpoints" CASCADE;
    `);

    // Verify tables were dropped
    const tablesAfterDrop = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `);
    console.log("Tables after drop:", tablesAfterDrop.rows);

    console.log("All tables dropped successfully");

    // Reinitialize the database
    await initializeDatabase();

    // Verify tables were recreated
    const tablesAfterInit = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `);
    console.log("Tables after initialization:", tablesAfterInit.rows);

    console.log("Database reset completed successfully");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
}

// Checkpoint Management Functions
export interface CheckpointManager {
  beginCheckpoint(
    objectid: number,
    description?: string,
    userCommand?: string,
    source?: string,
    applicationid?: number,
  ): Promise<string>;
  commitCheckpoint(checkpointId: string): Promise<void>;
  rollbackCheckpoint(checkpointId: string): Promise<void>;
  restoreToCheckpoint(checkpointId: string): Promise<void>;
  logOperation(
    checkpointId: string,
    objectid: number,
    operation: "insert" | "update" | "delete",
    tableName: string,
    primaryKey: unknown,
    previousData?: unknown,
  ): Promise<void>;
  recordToolExecution(checkpointId: string, toolName: string): Promise<void>;
  getActiveCheckpoints(
    objectid?: number,
    applicationid?: number,
  ): Promise<Array<{ id: string; description: string; created_at: Date }>>;
  getCheckpointHistory(
    objectid?: number,
    applicationid?: number,
  ): Promise<
    Array<{
      id: string;
      description: string;
      user_command: string;
      status: string;
      source: string;
      created_at: Date;
      finished_at: Date;
      tools_executed: string[];
      changes_count: number;
    }>
  >;
  applyUndoOperation(client: any, op: any): Promise<void>;
  deleteCheckpoint(checkpointId: string): Promise<void>;
  deleteAllCheckpoints(
    objectid?: number,
    applicationid?: number,
  ): Promise<void>;
}

export const checkpointManager: CheckpointManager = {
  async beginCheckpoint(
    objectid: number,
    description = "LLM Tool Execution",
    userCommand?: string,
    source = "LLM",
    applicationid?: number,
  ): Promise<string> {
    console.log("Creating new checkpoint:", description, "for case:", objectid);

    const result = await pool.query(
      `
      INSERT INTO "checkpoints" (objectid, applicationid, description, user_command, status, source)
      VALUES ($1, $2, $3, $4, 'active', $5)
      RETURNING id
    `,
      [objectid, applicationid, description, userCommand, source],
    );

    const checkpointId = result.rows[0].id;
    console.log("Checkpoint created:", checkpointId);

    return checkpointId;
  },

  async commitCheckpoint(checkpointId: string): Promise<void> {
    console.log("Committing checkpoint:", checkpointId);

    // Count changes before marking as historical
    const changesResult = await pool.query(
      `
      SELECT COUNT(*) as count FROM "undo_log" WHERE checkpoint_id = $1
    `,
      [checkpointId],
    );

    const changesCount = parseInt(changesResult.rows[0].count);

    // Mark as historical instead of deleting (preserve for history)
    await pool.query(
      `
      UPDATE "checkpoints"
      SET status = 'historical', finished_at = NOW(), changes_count = $2
      WHERE id = $1
    `,
      [checkpointId, changesCount],
    );

    // Keep undo logs for potential restoration (don't delete)
    console.log(`Checkpoint marked as historical with ${changesCount} changes`);
  },

  async rollbackCheckpoint(checkpointId: string): Promise<void> {
    console.log("Rolling back checkpoint:", checkpointId);

    // Get undo operations in reverse order
    const undoOps = await pool.query(
      `
      SELECT operation, table_name, primary_key, previous_data
      FROM "undo_log"
      WHERE checkpoint_id = $1
      ORDER BY created_at DESC
    `,
      [checkpointId],
    );

    console.log(`Found ${undoOps.rows.length} operations to undo`);

    // Begin transaction for rollback with better error handling
    const client = await pool.connect();
    try {
      // Set a shorter statement timeout for rollback operations
      await client.query("SET statement_timeout = '30s'");
      await client.query("BEGIN");

      for (const op of undoOps.rows) {
        await this.applyUndoOperation(client, op);
      }

      // Mark checkpoint as rolled back
      await client.query(
        `
        UPDATE "checkpoints"
        SET status = 'rolled_back', finished_at = NOW()
        WHERE id = $1
      `,
        [checkpointId],
      );

      // Clean up undo logs
      await client.query(
        `
        DELETE FROM "undo_log"
        WHERE checkpoint_id = $1
      `,
        [checkpointId],
      );

      await client.query("COMMIT");
      console.log("Checkpoint rollback completed successfully");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to rollback transaction:", rollbackError);
      }
      console.error("Rollback failed:", error);
      throw error;
    } finally {
      try {
        client.release();
      } catch (releaseError) {
        console.error("Failed to release client:", releaseError);
      }
    }
  },

  async applyUndoOperation(client: any, op: any): Promise<void> {
    const { operation, table_name, primary_key, previous_data } = op;

    console.log(`Undoing ${operation} on ${table_name}:`, primary_key);

    switch (operation) {
      case "insert":
        // Undo insert by deleting the record
        const deleteKeys = Object.keys(primary_key);
        const deleteValues = Object.values(primary_key);
        const deleteWhere = deleteKeys
          .map((key, i) => `"${key}" = $${i + 1}`)
          .join(" AND ");

        await client.query(
          `DELETE FROM "${table_name}" WHERE ${deleteWhere}`,
          deleteValues,
        );
        break;

      case "delete":
        // Undo delete by reinserting the record
        if (!previous_data) {
          throw new Error("Cannot undo delete: no previous data stored");
        }

        // Check if this table has auto-generated ID columns that should be excluded
        const insertData = { ...previous_data };

        // For common auto-generated ID patterns, exclude them from insert
        // This allows the database to regenerate them
        if (
          insertData.id &&
          table_name !== "checkpoints" &&
          table_name !== "undo_log"
        ) {
          delete insertData.id;
        }

        const insertKeys = Object.keys(insertData);
        const insertValues = Object.values(insertData);
        const insertColumns = insertKeys.map((key) => `"${key}"`).join(", ");
        const insertPlaceholders = insertValues
          .map((_, i) => `$${i + 1}`)
          .join(", ");

        await client.query(
          `INSERT INTO "${table_name}" (${insertColumns}) VALUES (${insertPlaceholders})`,
          insertValues,
        );
        break;

      case "update":
        // Undo update by restoring previous values
        if (!previous_data) {
          throw new Error("Cannot undo update: no previous data stored");
        }

        const primaryKeys = Object.keys(primary_key);
        const primaryValues = Object.values(primary_key);

        // Filter out primary key fields from the update data to avoid updating immutable columns
        const updateData = { ...previous_data };
        primaryKeys.forEach((key) => delete updateData[key]);

        const updateKeys = Object.keys(updateData);
        const updateValues = Object.values(updateData);

        // Only proceed if there are non-primary-key fields to update
        if (updateKeys.length > 0) {
          const setClause = updateKeys
            .map((key, i) => `"${key}" = $${i + 1}`)
            .join(", ");
          const whereClause = primaryKeys
            .map((key, i) => `"${key}" = $${updateKeys.length + i + 1}`)
            .join(" AND ");

          await client.query(
            `UPDATE "${table_name}" SET ${setClause} WHERE ${whereClause}`,
            [...updateValues, ...primaryValues],
          );
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },

  async logOperation(
    checkpointId: string,
    objectid: number,
    operation: "insert" | "update" | "delete",
    tableName: string,
    primaryKey: unknown,
    previousData?: unknown,
  ): Promise<void> {
    await pool.query(
      `
      INSERT INTO "undo_log" (checkpoint_id, objectid, operation, table_name, primary_key, previous_data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        checkpointId,
        objectid,
        operation,
        tableName,
        JSON.stringify(primaryKey),
        previousData ? JSON.stringify(previousData) : null,
      ],
    );
  },

  async getActiveCheckpoints(
    objectid?: number,
    applicationid?: number,
  ): Promise<Array<{ id: string; description: string; created_at: Date }>> {
    // Use a more efficient query with proper parameter handling
    let query: string;
    const values: unknown[] = [];

    if (objectid !== undefined && applicationid !== undefined) {
      // Both objectid and applicationid provided - use composite index
      query = `
        SELECT id, description, created_at
        FROM "checkpoints"
        WHERE status = 'active' AND objectid = $1 AND applicationid = $2
        ORDER BY created_at DESC
        LIMIT 100
      `;
      values.push(objectid, applicationid);
    } else if (objectid !== undefined) {
      // Only objectid provided
      query = `
        SELECT id, description, created_at
        FROM "checkpoints"
        WHERE status = 'active' AND objectid = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;
      values.push(objectid);
    } else if (applicationid !== undefined) {
      // Only applicationid provided
      query = `
        SELECT id, description, created_at
        FROM "checkpoints"
        WHERE status = 'active' AND applicationid = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;
      values.push(applicationid);
    } else {
      // No filters - get all active checkpoints
      query = `
        SELECT id, description, created_at
        FROM "checkpoints"
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    console.log(
      "Executing getActiveCheckpoints query:",
      query,
      "with values:",
      values,
    );
    const startTime = Date.now();
    const result = await pool.query(query, values);
    const duration = Date.now() - startTime;
    console.log(
      `Found ${result.rows.length} active checkpoints in ${duration}ms`,
    );

    return result.rows;
  },

  async restoreToCheckpoint(checkpointId: string): Promise<void> {
    console.log("Restoring to checkpoint:", checkpointId);

    // Get all checkpoints from this one onwards (including the target checkpoint)
    const checkpointsToUndo = await pool.query(
      `
      SELECT id FROM "checkpoints"
      WHERE created_at >= (SELECT created_at FROM "checkpoints" WHERE id = $1)
      AND status IN ('historical', 'committed')
      ORDER BY created_at DESC
    `,
      [checkpointId],
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Undo each checkpoint in reverse chronological order
      for (const checkpoint of checkpointsToUndo.rows) {
        const undoOps = await client.query(
          `
          SELECT operation, table_name, primary_key, previous_data
          FROM "undo_log"
          WHERE checkpoint_id = $1
          ORDER BY created_at DESC
        `,
          [checkpoint.id],
        );

        for (const op of undoOps.rows) {
          await this.applyUndoOperation(client, op);
        }

        // Mark checkpoint as rolled back
        await client.query(
          `UPDATE "checkpoints" SET status = 'rolled_back', finished_at = NOW() WHERE id = $1`,
          [checkpoint.id],
        );

        // Delete undo log entries for this checkpoint
        await client.query(`DELETE FROM "undo_log" WHERE checkpoint_id = $1`, [
          checkpoint.id,
        ]);
      }

      await client.query("COMMIT");
      console.log(
        `Restored to state before checkpoint ${checkpointId} by undoing ${checkpointsToUndo.rows.length} checkpoints`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Restoration failed:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  async recordToolExecution(
    checkpointId: string,
    toolName: string,
  ): Promise<void> {
    await pool.query(
      `
      UPDATE "checkpoints"
      SET tools_executed = tools_executed || $2::jsonb
      WHERE id = $1
    `,
      [checkpointId, JSON.stringify([toolName])],
    );
  },

  async getCheckpointHistory(
    objectid?: number,
    applicationid?: number,
  ): Promise<
    Array<{
      id: string;
      description: string;
      user_command: string;
      status: string;
      source: string;
      created_at: Date;
      finished_at: Date;
      tools_executed: string[];
      changes_count: number;
    }>
  > {
    let query = `
      SELECT
        id,
        description,
        user_command,
        status,
        source,
        created_at,
        finished_at,
        tools_executed,
        changes_count
      FROM "checkpoints"
      WHERE status IN ('historical', 'committed', 'rolled_back')
    `;
    const values: unknown[] = [];

    if (objectid !== undefined) {
      query += ` AND objectid = $1`;
      values.push(objectid);
    }

    if (applicationid !== undefined) {
      query += ` AND applicationid = $${values.length + 1}`;
      values.push(applicationid);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, values);

    return result.rows.map((row) => ({
      ...row,
      tools_executed: row.tools_executed || [],
    }));
  },

  async deleteCheckpoint(checkpointId: string): Promise<void> {
    console.log("Deleting checkpoint:", checkpointId);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete undo log entries for this checkpoint
      await client.query(`DELETE FROM "undo_log" WHERE checkpoint_id = $1`, [
        checkpointId,
      ]);

      // Delete the checkpoint
      await client.query(`DELETE FROM "checkpoints" WHERE id = $1`, [
        checkpointId,
      ]);

      await client.query("COMMIT");
      console.log(`Deleted checkpoint ${checkpointId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Checkpoint deletion failed:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteAllCheckpoints(
    objectid?: number,
    applicationid?: number,
  ): Promise<void> {
    const logMessage = applicationid
      ? `Deleting all checkpoints for application ${applicationid}`
      : objectid
      ? `Deleting all checkpoints for case ${objectid}`
      : "Deleting all checkpoints";
    console.log(logMessage);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (applicationid !== undefined) {
        // Delete undo log entries for specific application (all cases within the application)
        const undoResult = await client.query(
          `DELETE FROM "undo_log" WHERE objectid IN (
            SELECT id FROM "Objects" WHERE applicationid = $1
          )`,
          [applicationid],
        );

        // Delete checkpoints for specific application
        const checkpointResult = await client.query(
          `DELETE FROM "checkpoints" WHERE applicationid = $1`,
          [applicationid],
        );

        await client.query("COMMIT");
        console.log(
          `Deleted ${checkpointResult.rowCount} checkpoints and ${undoResult.rowCount} undo log entries for application ${applicationid}`,
        );
      } else if (objectid !== undefined) {
        // Delete undo log entries for specific case
        const undoResult = await client.query(
          `DELETE FROM "undo_log" WHERE objectid = $1`,
          [objectid],
        );

        // Delete checkpoints for specific case
        const checkpointResult = await client.query(
          `DELETE FROM "checkpoints" WHERE objectid = $1`,
          [objectid],
        );

        await client.query("COMMIT");
        console.log(
          `Deleted ${checkpointResult.rowCount} checkpoints and ${undoResult.rowCount} undo log entries for case ${objectid}`,
        );
      } else {
        // Delete all undo log entries
        await client.query(`DELETE FROM "undo_log"`);

        // Delete all checkpoints
        const result = await client.query(`DELETE FROM "checkpoints"`);

        await client.query("COMMIT");
        console.log(`Deleted all checkpoints (${result.rowCount} total)`);
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Checkpoint deletion failed:", error);
      throw error;
    } finally {
      client.release();
    }
  },
};
