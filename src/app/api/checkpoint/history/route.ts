import { NextRequest, NextResponse } from "next/server";
import { checkpointSessionManager } from "../../../lib/checkpointTools";
import { pool } from "../../../lib/db";
import { DB_TABLES } from "../../../types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectid = searchParams.get("objectid");
    const applicationid = searchParams.get("applicationid");
    const objectidNum = objectid ? parseInt(objectid) : undefined;
    const applicationIdNum = applicationid
      ? parseInt(applicationid)
      : undefined;

    const history = await checkpointSessionManager.getCheckpointHistory(
      objectidNum,
      applicationIdNum,
    );

    if (history.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Get all checkpoint IDs
    const checkpointIds = history.map((cp) => cp.id);

    // Batch fetch all undo_log entries for all checkpoints
    const undoLogResult = await pool.query(
      `SELECT checkpoint_id, operation, table_name, primary_key, previous_data
       FROM "undo_log"
       WHERE checkpoint_id = ANY($1)
       ORDER BY checkpoint_id, created_at DESC`,
      [checkpointIds],
    );

    // Group undo_log entries by checkpoint_id
    const undoLogByCheckpoint = new Map<string, any[]>();
    for (const row of undoLogResult.rows) {
      if (!undoLogByCheckpoint.has(row.checkpoint_id)) {
        undoLogByCheckpoint.set(row.checkpoint_id, []);
      }
      undoLogByCheckpoint.get(row.checkpoint_id)!.push(row);
    }

    // Collect all IDs that need to be fetched from main tables
    const fieldIds = new Set<number>();
    const viewIds = new Set<number>();
    const objectids = new Set<number>();
    const applicationIds = new Set<number>();

    // Process undo_log entries to collect IDs
    for (const entries of undoLogByCheckpoint.values()) {
      for (const row of entries) {
        let id: number | undefined;
        try {
          id =
            typeof row.primary_key === "object"
              ? row.primary_key.id
              : JSON.parse(row.primary_key)?.id;
        } catch {
          continue;
        }

        if (!id) continue;

        switch (row.table_name) {
          case DB_TABLES.FIELDS:
            fieldIds.add(id);
            break;
          case DB_TABLES.VIEWS:
            viewIds.add(id);
            break;
          case DB_TABLES.OBJECTS:
            objectids.add(id);
            break;
          case DB_TABLES.APPLICATIONS:
            applicationIds.add(id);
            break;
        }
      }
    }

    // Batch fetch all current data from main tables
    const currentData = {
      fields: new Map<number, { name: string; type: string }>(),
      views: new Map<number, { name: string }>(),
      cases: new Map<number, { name: string }>(),
      applications: new Map<number, { name: string }>(),
    };

    // Fetch fields data
    if (fieldIds.size > 0) {
      const fieldIdsArray = Array.from(fieldIds);
      const fieldsResult = await pool.query(
        `SELECT id, name, type FROM "${DB_TABLES.FIELDS}" WHERE id = ANY($1)`,
        [fieldIdsArray],
      );
      for (const row of fieldsResult.rows) {
        currentData.fields.set(row.id, { name: row.name, type: row.type });
      }
    }

    // Fetch views data
    if (viewIds.size > 0) {
      const viewIdsArray = Array.from(viewIds);
      const viewsResult = await pool.query(
        `SELECT id, name FROM "${DB_TABLES.VIEWS}" WHERE id = ANY($1)`,
        [viewIdsArray],
      );
      for (const row of viewsResult.rows) {
        currentData.views.set(row.id, { name: row.name });
      }
    }

    // Fetch cases data
    if (objectids.size > 0) {
      const objectidsArray = Array.from(objectids);
      const casesResult = await pool.query(
        `SELECT id, name FROM "${DB_TABLES.OBJECTS}" WHERE id = ANY($1)`,
        [objectidsArray],
      );
      for (const row of casesResult.rows) {
        currentData.cases.set(row.id, { name: row.name });
      }
    }

    // Fetch applications data
    if (applicationIds.size > 0) {
      const applicationIdsArray = Array.from(applicationIds);
      const applicationsResult = await pool.query(
        `SELECT id, name FROM "${DB_TABLES.APPLICATIONS}" WHERE id = ANY($1)`,
        [applicationIdsArray],
      );
      for (const row of applicationsResult.rows) {
        currentData.applications.set(row.id, { name: row.name });
      }
    }

    // Process and augment checkpoints
    const augmented = history.map((checkpoint) => {
      const updates: Array<{ name: string; type: string; operation: string }> =
        [];
      const checkpointEntries = undoLogByCheckpoint.get(checkpoint.id) || [];

      for (const row of checkpointEntries) {
        const table: string = row.table_name;
        const rawOp: string = row.operation;
        const operation: string =
          rawOp === "insert"
            ? "Create"
            : rawOp === "update"
            ? "Update"
            : rawOp === "delete"
            ? "Delete"
            : rawOp;

        let name: string | undefined;
        let type: string | undefined;
        let id: number | undefined;

        try {
          id =
            typeof row.primary_key === "object"
              ? row.primary_key.id
              : JSON.parse(row.primary_key)?.id;
        } catch {
          continue;
        }

        const readPrev = () => {
          try {
            const prev =
              typeof row.previous_data === "object"
                ? row.previous_data
                : JSON.parse(row.previous_data);
            return prev || null;
          } catch {
            return null;
          }
        };

        // Map table to rule type and get name/type
        switch (table) {
          case DB_TABLES.FIELDS:
            type = "Field";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
              type = prev?.type || type;
            } else if (id && currentData.fields.has(id)) {
              const fieldData = currentData.fields.get(id)!;
              name = fieldData.name;
              type = fieldData.type || type;
            }
            break;

          case DB_TABLES.VIEWS:
            type = "View";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.views.has(id)) {
              name = currentData.views.get(id)!.name;
            }
            break;

          case DB_TABLES.OBJECTS:
            type = "Object";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.cases.has(id)) {
              name = currentData.cases.get(id)!.name;
            }
            break;

          case DB_TABLES.APPLICATIONS:
            type = "Application";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.applications.has(id)) {
              name = currentData.applications.get(id)!.name;
            }
            break;
        }

        if (name && type) {
          updates.push({ name, type, operation });
        }
      }

      return {
        ...checkpoint,
        created_at: checkpoint.created_at.toISOString(),
        finished_at: checkpoint.finished_at?.toISOString(),
        updated_rules: updates,
      };
    });

    return NextResponse.json({ history: augmented });
  } catch (error) {
    console.error("Error fetching checkpoint history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch checkpoint history",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
