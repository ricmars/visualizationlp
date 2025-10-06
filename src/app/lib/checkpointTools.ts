import { Pool } from "pg";
import { checkpointManager } from "./db";
import { DB_TABLES } from "../types/database";
import { createSharedTools, SharedTool } from "./sharedTools";

// Thread-local storage for current checkpoint and case context
let currentCheckpointId: string | null = null;
let currentobjectid: number | null = null;

export function setCurrentCheckpoint(checkpointId: string | null) {
  currentCheckpointId = checkpointId;
  console.log("Set current checkpoint:", checkpointId);
}

export function getCurrentCheckpoint(): string | null {
  return currentCheckpointId;
}

export function setCurrentobjectid(objectid: number | null) {
  currentobjectid = objectid;
  console.log("Set current case ID:", objectid);
}

export function getCurrentobjectid(): number | null {
  return currentobjectid;
}

// Wrapper for database operations to capture changes
export async function captureOperation(
  operation: "insert" | "update" | "delete",
  tableName: string,
  primaryKey: unknown,
  previousData?: unknown,
): Promise<void> {
  if (!currentCheckpointId) {
    console.log("No active checkpoint, skipping operation capture");
    return;
  }

  if (!currentobjectid) {
    console.warn("No case ID in context for operation capture, skipping");
    return;
  }

  console.log(`Capturing ${operation} on ${tableName}:`, {
    primaryKey,
    previousData,
    objectid: currentobjectid,
  });

  await checkpointManager.logOperation(
    currentCheckpointId,
    currentobjectid,
    operation,
    tableName,
    primaryKey,
    previousData,
  );
}

// Enhanced database query function that captures changes
export async function executeWithCapture(
  pool: Pool,
  query: string,
  values: any[],
  operation: "insert" | "update" | "delete",
  tableName: string,
  primaryKey?: any,
): Promise<any> {
  // For updates and deletes, we need to capture the current state first
  let previousData = null;
  if ((operation === "update" || operation === "delete") && primaryKey) {
    try {
      const selectQuery = `SELECT * FROM "${tableName}" WHERE id = $1`;
      const selectResult = await pool.query(selectQuery, [primaryKey]);
      previousData = selectResult.rows[0] || null;
      console.log(`Captured previous data for ${operation}:`, previousData);
    } catch (error) {
      console.warn(`Could not capture previous data for ${operation}:`, error);
    }
  }

  // Execute the main operation
  const result = await pool.query(query, values);

  // Capture the operation for rollback
  if (operation === "insert" && result.rows[0]) {
    // For inserts, use the returned ID as primary key
    await captureOperation(operation, tableName, { id: result.rows[0].id });
  } else if (primaryKey) {
    await captureOperation(
      operation,
      tableName,
      { id: primaryKey },
      previousData,
    );
  }

  return result;
}

// Create checkpoint-aware tools
export function createCheckpointTools(pool: Pool) {
  const originalTools = createSharedTools(pool);

  return originalTools.map((tool) => {
    // Wrap each tool's execute function
    const originalExecute = tool.execute;

    return {
      ...tool,
      execute: async (params: any) => {
        console.log(`Executing checkpoint-aware tool: ${tool.name}`);

        // For database modification tools, wrap their operations
        if (
          [
            "saveFields",
            "saveObject",
            "saveView",
            "saveDecisionTable",
            "deleteField",
            "deleteView",
            "deleteDecisionTable",
            "createObject",
            "saveApplication",
            "saveTheme",
            "deleteTheme",
          ].includes(tool.name)
        ) {
          return await executeCheckpointAwareTool(
            tool.name,
            originalExecute,
            params,
            pool,
          );
        }

        // For read-only tools, execute normally
        return await originalExecute(params);
      },
    };
  });
}

async function executeCheckpointAwareTool(
  toolName: string,
  originalExecute: (params: any) => Promise<any>,
  params: any,
  pool: Pool,
): Promise<any> {
  // Record tool execution
  const currentCheckpoint = getCurrentCheckpoint();
  if (currentCheckpoint) {
    try {
      await checkpointManager.recordToolExecution(currentCheckpoint, toolName);
    } catch (error) {
      console.warn("Failed to record tool execution:", error);
    }
  }

  switch (toolName) {
    case "createObject":
      return await wrapCreateObject(originalExecute, params, pool);

    case "saveFields":
      return await wrapSaveFields(originalExecute, params, pool);

    case "saveView":
      return await wrapSaveView(originalExecute, params, pool);

    case "saveDecisionTable":
      return await wrapSaveDecisionTable(originalExecute, params, pool);

    case "saveObject":
      return await wrapSaveObject(originalExecute, params, pool);

    case "saveApplication":
      // Treat as update to Applications table; capture insert/update accordingly handled inside wrapper
      return await wrapSaveApplication(originalExecute, params, pool);

    case "deleteField":
    case "deleteView":
    case "deleteDecisionTable":
      return await wrapDelete(originalExecute, params, pool, toolName);

    case "saveTheme":
      return await wrapSaveTheme(originalExecute, params, pool);

    case "deleteTheme":
      return await wrapDeleteTheme(originalExecute, params, pool);

    default:
      return await originalExecute(params);
  }
}

async function wrapCreateObject(
  originalExecute: any,
  params: any,
  _pool: Pool,
) {
  console.log("Wrapping createObject with checkpoint capture");

  const result = await originalExecute(params);

  // Capture the insert operation
  if (result.id) {
    await captureOperation("insert", DB_TABLES.OBJECTS, { id: result.id });
  }

  return result;
}

async function wrapSaveFields(originalExecute: any, params: any, pool: Pool) {
  console.log("Wrapping saveFields with checkpoint capture");

  // Determine intended operations and capture previous state for updates
  const fields: Array<any> = Array.isArray(params?.fields) ? params.fields : [];
  const preUpdateState: Array<{
    op: "insert" | "update";
    prev?: any;
    id?: number;
  }> = [];

  for (const field of fields) {
    const { id, name, objectid } = field || {};
    if (typeof id === "number") {
      // Explicit update by id
      try {
        const prevRes = await pool.query(
          `SELECT * FROM "${DB_TABLES.FIELDS}" WHERE id = $1`,
          [id],
        );
        preUpdateState.push({
          op: "update",
          prev: prevRes.rows[0] || null,
          id,
        });
      } catch (e) {
        console.warn(
          "wrapSaveFields: failed to load previous field by id",
          id,
          e,
        );
        preUpdateState.push({ op: "update", prev: null, id });
      }
    } else if (name && objectid) {
      // Might be update by (name, objectid) or an insert
      try {
        const existing = await pool.query(
          `SELECT * FROM "${DB_TABLES.FIELDS}" WHERE name = $1 AND objectid = $2`,
          [name, objectid],
        );
        if ((existing.rowCount ?? 0) > 0) {
          preUpdateState.push({
            op: "update",
            prev: existing.rows[0] || null,
            id: existing.rows[0]?.id,
          });
        } else {
          preUpdateState.push({ op: "insert" });
        }
      } catch (e) {
        console.warn(
          "wrapSaveFields: failed to detect existing field by (name, objectid)",
          name,
          objectid,
          e,
        );
        // Default to insert if uncertain
        preUpdateState.push({ op: "insert" });
      }
    } else {
      // Missing identifiers — default to insert
      preUpdateState.push({ op: "insert" });
    }
  }

  // Execute original saveFields
  const result = await originalExecute(params);

  // Capture per-field operations using the same ordering
  const returnedIds: number[] = Array.isArray(result?.ids)
    ? (result.ids as number[])
    : [];
  for (let i = 0; i < preUpdateState.length; i++) {
    const state = preUpdateState[i];
    if (state.op === "insert") {
      const newId = returnedIds[i];
      if (typeof newId === "number") {
        await captureOperation("insert", DB_TABLES.FIELDS, { id: newId });
      } else if (
        result?.fields &&
        Array.isArray(result.fields) &&
        result.fields[i]?.id
      ) {
        // Fallback if ids array misaligned
        await captureOperation("insert", DB_TABLES.FIELDS, {
          id: result.fields[i].id,
        });
      }
    } else if (
      state.op === "update" &&
      typeof (state.id ?? state.prev?.id) === "number"
    ) {
      const targetId = (state.id ?? state.prev?.id) as number;
      await captureOperation(
        "update",
        DB_TABLES.FIELDS,
        { id: targetId },
        state.prev || undefined,
      );
    }
  }

  return result;
}

async function wrapSaveView(originalExecute: any, params: any, pool: Pool) {
  console.log("Wrapping saveView with checkpoint capture");
  const viewId = params?.id as number | undefined;
  let previousData: any = null;
  if (typeof viewId === "number") {
    try {
      const prev = await pool.query(
        `SELECT * FROM "${DB_TABLES.VIEWS}" WHERE id = $1`,
        [viewId],
      );
      previousData = prev.rows[0] || null;
    } catch (e) {
      console.warn("wrapSaveView: failed to load previous view", viewId, e);
    }
  }

  const result = await originalExecute(params);

  if (typeof viewId === "number") {
    // Update
    if (previousData) {
      await captureOperation(
        "update",
        DB_TABLES.VIEWS,
        { id: viewId },
        previousData,
      );
    }
  } else if (result?.id) {
    // Insert
    await captureOperation("insert", DB_TABLES.VIEWS, { id: result.id });
  }

  return result;
}

async function wrapSaveDecisionTable(
  originalExecute: any,
  params: any,
  pool: Pool,
) {
  console.log("Wrapping saveDecisionTable with checkpoint capture");
  const decisionTableId = params?.id as number | undefined;
  let previousData: any = null;
  if (typeof decisionTableId === "number") {
    try {
      const prev = await pool.query(
        `SELECT * FROM "${DB_TABLES.DECISION_TABLES}" WHERE id = $1`,
        [decisionTableId],
      );
      previousData = prev.rows[0] || null;
    } catch (e) {
      console.warn(
        "wrapSaveDecisionTable: failed to load previous decision table",
        decisionTableId,
        e,
      );
    }
  }

  const result = await originalExecute(params);

  if (typeof decisionTableId === "number") {
    // Update
    if (previousData) {
      await captureOperation(
        "update",
        DB_TABLES.DECISION_TABLES,
        { id: decisionTableId },
        previousData,
      );
    }
  } else if (result?.id) {
    // Insert
    await captureOperation("insert", DB_TABLES.DECISION_TABLES, {
      id: result.id,
    });
  }

  return result;
}

async function wrapSaveObject(originalExecute: any, params: any, pool: Pool) {
  console.log("Wrapping saveObject with checkpoint capture");

  // For saveObject, we need to capture the previous state before updating
  const objectid = params.id;
  let previousData = null;

  if (objectid) {
    try {
      const selectResult = await pool.query(
        `SELECT * FROM "${DB_TABLES.OBJECTS}" WHERE id = $1`,
        [objectid],
      );
      previousData = selectResult.rows[0] || null;
    } catch (error) {
      console.warn("Could not capture previous case data:", error);
    }
  }

  const result = await originalExecute(params);

  // Capture the update operation
  if (objectid && previousData) {
    await captureOperation(
      "update",
      DB_TABLES.OBJECTS,
      { id: objectid },
      previousData,
    );
  }

  return result;
}

async function wrapSaveApplication(
  originalExecute: any,
  params: any,
  pool: Pool,
) {
  console.log("Wrapping saveApplication with checkpoint capture");

  // Capture previous app state when updating
  const appId = params.id as number | undefined;
  let previousData = null;
  if (appId) {
    try {
      const res = await pool.query(
        `SELECT * FROM "${DB_TABLES.APPLICATIONS}" WHERE id = $1`,
        [appId],
      );
      previousData = res.rows[0] || null;
    } catch (e) {
      console.warn("Could not capture previous application data:", e);
    }
  }

  const result = await originalExecute(params);

  // Capture insert or update
  if (!appId && result?.id) {
    await captureOperation("insert", DB_TABLES.APPLICATIONS, { id: result.id });
  } else if (appId && previousData) {
    await captureOperation(
      "update",
      DB_TABLES.APPLICATIONS,
      { id: appId },
      previousData,
    );
  }

  // Also capture linking cases to application as updates to Cases
  if (Array.isArray(params.objectIds) && params.objectIds.length > 0) {
    for (const cid of params.objectIds) {
      try {
        const before = await pool.query(
          `SELECT * FROM "${DB_TABLES.OBJECTS}" WHERE id = $1`,
          [cid],
        );
        const prev = before.rows[0] || null;
        await captureOperation("update", DB_TABLES.OBJECTS, { id: cid }, prev);
      } catch (e) {
        console.warn("Could not capture case link update for case", cid, e);
      }
    }
  }

  return result;
}

async function wrapDelete(
  originalExecute: any,
  params: any,
  pool: Pool,
  toolName: string,
) {
  console.log(`Wrapping ${toolName} with checkpoint capture`);

  const tableName =
    toolName === "deleteField"
      ? DB_TABLES.FIELDS
      : toolName === "deleteView"
      ? DB_TABLES.VIEWS
      : DB_TABLES.DECISION_TABLES;
  const itemId = params.id;

  // Capture current state before deletion
  let previousData = null;
  if (itemId) {
    try {
      const selectResult = await pool.query(
        `SELECT * FROM "${tableName}" WHERE id = $1`,
        [itemId],
      );
      previousData = selectResult.rows[0] || null;
    } catch (error) {
      console.warn(`Could not capture previous data for ${toolName}:`, error);
    }
  }

  const result = await originalExecute(params);

  // Capture the delete operation
  if (itemId && previousData) {
    await captureOperation("delete", tableName, { id: itemId }, previousData);
  }

  return result;
}

async function wrapSaveTheme(originalExecute: any, params: any, pool: Pool) {
  console.log("Wrapping saveTheme with checkpoint capture");

  // Capture previous theme state when updating
  const themeId = params.id as number | undefined;
  let previousData = null;
  if (themeId) {
    try {
      const prev = await pool.query(
        `SELECT * FROM "${DB_TABLES.THEMES}" WHERE id = $1`,
        [themeId],
      );
      previousData = prev.rows[0] || null;
    } catch (e) {
      console.warn("wrapSaveTheme: failed to load previous theme", themeId, e);
    }
  }

  const result = await originalExecute(params);

  // Capture insert or update
  if (!themeId && result?.id) {
    await captureOperation("insert", DB_TABLES.THEMES, { id: result.id });
  } else if (themeId && previousData) {
    await captureOperation(
      "update",
      DB_TABLES.THEMES,
      { id: themeId },
      previousData,
    );
  }

  return result;
}

async function wrapDeleteTheme(originalExecute: any, params: any, pool: Pool) {
  console.log("Wrapping deleteTheme with checkpoint capture");

  const themeId = params.id;
  let previousData = null;

  if (themeId) {
    try {
      const prev = await pool.query(
        `SELECT * FROM "${DB_TABLES.THEMES}" WHERE id = $1`,
        [themeId],
      );
      previousData = prev.rows[0] || null;
    } catch (error) {
      console.warn(
        "Could not capture previous theme data for deleteTheme:",
        error,
      );
    }
  }

  const result = await originalExecute(params);

  // Capture the delete operation
  if (themeId && previousData) {
    await captureOperation(
      "delete",
      DB_TABLES.THEMES,
      { id: themeId },
      previousData,
    );
  }

  return result;
}

// Checkpoint session management
export interface CheckpointSession {
  id: string;
  description: string;
  startedAt: Date;
}

export class CheckpointSessionManager {
  private activeSession: CheckpointSession | null = null;

  async beginSession(
    objectid: number,
    description?: string,
    userCommand?: string,
    source = "LLM",
    applicationid?: number,
  ): Promise<CheckpointSession> {
    if (this.activeSession) {
      console.warn("Starting new checkpoint session while another is active");
      await this.rollbackSession(); // Clean up previous session
    }

    const checkpointId = await checkpointManager.beginCheckpoint(
      objectid,
      description,
      userCommand,
      source,
      applicationid,
    );
    setCurrentCheckpoint(checkpointId);
    setCurrentobjectid(objectid);

    this.activeSession = {
      id: checkpointId,
      description: description || "LLM Tool Execution",
      startedAt: new Date(),
    };

    console.log("Started checkpoint session:", this.activeSession);
    return this.activeSession;
  }

  async commitSession(): Promise<void> {
    if (!this.activeSession) {
      console.warn("No active checkpoint session to commit");
      return;
    }

    await checkpointManager.commitCheckpoint(this.activeSession.id);
    setCurrentCheckpoint(null);
    setCurrentobjectid(null);

    console.log("Committed checkpoint session:", this.activeSession.id);
    this.activeSession = null;
  }

  async rollbackSession(): Promise<void> {
    if (!this.activeSession) {
      console.warn("No active checkpoint session to rollback");
      return;
    }

    await checkpointManager.rollbackCheckpoint(this.activeSession.id);
    setCurrentCheckpoint(null);
    setCurrentobjectid(null);

    console.log("Rolled back checkpoint session:", this.activeSession.id);
    this.activeSession = null;
  }

  getActiveSession(): CheckpointSession | null {
    return this.activeSession;
  }

  async getActiveCheckpoints(objectid?: number, applicationid?: number) {
    return await checkpointManager.getActiveCheckpoints(
      objectid,
      applicationid,
    );
  }

  async restoreToCheckpoint(checkpointId: string): Promise<void> {
    // If there's an active session, rollback first
    if (this.activeSession) {
      await this.rollbackSession();
    }

    // Restore to the specified checkpoint
    await checkpointManager.restoreToCheckpoint(checkpointId);
    console.log("Restored to checkpoint:", checkpointId);
  }

  async getCheckpointHistory(objectid?: number, applicationid?: number) {
    return await checkpointManager.getCheckpointHistory(
      objectid,
      applicationid,
    );
  }

  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await checkpointManager.deleteCheckpoint(checkpointId);
    console.log("Deleted checkpoint:", checkpointId);
  }

  async deleteAllCheckpoints(
    objectid?: number,
    applicationid?: number,
  ): Promise<void> {
    await checkpointManager.deleteAllCheckpoints(objectid, applicationid);
    if (applicationid !== undefined) {
      console.log(`Deleted all checkpoints for application ${applicationid}`);
    } else if (objectid !== undefined) {
      console.log(`Deleted all checkpoints for case ${objectid}`);
    } else {
      console.log("Deleted all checkpoints");
    }
  }
}

export const checkpointSessionManager = new CheckpointSessionManager();

// Create checkpoint-aware shared tools
export function createCheckpointSharedTools(pool: Pool) {
  const sharedTools = createSharedTools(pool);
  return sharedTools.map((tool) => createCheckpointWrapper(tool, pool));
}

// Convert shared tools to LLM tools format (same as in llmTools.ts)
export function convertToLLMTools(sharedTools: SharedTool<any, any>[]) {
  return sharedTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    execute: tool.execute,
  }));
}

// Create a checkpoint wrapper for a single tool
export function createCheckpointWrapper(
  tool: SharedTool<any, any>,
  pool: Pool,
) {
  return {
    ...tool,
    execute: async (params: any) => {
      console.log(`Executing checkpoint-aware tool: ${tool.name}`);
      return await executeCheckpointAwareTool(
        tool.name,
        tool.execute,
        params,
        pool,
      );
    },
  };
}
