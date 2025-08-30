import { NextRequest, NextResponse } from "next/server";
import { checkpointSessionManager } from "../../../lib/checkpointTools";
import { pool } from "../../../lib/db";
import { DB_TABLES } from "../../../types/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseid = searchParams.get("caseid");
    const applicationid = searchParams.get("applicationid");
    const caseIdNum = caseid ? parseInt(caseid) : undefined;
    const applicationIdNum = applicationid
      ? parseInt(applicationid)
      : undefined;

    const history = await checkpointSessionManager.getCheckpointHistory(
      caseIdNum,
      applicationIdNum,
    );

    // For each checkpoint, augment with list of updated rules (name + type)
    const augmented = [] as any[];
    for (const checkpoint of history) {
      const updates: Array<{ name: string; type: string; operation: string }> =
        [];
      try {
        const details = await pool.query(
          `SELECT operation, table_name, primary_key, previous_data FROM "undo_log" WHERE checkpoint_id = $1 ORDER BY created_at DESC`,
          [checkpoint.id],
        );

        for (const row of details.rows) {
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
            id = undefined;
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

          // Map table to rule type and fetch current data when available
          if (table === DB_TABLES.FIELDS) {
            type = "Field";
            if (operation === "delete") {
              const prev = readPrev();
              name = prev?.name;
              type = prev?.type || type;
            } else if (id) {
              const res = await pool.query(
                `SELECT name, type FROM "${DB_TABLES.FIELDS}" WHERE id = $1`,
                [id],
              );
              if (res.rows[0]) {
                name = res.rows[0].name;
                type = res.rows[0].type || type;
              }
            }
          } else if (table === DB_TABLES.VIEWS) {
            type = "View";
            if (operation === "delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id) {
              const res = await pool.query(
                `SELECT name FROM "${DB_TABLES.VIEWS}" WHERE id = $1`,
                [id],
              );
              if (res.rows[0]) {
                name = res.rows[0].name;
              }
            }
          } else if (table === DB_TABLES.CASES) {
            type = "Case";
            if (operation === "delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id) {
              const res = await pool.query(
                `SELECT name FROM "${DB_TABLES.CASES}" WHERE id = $1`,
                [id],
              );
              if (res.rows[0]) {
                name = res.rows[0].name;
              }
            }
          } else if (table === DB_TABLES.APPLICATIONS) {
            type = "Application";
            if (operation === "delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id) {
              const res = await pool.query(
                `SELECT name FROM "${DB_TABLES.APPLICATIONS}" WHERE id = $1`,
                [id],
              );
              if (res.rows[0]) {
                name = res.rows[0].name;
              }
            }
          }

          if (name && type) {
            updates.push({ name, type, operation });
          }
        }
      } catch (e) {
        console.warn("Failed to augment checkpoint with updates:", e);
      }

      augmented.push({
        ...checkpoint,
        created_at: checkpoint.created_at.toISOString(),
        finished_at: checkpoint.finished_at?.toISOString(),
        updated_rules: updates,
      });
    }

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
