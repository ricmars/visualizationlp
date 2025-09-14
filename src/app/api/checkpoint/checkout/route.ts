import { NextRequest, NextResponse } from "next/server";
import { checkpointSessionManager } from "../../../lib/checkpointTools";
import { pool } from "../../../lib/db";
import { DB_TABLES } from "../../../types/database";

interface RuleChange {
  id: string;
  name: string;
  type: string;
  category: string;
  operation: string;
  checkpointId: string;
  checkpointDescription: string;
  checkpointCreatedAt: string;
  checkpointSource: string;
}

interface CategoryGroup {
  category: string;
  categoryName: string;
  rules: RuleChange[];
}

interface ObjectGroup {
  objectId: number;
  objectName: string;
  hasWorkflow: boolean;
  categories: CategoryGroup[];
  totalChanges: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectid = searchParams.get("objectid");
    const applicationid = searchParams.get("applicationid");
    const objectidNum = objectid ? parseInt(objectid) : undefined;
    const applicationIdNum = applicationid
      ? parseInt(applicationid)
      : undefined;

    if (!objectidNum && !applicationIdNum) {
      return NextResponse.json(
        { error: "Either objectid or applicationid is required" },
        { status: 400 },
      );
    }

    // Get all checkpoints for the application/case
    const history = await checkpointSessionManager.getCheckpointHistory(
      objectidNum,
      applicationIdNum,
    );

    if (history.length === 0) {
      return NextResponse.json({
        categories: [],
        totalChanges: 0,
        totalCheckpoints: 0,
      });
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
    const themeIds = new Set<number>();

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
          case DB_TABLES.THEMES:
            themeIds.add(id);
            break;
        }
      }
    }

    // Batch fetch all current data from main tables
    const currentData = {
      fields: new Map<
        number,
        { name: string; type: string; objectid: number }
      >(),
      views: new Map<number, { name: string; objectid: number }>(),
      cases: new Map<number, { name: string; hasWorkflow: boolean }>(),
      applications: new Map<number, { name: string }>(),
      themes: new Map<number, { name: string; applicationid: number }>(),
    };

    // Fetch fields data
    if (fieldIds.size > 0) {
      const fieldIdsArray = Array.from(fieldIds);
      const fieldsResult = await pool.query(
        `SELECT id, name, type, objectid FROM "${DB_TABLES.FIELDS}" WHERE id = ANY($1)`,
        [fieldIdsArray],
      );
      for (const row of fieldsResult.rows) {
        currentData.fields.set(row.id, {
          name: row.name,
          type: row.type,
          objectid: row.objectid,
        });
        if (typeof row.objectid === "number") {
          objectids.add(row.objectid);
        }
      }
    }

    // Fetch views data
    if (viewIds.size > 0) {
      const viewIdsArray = Array.from(viewIds);
      const viewsResult = await pool.query(
        `SELECT id, name, objectid FROM "${DB_TABLES.VIEWS}" WHERE id = ANY($1)`,
        [viewIdsArray],
      );
      for (const row of viewsResult.rows) {
        currentData.views.set(row.id, {
          name: row.name,
          objectid: row.objectid,
        });
        if (typeof row.objectid === "number") {
          objectids.add(row.objectid);
        }
      }
    }

    // Fetch cases data
    if (objectids.size > 0) {
      const objectidsArray = Array.from(objectids);
      const casesResult = await pool.query(
        `SELECT id, name, "hasWorkflow" FROM "${DB_TABLES.OBJECTS}" WHERE id = ANY($1)`,
        [objectidsArray],
      );
      for (const row of casesResult.rows) {
        currentData.cases.set(row.id, {
          name: row.name,
          hasWorkflow: !!row.hasWorkflow,
        });
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

    // Fetch themes data
    if (themeIds.size > 0) {
      const themeIdsArray = Array.from(themeIds);
      const themesResult = await pool.query(
        `SELECT id, name, applicationid FROM "${DB_TABLES.THEMES}" WHERE id = ANY($1)`,
        [themeIdsArray],
      );
      for (const row of themesResult.rows) {
        currentData.themes.set(row.id, {
          name: row.name,
          applicationid: row.applicationid,
        });
        if (typeof row.applicationid === "number") {
          applicationIds.add(row.applicationid);
        }
      }
    }

    // Collect all rule changes from all checkpoints
    const allRuleChanges: RuleChange[] = [];
    const seenRules = new Set<string>(); // Track unique rules by table-id combination
    const objectChangeMap = new Map<number, RuleChange[]>();
    const appChanges: RuleChange[] = [];
    const themeChanges: RuleChange[] = [];

    for (const checkpoint of history) {
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
        let category: string | undefined;
        let id: number | undefined;
        let owningObjectId: number | undefined;

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

        // Map table to rule type, category, and get name/type
        switch (table) {
          case DB_TABLES.FIELDS:
            type = "Field";
            category = "data";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
              type = prev?.type || type;
              owningObjectId = prev?.objectid || owningObjectId;
            } else if (id && currentData.fields.has(id)) {
              const fieldData = currentData.fields.get(id)!;
              name = fieldData.name;
              type = fieldData.type || type;
              owningObjectId = fieldData.objectid;
            }
            break;

          case DB_TABLES.VIEWS:
            type = "View";
            category = "ui";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
              owningObjectId = prev?.objectid || owningObjectId;
            } else if (id && currentData.views.has(id)) {
              const viewData = currentData.views.get(id)!;
              name = viewData.name;
              owningObjectId = viewData.objectid;
            }
            break;

          case DB_TABLES.OBJECTS:
            type = "Object";
            category = "workflow";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.cases.has(id)) {
              name = currentData.cases.get(id)!.name;
            }
            owningObjectId = id;
            break;

          case DB_TABLES.APPLICATIONS:
            type = "Application";
            category = "app";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.applications.has(id)) {
              name = currentData.applications.get(id)!.name;
            }
            break;

          case DB_TABLES.THEMES:
            type = "Theme";
            category = "theme";
            if (operation === "Delete") {
              const prev = readPrev();
              name = prev?.name;
            } else if (id && currentData.themes.has(id)) {
              const themeData = currentData.themes.get(id)!;
              name = themeData.name;
              owningObjectId = themeData.applicationid;
            }
            break;
        }

        if (name && type && category && id) {
          // Create a unique key for this rule (table-id combination)
          const uniqueKey = `${table}-${id}`;

          // Only add if we haven't seen this rule before
          if (!seenRules.has(uniqueKey)) {
            seenRules.add(uniqueKey);
            const change: RuleChange = {
              id: `${checkpoint.id}-${table}-${id}`,
              name,
              type,
              category,
              operation,
              checkpointId: checkpoint.id,
              checkpointDescription: checkpoint.description,
              checkpointCreatedAt: checkpoint.created_at.toISOString(),
              checkpointSource: checkpoint.source,
            };
            allRuleChanges.push(change);
            if (category === "app") {
              appChanges.push(change);
            } else if (category === "theme") {
              themeChanges.push(change);
            } else if (typeof owningObjectId === "number") {
              if (!objectChangeMap.has(owningObjectId)) {
                objectChangeMap.set(owningObjectId, []);
              }
              objectChangeMap.get(owningObjectId)!.push(change);
            }
          }
        }
      }
    }

    // Build object groups with nested categories
    const categoryNames: Record<string, string> = {
      workflow: "Workflow",
      ui: "View",
      data: "Field",
      app: "Application",
      theme: "Theme",
    };

    const categoryOrder = ["workflow", "ui", "data", "theme"];

    const objectGroups: ObjectGroup[] = Array.from(
      objectChangeMap.entries(),
    ).map(([objId, changes]) => {
      const perCategory = new Map<string, RuleChange[]>();
      for (const ch of changes) {
        if (!perCategory.has(ch.category)) perCategory.set(ch.category, []);
        perCategory.get(ch.category)!.push(ch);
      }
      const categories: CategoryGroup[] = categoryOrder
        .filter((cat) => perCategory.has(cat))
        .map((cat) => ({
          category: cat,
          categoryName: categoryNames[cat] || cat,
          rules: perCategory
            .get(cat)!
            .sort(
              (a, b) =>
                new Date(b.checkpointCreatedAt).getTime() -
                new Date(a.checkpointCreatedAt).getTime(),
            ),
        }));
      const caseInfo = currentData.cases.get(objId);
      const objectName = caseInfo?.name || `Object ${objId}`;
      return {
        objectId: objId,
        objectName,
        hasWorkflow: !!caseInfo?.hasWorkflow,
        categories,
        totalChanges: changes.length,
      };
    });

    // Sort object groups alphabetically by name
    objectGroups.sort((a, b) => a.objectName.localeCompare(b.objectName));

    // Build application category (if any)
    const applicationCategory: CategoryGroup | null =
      appChanges.length > 0
        ? {
            category: "app",
            categoryName: categoryNames.app,
            rules: appChanges.sort(
              (a, b) =>
                new Date(b.checkpointCreatedAt).getTime() -
                new Date(a.checkpointCreatedAt).getTime(),
            ),
          }
        : null;

    // Build theme category (if any)
    const themeCategory: CategoryGroup | null =
      themeChanges.length > 0
        ? {
            category: "theme",
            categoryName: categoryNames.theme,
            rules: themeChanges.sort(
              (a, b) =>
                new Date(b.checkpointCreatedAt).getTime() -
                new Date(a.checkpointCreatedAt).getTime(),
            ),
          }
        : null;

    return NextResponse.json({
      objectGroups,
      applicationCategory,
      themeCategory,
      totalChanges: allRuleChanges.length,
      totalCheckpoints: history.length,
    });
  } catch (error) {
    console.error("Error fetching rule checkout data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rule checkout data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
