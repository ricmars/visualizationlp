import { Pool } from "pg";
import { DB_TABLES } from "../types/database";
import { removeViewReferencesFromCaseModel } from "./modelUtils";
import { stepTypes } from "../utils/stepTypes";
import { fieldTypes, FieldType } from "../utils/fieldTypes";
import {
  LLMTool,
  SaveObjectParams,
  SaveFieldsParams,
  SaveViewParams,
  DeleteParams,
  ToolParams,
  ToolResult,
  CreateObjectParams,
} from "./toolTypes";

// Shared tool interface that works for both LLM and MCP
export interface SharedTool<TParams, TResult> {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (params: TParams) => Promise<TResult>;
}

// Convert LLM tools to shared tools with MCP-compatible schemas
export function createSharedTools(pool: Pool): Array<SharedTool<any, any>> {
  const CASES_TABLE =
    (DB_TABLES as any).CASES ?? (DB_TABLES as any).OBJECTS ?? "Objects";
  const OBJECTS_TABLE = (DB_TABLES as any).OBJECTS ?? CASES_TABLE;
  const tools: SharedTool<any, any>[] = [
    {
      name: "saveApplication",
      description:
        "Creates or updates an application (name, description, icon) and links provided object IDs to it. New application flow: 1) Call saveApplication first with name/description (and optional icon) to create the application and get its id. 2) Create one or more workflow objects (createObject with hasWorkflow=true), passing applicationid so they are linked upon creation. 3) Optionally call saveApplication again with objectIds to ensure associations (useful if any object was created without applicationid).",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Application ID (omit for create)",
          },
          name: { type: "string", description: "Application name" },
          description: {
            type: "string",
            description: "Application description",
          },
          icon: { type: "string", description: "Icon (optional)" },
          objectIds: {
            type: "array",
            description:
              "List of object IDs to associate with this application",
            items: { type: "integer" },
          },
        },
        required: ["name", "description"],
      },
      execute: async (params: {
        id?: number;
        name: string;
        description: string;
        icon?: string;
        objectIds?: number[];
      }) => {
        console.log("=== saveApplication EXECUTION STARTED ===");
        console.log(
          "saveApplication parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("saveApplication called at:", new Date().toISOString());

        const { id, name, description, icon, objectIds } = params;

        if (!name) throw new Error("Application name is required");
        if (!description)
          throw new Error("Application description is required");

        let applicationId = id;
        if (applicationId) {
          const updateQuery = `
            UPDATE "${DB_TABLES.APPLICATIONS}"
            SET name = $1, description = $2, icon = $3
            WHERE id = $4
            RETURNING id, name, description, icon
          `;
          const updateRes = await pool.query(updateQuery, [
            name,
            description,
            icon ?? null,
            applicationId,
          ]);
          if (updateRes.rowCount === 0) {
            throw new Error(`No application found with id ${applicationId}`);
          }
        } else {
          const insertQuery = `
            INSERT INTO "${DB_TABLES.APPLICATIONS}" (name, description, icon)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, icon
          `;
          const insertRes = await pool.query(insertQuery, [
            name,
            description,
            icon ?? null,
          ]);
          applicationId = insertRes.rows[0].id;
        }

        if (objectIds && objectIds.length > 0) {
          // Associate the specified workflows to this application
          const linkQuery = `
            UPDATE "${DB_TABLES.OBJECTS}"
            SET applicationid = $1
            WHERE id = ANY($2)
          `;
          await pool.query(linkQuery, [applicationId, objectIds]);
        }

        return {
          id: applicationId,
          name,
          description,
          icon: icon ?? null,
          objectIds: objectIds ?? [],
        };
      },
    },
    {
      name: "getApplication",
      description:
        "Gets application metadata (name, description, icon) and the list of associated objects IDs.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Application ID" },
        },
        required: ["id"],
      },
      execute: async (params: { id: number }) => {
        console.log("=== getApplication EXECUTION STARTED ===");
        console.log(
          "getApplication parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("getApplication called at:", new Date().toISOString());

        const appQuery = `
          SELECT id, name, description, icon
          FROM "${DB_TABLES.APPLICATIONS}"
          WHERE id = $1
        `;
        const appRes = await pool.query(appQuery, [params.id]);
        if (appRes.rowCount === 0) {
          throw new Error(`No application found with id ${params.id}`);
        }
        const app = appRes.rows[0];

        const casesQuery = `
          SELECT id
          FROM "${DB_TABLES.OBJECTS}"
          WHERE applicationid = $1
          ORDER BY name
        `;
        const casesRes = await pool.query(casesQuery, [params.id]);
        const objectIds = casesRes.rows.map((r) => r.id as number);

        return {
          id: app.id,
          name: app.name,
          description: app.description,
          icon: app.icon ?? null,
          objectIds,
        };
      },
    },
    {
      name: "createObject",
      description:
        "Creates a new object. Set hasWorkflow=true to create a workflow-type object; otherwise it will be a data object. Set isEmbedded=true to mark the object as embedded (data will be stored directly rather than referenced). applicationid is optional. Returns the new object ID.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Object name" },
          description: { type: "string", description: "Object description" },
          applicationid: {
            type: "integer",
            description: "Application ID (optional)",
          },
          hasWorkflow: {
            type: "boolean",
            description: "Whether this is a workflow object",
          },
          isEmbedded: {
            type: "boolean",
            description:
              "Whether this object is embedded (data is stored directly rather than referenced)",
          },
          systemOfRecordId: {
            type: "integer",
            description: "Optional system of record ID",
          },
          model: { type: "object", description: "Optional initial model" },
        },
        required: ["name", "description"],
      },
      execute: async (params: CreateObjectParams) => {
        console.log("=== createObject EXECUTION STARTED ===");
        console.log(
          "createObject parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("createObject called at:", new Date().toISOString());

        const {
          name,
          description,
          hasWorkflow = false,
          isEmbedded = false,
          systemOfRecordId,
          model,
        } = params as any;
        const applicationid: number | undefined = (params as any).applicationid;

        if (!name) throw new Error("Object name is required");
        if (!description) throw new Error("Object description is required");

        // Create new object with provided flags
        const query = `
          INSERT INTO "${OBJECTS_TABLE}" (name, description, model, applicationid, "hasWorkflow", "isEmbedded", "systemOfRecordId")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, description, model, applicationid
        `;
        const values = [
          name,
          description,
          model
            ? JSON.stringify(model)
            : hasWorkflow
            ? JSON.stringify({ stages: [] })
            : JSON.stringify({}),
          applicationid ?? null,
          hasWorkflow,
          isEmbedded,
          systemOfRecordId ?? null,
        ];
        console.log("createObject INSERT query:", query);
        console.log("createObject INSERT query values:", values);

        const result = await pool.query(query, values);
        const objectData = result.rows[0] || {};

        console.log("createObject INSERT successful:", {
          id: objectData?.id,
          name: objectData?.name,
        });

        return {
          id: objectData.id,
          name: objectData.name,
          description: objectData.description,
          model:
            typeof objectData.model === "string"
              ? (() => {
                  try {
                    return JSON.parse(objectData.model);
                  } catch {
                    return hasWorkflow ? { stages: [] } : {};
                  }
                })()
              : objectData.model ?? (hasWorkflow ? { stages: [] } : {}),
        };
      },
    },
    {
      name: "saveObject",
      description:
        "Updates an object. For workflow objects, provide the complete workflow model (stages, processes, steps, viewId references). For data objects, model is optional. Set isEmbedded=true to mark the object as embedded (data will be stored directly rather than referenced).",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Object ID (REQUIRED)",
          },
          name: { type: "string", description: "Object name" },
          description: { type: "string", description: "Object description" },
          hasWorkflow: {
            type: "boolean",
            description:
              "Whether this object contains a workflow (optional, defaults to current value)",
          },
          isEmbedded: {
            type: "boolean",
            description:
              "Whether this object is embedded (data is stored directly rather than referenced) (optional, defaults to current value)",
          },
          systemOfRecordId: {
            type: "integer",
            description:
              "Optional system of record ID (optional, defaults to current value)",
          },
          model: {
            type: "object",
            description:
              "Complete workflow model with stages, processes, steps, and viewId references (for workflow objects)",
            properties: {
              stages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", description: "Stage ID" },
                    name: { type: "string", description: "Stage name" },
                    order: { type: "integer", description: "Stage order" },
                    processes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer", description: "Process ID" },
                          name: { type: "string", description: "Process name" },
                          order: {
                            type: "integer",
                            description: "Process order",
                          },
                          steps: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "integer", description: "Step ID" },
                                type: {
                                  type: "string",
                                  enum: [...stepTypes],
                                  description:
                                    "Step type. Must be one of the allowed step types.",
                                },
                                name: {
                                  type: "string",
                                  description: "Step name",
                                },
                                order: {
                                  type: "integer",
                                  description: "Step order",
                                },
                                viewId: {
                                  type: "integer",
                                  description:
                                    "View ID for 'Collect information' steps (optional for other step types)",
                                },
                              },
                              required: ["id", "type", "name", "order"],
                            },
                            description: "Steps array",
                          },
                        },
                        required: ["id", "name", "order", "steps"],
                      },
                      description: "Processes array",
                    },
                  },
                  required: ["id", "name", "order", "processes"],
                },
                description: "Stages array with processes and steps",
              },
            },
            required: ["stages"],
          },
        },
        required: ["id", "name", "description", "model"],
      },
      execute: async (params: SaveObjectParams) => {
        console.log("=== saveObject EXECUTION STARTED ===");
        console.log("saveObject parameters:", JSON.stringify(params, null, 2));
        console.log("saveObject called at:", new Date().toISOString());

        const {
          id,
          name,
          description,
          model,
          hasWorkflow,
          isEmbedded,
          systemOfRecordId,
        } = params;

        // Validation
        if (!id)
          throw new Error(
            "object ID is required for saveObject - use the ID returned from createObject",
          );
        if (!name) throw new Error("Object name is required");
        if (!description) throw new Error("Object description is required");

        if (model === null) {
          throw new Error("Case model is required for saveObject");
        }
        if (model && !Array.isArray((model as any).stages)) {
          throw new Error("Model stages must be an array");
        }

        // Validation: embedded fields arrays in steps are not allowed
        if (model) {
          for (const stage of (model as any).stages) {
            for (const process of stage.processes || []) {
              for (const step of process.steps || []) {
                if (step && (step as any).fields) {
                  throw new Error(
                    `Step "${step.name}" contains a fields array. Fields should be stored in views, not in steps. Remove the fields array from the step.`,
                  );
                }
              }
            }
          }
        }

        // Validate collect_information steps have viewId (warning only)
        if (model) {
          for (const stage of (model as any).stages) {
            for (const process of stage.processes || []) {
              for (const step of process.steps || []) {
                if (step.type === "Collect information" && !step.viewId) {
                  console.warn(
                    `Step "${step.name}" is a collect_information step but doesn't have a viewId. Add a viewId to reference the view containing the fields.`,
                  );
                }
              }
            }
          }
        }

        // Collect viewIds used by steps
        const referencedViewIds = new Set<number>();
        if (model) {
          for (const stage of (model as any).stages) {
            for (const process of stage.processes || []) {
              for (const step of process.steps || []) {
                if (typeof step.viewId === "number") {
                  referencedViewIds.add(step.viewId);
                }
              }
            }
          }
        }

        // Load existing views for this case and error on invalid references
        if (referencedViewIds.size > 0) {
          const checkIds = Array.from(referencedViewIds);
          const viewQuery = `SELECT id FROM "${DB_TABLES.VIEWS}" WHERE id = ANY($1) AND objectid = $2`;
          const viewResult = await pool.query(viewQuery, [checkIds, id]);
          const validViewIdsForCase = new Set<number>(
            viewResult.rows.map((row) => row.id),
          );

          const missing = checkIds.filter(
            (vid) => !validViewIdsForCase.has(vid),
          );
          if (missing.length > 0) {
            throw new Error(
              `The following viewId values do not exist in the database: ${missing.join(
                ", ",
              )}. Make sure to use the actual IDs returned from saveView calls.`,
            );
          }
        }

        // Allow reuse of the same viewId across steps; warn if repeated
        if (model) {
          const seenViewIds = new Set<number>();
          for (const stage of (model as any).stages) {
            for (const process of stage.processes || []) {
              for (const step of process.steps || []) {
                if (typeof step.viewId === "number") {
                  if (seenViewIds.has(step.viewId)) {
                    console.warn(
                      `Duplicate viewId "${step.viewId}" found in steps – proceeding`,
                    );
                  } else {
                    seenViewIds.add(step.viewId);
                  }
                }
              }
            }
          }
        }

        // Auto-assign missing IDs for new stages/processes/steps to reduce friction for the model
        // This allocator only assigns IDs where they are missing or non-integer. It never changes existing numeric IDs.
        let cleanedModel: any = null;
        if (model) {
          cleanedModel = { ...(model as any) };
          try {
            // Determine max IDs present to ensure uniqueness within the case model
            let maxStageId = 0;
            let maxProcessId = 0;
            let maxStepId = 0;
            for (const stage of cleanedModel.stages) {
              if (typeof (stage as any).id === "number") {
                maxStageId = Math.max(maxStageId, (stage as any).id);
              }
              for (const process of stage.processes || []) {
                if (typeof (process as any).id === "number") {
                  maxProcessId = Math.max(maxProcessId, (process as any).id);
                }
                for (const step of process.steps || []) {
                  if (typeof (step as any).id === "number") {
                    maxStepId = Math.max(maxStepId, (step as any).id);
                  }
                }
              }
            }

            for (const stage of cleanedModel.stages) {
              if (typeof (stage as any).id !== "number") {
                (stage as any).id = ++maxStageId;
              }
              for (const process of stage.processes || []) {
                if (typeof (process as any).id !== "number") {
                  (process as any).id = ++maxProcessId;
                }
                for (const step of process.steps || []) {
                  if (typeof (step as any).id !== "number") {
                    (step as any).id = ++maxStepId;
                  }
                }
              }
            }
          } catch (e) {
            console.warn(
              "saveObject: ID auto-assignment failed; proceeding with provided model.",
              e,
            );
          }
        }

        // Update existing case
        const query = `
          UPDATE "${OBJECTS_TABLE}"
          SET name = $1, description = $2, model = COALESCE($3, model), "hasWorkflow" = COALESCE($5, "hasWorkflow"), "isEmbedded" = COALESCE($6, "isEmbedded"), "systemOfRecordId" = COALESCE($7, "systemOfRecordId")
          WHERE id = $4
          RETURNING id, name, description, model, "hasWorkflow", "isEmbedded", "systemOfRecordId"
        `;
        console.log("saveObject UPDATE query:", query);
        const modelJson = cleanedModel ? JSON.stringify(cleanedModel) : null;
        console.log("saveObject UPDATE query values:", [
          name,
          description,
          modelJson,
          id,
          hasWorkflow,
          isEmbedded,
          systemOfRecordId,
        ]);

        const result = await pool.query(query, [
          name,
          description,
          modelJson,
          id,
          hasWorkflow,
          isEmbedded,
          systemOfRecordId,
        ]);
        if (result.rowCount === 0) {
          console.error(`saveObject ERROR: No object found with id ${id}`);
          throw new Error(`No object found with id ${id}`);
        }

        const objectData = result.rows[0] || {};
        console.log("saveObject UPDATE successful:");
        console.log({
          id: objectData?.id,
          name: objectData?.name,
          modelStages: (() => {
            try {
              const m =
                typeof objectData?.model === "string"
                  ? JSON.parse(objectData.model)
                  : objectData?.model;
              return m?.stages?.length || 0;
            } catch {
              return 0;
            }
          })(),
        });

        return {
          id: objectData.id ?? id,
          name: objectData.name ?? name,
          description: objectData.description ?? description,
          hasWorkflow: objectData.hasWorkflow ?? hasWorkflow,
          isEmbedded: objectData.isEmbedded ?? isEmbedded,
          model:
            typeof objectData.model === "string"
              ? (() => {
                  try {
                    return JSON.parse(objectData.model);
                  } catch {
                    return cleanedModel ?? null;
                  }
                })()
              : objectData.model ?? cleanedModel ?? null,
        };
      },
    },
    {
      name: "saveFields",
      description: `Creates or updates one or more fields for a case. Use this tool for ALL field-level changes (sampleValue, primary, required, label, order, options, type). PERFORMANCE: Batch changes in a single call whenever possible (25–50 fields per call is ideal). REQUIRED PER FIELD: name, type, objectid, label, sampleValue. If you only need to toggle boolean flags like primary/required, you STILL MUST provide type, label, and sampleValue for each field (fetch them once via listFields if not in context). NEVER call saveView or saveObject after field-only changes; those are unrelated. Views define layout/membership; saveObject updates workflow structure (stages/processes/steps).
                    Reference fields: To create a reference to another object, set type to one of: 'CaseReferenceSingle' | 'CaseReferenceMulti' | 'DataReferenceSingle' | 'DataReferenceMulti'. Provide 'refObjectId' with the referenced object's ID and 'refMultiplicity' as 'single' or 'multi'.
                    Embedded fields: To embed another object's data directly, set type to one of: 'EmbedDataSingle' | 'EmbedDataMulti'. Provide 'refObjectId' with the embedded object's ID and 'refMultiplicity' as 'single' or 'multi'. Embedded fields store the actual data from the referenced object rather than just a reference. The field type is automatically determined based on whether the referenced object has isEmbedded=true.`,
      parameters: {
        type: "object",
        properties: {
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  description:
                    "Field ID (required for update, omit for create)",
                },
                name: { type: "string", description: "Field name" },
                type: {
                  type: "string",
                  enum: [...fieldTypes],
                  description:
                    "Field type (REQUIRED). Must be one of the allowed field types. Always include this even when only changing primary/required.",
                },
                objectid: {
                  type: "integer",
                  description: "Case ID this field belongs to (REQUIRED)",
                },
                label: {
                  type: "string",
                  description:
                    "Display label for the field (REQUIRED; use existing value if updating)",
                },
                description: {
                  type: "string",
                  description: "Field description",
                },
                order: { type: "integer", description: "Display order" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Array of options (only include when type is 'Dropdown' or 'RadioButtons')",
                },
                refObjectId: {
                  type: "integer",
                  description:
                    "Target object ID when this field is a reference (optional)",
                },
                refMultiplicity: {
                  type: "string",
                  enum: ["single", "multi"],
                  description: "Reference type/multiplicity (optional)",
                },
                required: {
                  type: "boolean",
                  description: "Whether the field is required",
                },
                primary: {
                  type: "boolean",
                  description: "Whether this is a primary field",
                },
                sampleValue: {
                  type: "string",
                  description:
                    "Sample value for live preview (REQUIRED; reuse existing value if updating).",
                },
              },
              required: ["name", "type", "objectid", "label", "sampleValue"],
            },
            description: "Array of fields to create or update",
          },
        },
        required: ["fields"],
      },
      execute: async (params: SaveFieldsParams) => {
        console.log("=== saveFields EXECUTION STARTED ===");
        console.log("saveFields parameters:", JSON.stringify(params, null, 2));
        console.log("saveFields called at:", new Date().toISOString());

        const { fields } = params;

        // Validation
        if (!Array.isArray(fields) || fields.length === 0) {
          throw new Error(
            "Fields array is required and must not be empty for saveFields",
          );
        }

        const results: Array<{
          id: number;
          name: string;
          type: string;
          objectid: number;
          label: string;
          description: string;
          order: number;
          options: unknown;
          required: boolean;
          primary: boolean;
          sampleValue?: unknown;
        }> = [];

        // Process each field
        for (const field of fields) {
          const {
            id,
            name,
            type,
            label,
            description,
            order,
            options,
            required,
            primary,
            sampleValue,
            refObjectId,
            refMultiplicity,
          } = field as any;
          const objectid = (field as any).objectid ?? (field as any).objectid;

          // Validation
          if (!name) throw new Error("Field name is required for saveFields");
          if (!type) throw new Error("Field type is required for saveFields");
          if (!objectid)
            throw new Error("Object ID is required for saveFields");
          if (!label) throw new Error("Field label is required for saveFields");

          // Validate field type first so tests expecting this error pass even if sampleValue is missing
          if (!fieldTypes.includes(type as FieldType)) {
            throw new Error(`Invalid field type "${type}"`);
          }

          if (sampleValue === undefined) {
            throw new Error("sampleValue is required for saveFields");
          }

          // Check for existing field with same name in the same case
          const existingFieldQuery = `SELECT id FROM "${DB_TABLES.FIELDS}" WHERE name = $1 AND objectid = $2`;
          const existingFieldResult = await pool.query(existingFieldQuery, [
            name,
            objectid,
          ]);

          if (
            existingFieldResult.rowCount &&
            existingFieldResult.rowCount > 0
          ) {
            // Update the existing field (matched by name + case) to persist incoming changes like sampleValue
            const existingFieldId = existingFieldResult.rows[0].id;
            const fullFieldQuery = `SELECT * FROM "${DB_TABLES.FIELDS}" WHERE id = $1`;
            const fullFieldResult = await pool.query(fullFieldQuery, [
              existingFieldId,
            ]);
            const existingRow =
              fullFieldResult && fullFieldResult.rows && fullFieldResult.rows[0]
                ? fullFieldResult.rows[0]
                : {};

            const nextLabel = label ?? existingRow.label ?? name;
            const nextDescription =
              description ?? existingRow.description ?? "";
            const nextOrder = order ?? existingRow.order ?? 0;
            const nextRequired =
              required ?? (existingRow.required as boolean) ?? false;
            const nextPrimary =
              primary ?? (existingRow.primary as boolean) ?? false;
            const normalizedOptions = Array.isArray(options)
              ? JSON.stringify(options)
              : options ??
                (typeof existingRow.options === "string"
                  ? existingRow.options
                  : JSON.stringify(existingRow.options ?? []));
            const normalizedSampleValue =
              sampleValue === undefined ||
              sampleValue === null ||
              sampleValue === ""
                ? existingRow.sampleValue ?? null
                : typeof sampleValue === "string"
                ? sampleValue
                : JSON.stringify(sampleValue);

            const updateExistingQuery = `
              UPDATE "${DB_TABLES.FIELDS}"
              SET name = $1, type = $2, objectid = $3, label = $4, description = $5, "order" = $6, options = $7, required = $8, "primary" = $9, "sampleValue" = $10, "refObjectId" = $11, "refMultiplicity" = $12
              WHERE id = $13
              RETURNING id, name, type, objectid as objectid, label, description, "order", options, required, "primary", "sampleValue", "refObjectId", "refMultiplicity"
            `;
            const updateExistingValues = [
              name,
              type,
              objectid,
              nextLabel,
              nextDescription,
              nextOrder,
              normalizedOptions,
              nextRequired,
              nextPrimary,
              normalizedSampleValue,
              typeof refObjectId === "number" ? refObjectId : null,
              typeof refMultiplicity === "string" ? refMultiplicity : null,
              existingFieldId,
            ];
            console.log(
              "saveFields UPDATE (by name) query values:",
              updateExistingValues,
            );
            const updated = await pool.query(
              updateExistingQuery,
              updateExistingValues,
            );
            const fieldData = updated.rows[0] || {};

            {
              const returnedSample = fieldData.sampleValue ?? null;
              const resultItem: any = {
                id: fieldData.id ?? existingFieldId,
                name: fieldData.name ?? name,
                type: fieldData.type ?? type,
                objectid: fieldData.objectid ?? objectid,
                label: fieldData.label ?? nextLabel,
                description: fieldData.description ?? nextDescription,
                order: fieldData.order ?? nextOrder,
                options: fieldData.options
                  ? Array.isArray(fieldData.options)
                    ? fieldData.options
                    : (() => {
                        try {
                          return JSON.parse(fieldData.options);
                        } catch {
                          return [];
                        }
                      })()
                  : (() => {
                      try {
                        return JSON.parse(normalizedOptions);
                      } catch {
                        return [];
                      }
                    })(),
                required: fieldData.required ?? nextRequired,
                primary: fieldData.primary ?? nextPrimary,
              };
              if (returnedSample !== null && returnedSample !== "") {
                resultItem.sampleValue = returnedSample;
              }
              results.push(resultItem);
            }
            continue;
          }

          if (id) {
            // Update existing field
            const query = `
              UPDATE "${DB_TABLES.FIELDS}"
              SET name = $1, type = $2, objectid = $3, label = $4, description = $5, "order" = $6, options = $7, required = $8, "primary" = $9, "sampleValue" = $10, "refObjectId" = $11, "refMultiplicity" = $12
              WHERE id = $13
              RETURNING id, name, type, objectid as objectid, label, description, "order", options, required, "primary", "sampleValue", "refObjectId", "refMultiplicity"
            `;
            console.log("saveFields UPDATE query:", query);
            // Normalize options & sampleValue for DB storage
            const normalizedOptions = Array.isArray(options)
              ? JSON.stringify(options)
              : options ?? "[]";
            const normalizedSampleValue =
              sampleValue === undefined ||
              sampleValue === null ||
              sampleValue === ""
                ? null
                : typeof sampleValue === "string"
                ? sampleValue
                : JSON.stringify(sampleValue);
            console.log("saveFields UPDATE query values:", [
              name,
              type,
              objectid,
              label,
              description ?? "",
              order ?? 0,
              normalizedOptions,
              required ?? false,
              primary ?? false,
              normalizedSampleValue,
              typeof (field as any).refObjectId === "number"
                ? (field as any).refObjectId
                : null,
              typeof (field as any).refMultiplicity === "string"
                ? (field as any).refMultiplicity
                : null,
              id,
            ]);

            const result = await pool.query(query, [
              name,
              type,
              objectid,
              label,
              description ?? "",
              order ?? 0,
              normalizedOptions,
              required ?? false,
              primary ?? false,
              normalizedSampleValue,
              typeof (field as any).refObjectId === "number"
                ? (field as any).refObjectId
                : null,
              typeof (field as any).refMultiplicity === "string"
                ? (field as any).refMultiplicity
                : null,
              id,
            ]);
            if (result.rowCount === 0) {
              console.error(`saveFields ERROR: No field found with id ${id}`);
              throw new Error(`No field found with id ${id}`);
            }

            const fieldData = result.rows[0] || {};
            console.log("saveFields UPDATE successful:", {
              id: fieldData?.id,
              name: fieldData?.name,
              type: fieldData?.type,
              objectid: fieldData?.objectid ?? objectid,
            });

            {
              const returnedSample = fieldData.sampleValue ?? null;
              const resultItem: any = {
                id: fieldData.id ?? id,
                name: fieldData.name ?? name,
                type: fieldData.type ?? type,
                objectid: fieldData.objectid ?? fieldData.objectid ?? objectid,
                label: fieldData.label ?? label,
                description: fieldData.description ?? description ?? "",
                order: fieldData.order ?? order ?? 0,
                options: fieldData.options
                  ? Array.isArray(fieldData.options)
                    ? fieldData.options
                    : (() => {
                        try {
                          return JSON.parse(fieldData.options);
                        } catch {
                          return [];
                        }
                      })()
                  : Array.isArray(options)
                  ? options
                  : [],
                required: fieldData.required ?? required ?? false,
                primary: fieldData.primary ?? primary ?? false,
              };
              if (returnedSample !== null && returnedSample !== "") {
                resultItem.sampleValue = returnedSample;
              }
              results.push(resultItem);
            }
          } else {
            // Create new field
            const query = `
              INSERT INTO "${DB_TABLES.FIELDS}" (name, type, objectid, label, description, "order", options, required, "primary", "sampleValue", "refObjectId", "refMultiplicity")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id, name, type, objectid as objectid, label, description, "order", options, required, "primary", "sampleValue", "refObjectId", "refMultiplicity"
            `;
            console.log("saveFields INSERT query:", query);
            const normalizedOptions = Array.isArray(options)
              ? JSON.stringify(options)
              : options ?? "[]";
            const normalizedSampleValue =
              sampleValue === undefined ||
              sampleValue === null ||
              sampleValue === ""
                ? null
                : typeof sampleValue === "string"
                ? sampleValue
                : JSON.stringify(sampleValue);
            console.log("saveFields INSERT query values:", [
              name,
              type,
              objectid,
              label,
              description ?? "",
              order ?? 0,
              normalizedOptions,
              required ?? false,
              primary ?? false,
              normalizedSampleValue,
              typeof (field as any).refObjectId === "number"
                ? (field as any).refObjectId
                : null,
              typeof (field as any).refMultiplicity === "string"
                ? (field as any).refMultiplicity
                : null,
            ]);

            const result = await pool.query(query, [
              name,
              type,
              objectid,
              label,
              description ?? "",
              order ?? 0,
              normalizedOptions,
              required ?? false,
              primary ?? false,
              normalizedSampleValue,
              typeof (field as any).refObjectId === "number"
                ? (field as any).refObjectId
                : null,
              typeof (field as any).refMultiplicity === "string"
                ? (field as any).refMultiplicity
                : null,
            ]);
            const fieldData = result.rows[0] || {};

            console.log("saveFields INSERT successful:", {
              id: fieldData?.id,
              name: fieldData?.name,
              type: fieldData?.type,
              objectid: fieldData?.objectid ?? objectid,
            });

            {
              const returnedSample = fieldData.sampleValue ?? null;
              const resultItem: any = {
                id: fieldData.id ?? id,
                name: fieldData.name ?? name,
                type: fieldData.type ?? type,
                objectid: fieldData.objectid ?? objectid,
                label: fieldData.label ?? label,
                description: fieldData.description ?? description ?? "",
                order: fieldData.order ?? order ?? 0,
                options: fieldData.options
                  ? Array.isArray(fieldData.options)
                    ? fieldData.options
                    : (() => {
                        try {
                          return JSON.parse(fieldData.options);
                        } catch {
                          return [];
                        }
                      })()
                  : Array.isArray(options)
                  ? options
                  : [],
                required: fieldData.required ?? required ?? false,
                primary: fieldData.primary ?? primary ?? false,
                refObjectId:
                  fieldData.refObjectId ??
                  (typeof (field as any).refObjectId === "number"
                    ? (field as any).refObjectId
                    : null),
                refMultiplicity:
                  fieldData.refMultiplicity ??
                  (typeof (field as any).refMultiplicity === "string"
                    ? (field as any).refMultiplicity
                    : null),
              };
              if (returnedSample !== null && returnedSample !== "") {
                resultItem.sampleValue = returnedSample;
              }
              results.push(resultItem);
            }
          }
        }

        console.log("saveFields completed successfully:", {
          totalFields: results.length,
          fieldIds: results.map((f) => f.id),
        });

        return {
          ids: results.map((f) => f.id),
          fields: results,
        };
      },
    },
    {
      name: "saveView",
      description:
        "Creates or updates a view (layout and which existing fields appear). Use ONLY when you are creating or modifying the composition/layout of a view. Do NOT use for setting field defaults/primary/required—use saveFields for those. Save the returned view ID to reference in the workflow model.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "View ID (required for update, omit for create)",
          },
          name: { type: "string", description: "View name" },
          objectid: {
            type: "integer",
            description: "Case ID this view belongs to",
          },
          model: {
            type: "object",
            description: "View model with fields and layout",
            properties: {
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fieldId: {
                      type: "integer",
                      description: "Field ID reference",
                    },
                    required: {
                      type: "boolean",
                      description: "Whether the field is required in this view",
                    },
                    order: {
                      type: "integer",
                      description: "Display order of the field in this view",
                    },
                  },
                  required: ["fieldId"],
                },
                description: "Array of field references for this view",
              },
              layout: {
                type: "object",
                description: "Layout configuration for the view",
                properties: {
                  type: {
                    type: "string",
                    description:
                      "Layout type (e.g., 'single-column', 'two-column', 'grid')",
                  },
                  columns: {
                    type: "integer",
                    description: "Number of columns for grid layout",
                  },
                },
                required: ["type"],
              },
            },
            required: ["fields", "layout"],
          },
        },
        required: ["name", "objectid", "model"],
      },
      execute: async (params: SaveViewParams) => {
        console.log("=== saveView EXECUTION STARTED ===");
        console.log("saveView parameters:", JSON.stringify(params, null, 2));
        console.log("saveView called at:", new Date().toISOString());

        const { id, name, objectid, model } = params;

        // Validation
        if (!name) throw new Error("View name is required for saveView");
        if (!objectid) throw new Error("Case ID is required for saveView");
        if (!model) throw new Error("View model is required for saveView");

        // Validate and auto-clean referenced fieldIds for this case BEFORE writing
        if (model && Array.isArray(model.fields) && model.fields.length > 0) {
          const fieldIds = model.fields.map((f) => f.fieldId);
          const fieldQuery = `SELECT id, type FROM "${DB_TABLES.FIELDS}" WHERE id = ANY($1) AND objectid = $2`;
          const fieldResult = await pool.query(fieldQuery, [
            fieldIds,
            objectid,
          ]);
          const existingFieldIds = new Set(
            fieldResult.rows.map((row) => row.id),
          );
          const missingFieldIds = fieldIds.filter(
            (fid) => !existingFieldIds.has(fid),
          );
          if (missingFieldIds.length > 0) {
            console.warn(
              `saveView: Removing missing field references from view model for case ${objectid}: ${missingFieldIds.join(
                ", ",
              )}`,
            );
            model.fields = model.fields.filter((f) =>
              existingFieldIds.has(f.fieldId),
            );
          }
          // Validate field types are recognized
          for (const row of fieldResult.rows) {
            if (!fieldTypes.includes(row.type)) {
              throw new Error(
                `Field ID ${row.id} has invalid type: ${row.type}`,
              );
            }
          }
        }

        // Soft check: warn if model.fields is empty; only "Collect information" steps should require fields
        if (
          !model ||
          !Array.isArray(model.fields) ||
          model.fields.length === 0
        ) {
          console.warn(
            "saveView: model.fields is empty; acceptable for non-collect steps. For 'Collect information' steps, ensure fields are added and linked via viewId.",
          );
        }

        if (id) {
          // Update existing view
          const query = `
            UPDATE "${DB_TABLES.VIEWS}"
            SET name = $1, objectid = $2, model = $3
            WHERE id = $4
            RETURNING id, name, objectid as objectid, model
          `;
          console.log("saveView UPDATE query:", query);
          const modelJson = JSON.stringify(model);
          console.log("saveView UPDATE query values:", [
            name,
            objectid,
            modelJson,
            id,
          ]);

          const result = await pool.query(query, [
            name,
            objectid,
            modelJson,
            id,
          ]);
          if (result.rowCount === 0) {
            console.error(`saveView ERROR: No view found with id ${id}`);
            throw new Error(`No view found with id ${id}`);
          }

          const viewData = result.rows[0];
          console.log("saveView UPDATE successful:");
          console.log({
            id: viewData?.id,
            name: viewData?.name,
            objectid: viewData?.objectid ?? objectid,
            modelFields: (() => {
              try {
                const m =
                  typeof viewData?.model === "string"
                    ? JSON.parse(viewData.model)
                    : viewData?.model;
                return m?.fields?.length || 0;
              } catch {
                return 0;
              }
            })(),
          });

          return {
            id: viewData?.id,
            name: viewData?.name,
            objectid: viewData?.objectid ?? objectid,
            model:
              typeof viewData?.model === "string"
                ? JSON.parse(viewData.model)
                : viewData?.model ?? null,
          };
        } else {
          // Create new view
          const query = `
            INSERT INTO "${DB_TABLES.VIEWS}" (name, objectid, model)
            VALUES ($1, $2, $3)
            RETURNING id, name, objectid as objectid, model
          `;
          console.log("saveView INSERT query:", query);
          const modelJson = JSON.stringify(model);
          console.log("saveView INSERT query values:", [
            name,
            objectid,
            modelJson,
          ]);

          const result = await pool.query(query, [name, objectid, modelJson]);
          const viewData = result.rows[0];

          console.log("saveView INSERT successful:");
          console.log({
            id: viewData?.id,
            name: viewData?.name,
            objectid: viewData?.objectid ?? objectid,
            modelFields: (() => {
              try {
                const m =
                  typeof viewData?.model === "string"
                    ? JSON.parse(viewData.model)
                    : viewData?.model;
                return m?.fields?.length || 0;
              } catch {
                return 0;
              }
            })(),
          });

          return {
            id: viewData?.id,
            name: viewData?.name,
            objectid: viewData?.objectid ?? objectid,
            model:
              typeof viewData?.model === "string"
                ? JSON.parse(viewData.model)
                : viewData?.model ?? null,
          };
        }
      },
    },
    {
      name: "deleteObject",
      description:
        "Permanently deletes an object and all its associated fields and views. This action is NOT recoverable. Use ONLY when the user explicitly requests deletion. If there is any ambiguity, ask the user to confirm before proceeding.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Object ID to delete" },
        },
        required: ["id"],
      },
      execute: async (params: DeleteParams) => {
        console.log("=== deleteObject EXECUTION STARTED ===");
        console.log(
          "deleteObject parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("deleteObject called at:", new Date().toISOString());

        const { id } = params;

        // Delete associated fields first
        const deleteFieldsQuery = `DELETE FROM "${DB_TABLES.FIELDS}" WHERE objectid = $1`;
        console.log("deleteObject deleteFields query:", deleteFieldsQuery);
        console.log("deleteObject deleteFields query values:", [id]);
        await pool.query(deleteFieldsQuery, [id]);

        // Delete associated views
        const deleteViewsQuery = `DELETE FROM "${DB_TABLES.VIEWS}" WHERE objectid = $1`;
        console.log("deleteObject deleteViews query:", deleteViewsQuery);
        console.log("deleteObject deleteViews query values:", [id]);
        await pool.query(deleteViewsQuery, [id]);

        // Delete the object
        const deleteObjectQuery = `DELETE FROM "${OBJECTS_TABLE}" WHERE id = $1`;
        console.log("deleteObject query:", deleteObjectQuery);
        console.log("deleteObject query values:", [id]);
        const result = await pool.query(deleteObjectQuery, [id]);

        if (result.rowCount === 0) {
          console.error(`deleteObject ERROR: No object found with id ${id}`);
          throw new Error(`No object found with id ${id}`);
        }

        console.log("deleteObject successful:", { id });
        return { success: true, deletedId: id };
      },
    },

    {
      name: "deleteField",
      description:
        "Permanently deletes a field and removes it from all views where it's used. This action is NOT recoverable. Use ONLY when the user explicitly requests deletion. If not sure, ask the user to confirm before proceeding.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Field ID to delete" },
        },
        required: ["id"],
      },
      execute: async (params: DeleteParams) => {
        console.log("=== deleteField EXECUTION STARTED ===");
        console.log("deleteField parameters:", JSON.stringify(params, null, 2));
        console.log("deleteField called at:", new Date().toISOString());

        const { id } = params;

        // First, get the field name and objectid before deleting
        const getFieldQuery = `SELECT name, objectid as objectid FROM "${DB_TABLES.FIELDS}" WHERE id = $1`;
        const getFieldResult = await pool.query(getFieldQuery, [id]);
        if (getFieldResult.rowCount === 0) {
          console.error(`deleteField ERROR: No field found with id ${id}`);
          throw new Error(`No field found with id ${id}`);
        }
        const fieldName = getFieldResult.rows[0].name;
        const objectid = getFieldResult.rows[0].objectid;

        // Find all views that use this field and remove the field from them
        const getViewsQuery = `SELECT id, name, model FROM "${DB_TABLES.VIEWS}" WHERE objectid = $1`;
        const viewsResult = await pool.query(getViewsQuery, [objectid]);

        let updatedViewsCount = 0;
        for (const view of viewsResult.rows) {
          try {
            const viewModel =
              typeof view.model === "string"
                ? JSON.parse(view.model)
                : view.model;
            if (viewModel.fields && Array.isArray(viewModel.fields)) {
              // Remove the field from the view's fields array
              const originalFieldCount = viewModel.fields.length;
              viewModel.fields = viewModel.fields.filter(
                (fieldRef: { fieldId: number }) => fieldRef.fieldId !== id,
              );

              // Only update if the field was actually removed
              if (viewModel.fields.length < originalFieldCount) {
                const updateViewQuery = `UPDATE "${DB_TABLES.VIEWS}" SET model = $1 WHERE id = $2`;
                await pool.query(updateViewQuery, [
                  JSON.stringify(viewModel),
                  view.id,
                ]);
                updatedViewsCount++;
                console.log(
                  `Removed field ${id} from view ${view.name} (ID: ${view.id})`,
                );
              }
            }
          } catch (error) {
            console.error(`Error processing view ${view.name}:`, error);
          }
        }

        // Now delete the field from the fields table
        const deleteFieldQuery = `DELETE FROM "${DB_TABLES.FIELDS}" WHERE id = $1`;
        console.log("deleteField query:", deleteFieldQuery);
        console.log("deleteField query values:", [id]);

        const result = await pool.query(deleteFieldQuery, [id]);
        if (result.rowCount === 0) {
          console.error(`deleteField ERROR: No field found with id ${id}`);
          throw new Error(`No field found with id ${id}`);
        }

        console.log("deleteField successful:", {
          id,
          name: fieldName,
          updatedViewsCount,
          objectid,
        });
        return {
          success: true,
          deletedId: id,
          deletedName: fieldName,
          type: "field",
          updatedViewsCount,
        };
      },
    },
    {
      name: "deleteView",
      description:
        "Permanently deletes a view and removes any references to it (viewId) from the parent case's workflow model. This action is NOT recoverable. Use ONLY when the user explicitly requests deletion. If there is any ambiguity, ask the user to confirm before proceeding.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "View ID to delete" },
        },
        required: ["id"],
      },
      execute: async (params: DeleteParams) => {
        console.log("=== deleteView EXECUTION STARTED ===");
        console.log("deleteView parameters:", JSON.stringify(params, null, 2));
        console.log("deleteView called at:", new Date().toISOString());

        const { id } = params;

        // First, get the view name and parent case before deleting
        const getViewQuery = `SELECT name, objectid as objectid FROM "${DB_TABLES.VIEWS}" WHERE id = $1`;
        const getViewResult = await pool.query(getViewQuery, [id]);
        if (getViewResult.rowCount === 0) {
          console.error(`deleteView ERROR: No view found with id ${id}`);
          throw new Error(`No view found with id ${id}`);
        }
        const viewName = getViewResult.rows[0].name;
        const parentobjectid = getViewResult.rows[0].objectid as number;

        // Attempt to clear references to this view from the parent case model
        let updatedStepsCount = 0;
        if (parentobjectid) {
          try {
            const getCaseQuery = `SELECT id, model FROM "${OBJECTS_TABLE}" WHERE id = $1`;
            const caseResult = await pool.query(getCaseQuery, [parentobjectid]);
            if ((caseResult.rowCount ?? 0) > 0) {
              const caseRow = caseResult.rows[0];
              let model: any = {};
              try {
                model =
                  typeof caseRow.model === "string"
                    ? JSON.parse(caseRow.model)
                    : caseRow.model || {};
              } catch (e) {
                console.warn(
                  `deleteView: Failed to parse case model for case ${parentobjectid}; proceeding without model cleanup`,
                  e,
                );
                model = {};
              }

              if (model && Array.isArray(model.stages)) {
                const cleanup = removeViewReferencesFromCaseModel(model, id);
                updatedStepsCount = cleanup.updatedStepsCount;
                if (updatedStepsCount > 0) {
                  const updateCaseQuery = `UPDATE "${OBJECTS_TABLE}" SET model = $1 WHERE id = $2`;
                  await pool.query(updateCaseQuery, [
                    JSON.stringify(cleanup.model),
                    parentobjectid,
                  ]);
                }
              }
            }
          } catch (e) {
            console.warn(
              `deleteView: Non-fatal error while updating case model for case ${parentobjectid}:`,
              e,
            );
          }
        }

        const query = `DELETE FROM "${DB_TABLES.VIEWS}" WHERE id = $1`;
        console.log("deleteView query:", query);
        console.log("deleteView query values:", [id]);

        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
          console.error(`deleteView ERROR: No view found with id ${id}`);
          throw new Error(`No view found with id ${id}`);
        }

        console.log("deleteView successful:", { id, name: viewName });
        return {
          success: true,
          deletedId: id,
          deletedName: viewName,
          type: "view",
          updatedobjectid: parentobjectid ?? null,
          updatedStepsCount,
        };
      },
    },
    {
      name: "listFields",
      description: "Lists all fields for a case.",
      parameters: {
        type: "object",
        properties: {
          objectid: {
            type: "integer",
            description: "Case ID to list fields for",
          },
        },
        required: ["objectid"],
      },
      execute: async (params: { objectid: number }) => {
        console.log("=== listFields EXECUTION STARTED ===");
        console.log("listFields parameters:", JSON.stringify(params, null, 2));
        console.log("listFields called at:", new Date().toISOString());

        const query = `
          SELECT id, name, type, objectid, label, description, "order", options, required, "primary", "sampleValue"
          FROM "${DB_TABLES.FIELDS}"
          WHERE objectid = $1
          ORDER BY "order", name
        `;
        console.log("listFields query:", query);
        console.log("listFields query values:", [params.objectid]);

        const result = await pool.query(query, [params.objectid]);
        const fields = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          objectid: row.objectid,
          label: row.label,
          description: row.description,
          order: row.order,
          options: row.options,
          required: row.required,
          primary: row.primary,
          sampleValue: row.sampleValue ?? null,
        }));

        console.log("listFields successful:", {
          objectid: params.objectid,
          fieldCount: fields.length,
        });

        return { fields };
      },
    },
    {
      name: "listViews",
      description: "Lists all views for a specific case.",
      parameters: {
        type: "object",
        properties: {
          objectid: {
            type: "integer",
            description: "Case ID to list views for",
          },
        },
        required: ["objectid"],
      },
      execute: async (params: { objectid: number }) => {
        console.log("=== listViews EXECUTION STARTED ===");
        console.log("listViews parameters:", JSON.stringify(params, null, 2));
        console.log("listViews called at:", new Date().toISOString());

        const query = `
          SELECT id, name, objectid, model
          FROM "${DB_TABLES.VIEWS}"
          WHERE objectid = $1
          ORDER BY name
        `;
        console.log("listViews query:", query);
        console.log("listViews query values:", [params.objectid]);

        const result = await pool.query(query, [params.objectid]);
        const views = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          objectid: row.objectid,
          model:
            typeof row.model === "string" ? JSON.parse(row.model) : row.model,
        }));

        console.log("listViews successful:", {
          objectid: params.objectid,
          viewCount: views.length,
        });

        return { views };
      },
    },
    {
      name: "getObject",
      description:
        "Gets object details including model. For workflow objects, the model contains stages/processes/steps.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer", description: "Object ID" },
        },
        required: ["id"],
      },
      execute: async (params: { id: number }) => {
        console.log("=== getObject EXECUTION STARTED ===");
        console.log("getObject parameters:", JSON.stringify(params, null, 2));
        console.log("getObject called at:", new Date().toISOString());

        const query = `
          SELECT id, name, description, model
          FROM "${OBJECTS_TABLE}"
          WHERE id = $1
        `;
        console.log("getObject query:", query);
        console.log("getObject query values:", [params.id]);

        const result = await pool.query(query, [params.id]);
        if (result.rowCount === 0) {
          console.error(
            `getObject ERROR: No object found with id ${params.id}`,
          );
          throw new Error(`No object found with id ${params.id}`);
        }
        const caseData = result.rows[0];
        const model =
          typeof caseData.model === "string"
            ? JSON.parse(caseData.model)
            : caseData.model;

        console.log("getObject successful:", {
          id: caseData.id,
          name: caseData.name,
          modelStages: model.stages?.length || 0,
        });

        // Extract step names for easier reference
        const steps: Array<{
          id: number;
          name: string;
          type: string;
          stage: string;
          process: string;
        }> = [];
        for (const stage of model.stages || []) {
          for (const process of stage.processes || []) {
            for (const step of process.steps || []) {
              steps.push({
                id: step.id,
                name: step.name,
                type: step.type,
                stage: stage.name,
                process: process.name,
              });
            }
          }
        }

        return {
          id: caseData.id,
          name: caseData.name,
          description: caseData.description,
          model,
          steps,
        };
      },
    },
    {
      name: "listObjects",
      description:
        "Lists objects with optional filters (hasWorkflow, applicationid).",
      parameters: {
        type: "object",
        properties: {
          applicationid: { type: "integer" },
          hasWorkflow: { type: "boolean" },
        },
        required: [],
      },
      execute: async (params: {
        applicationid?: number;
        hasWorkflow?: boolean;
      }) => {
        console.log("=== listObjects EXECUTION STARTED ===");
        console.log("listObjects called at:", new Date().toISOString());

        const filters: string[] = [];
        const values: any[] = [];
        if (typeof params?.applicationid === "number") {
          values.push(params.applicationid);
          filters.push(`applicationid = $${values.length}`);
        }
        if (typeof params?.hasWorkflow === "boolean") {
          values.push(params.hasWorkflow);
          filters.push(`"hasWorkflow" = $${values.length}`);
        }
        const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
        const query = `
          SELECT id, name, description, "hasWorkflow"
          FROM "${OBJECTS_TABLE}"
          ${where}
          ORDER BY name
        `;
        console.log("listObjects query:", query, values);

        const result = await pool.query(query, values);
        const objects = result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          hasWorkflow: row.hasWorkflow,
        }));

        console.log("listObjects successful:", { count: objects.length });

        return { objects };
      },
    },
    // Systems of Record tools
    {
      name: "saveSystemOfRecord",
      description:
        "Creates or updates a System of Record (name, icon). Names are unique.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "System Of Record ID (omit for create)",
          },
          name: { type: "string", description: "System of record name" },
          icon: { type: "string", description: "Icon name or URL (optional)" },
        },
        required: ["name"],
      },
      execute: async (params: { id?: number; name: string; icon?: string }) => {
        const { id, name, icon } = params;
        if (!name) throw new Error("System of record name is required");

        if (id) {
          const updateQuery = `
            UPDATE "${DB_TABLES.SYSTEMS_OF_RECORD}"
            SET name = $1, icon = $2
            WHERE id = $3
            RETURNING id, name, icon
          `;
          const res = await pool.query(updateQuery, [name, icon ?? null, id]);
          if (res.rowCount === 0)
            throw new Error(`No system of record found with id ${id}`);
          return res.rows[0];
        }

        const insertQuery = `
          INSERT INTO "${DB_TABLES.SYSTEMS_OF_RECORD}" (name, icon)
          VALUES ($1, $2)
          RETURNING id, name, icon
        `;
        const res = await pool.query(insertQuery, [name, icon ?? null]);
        return res.rows[0];
      },
    },
    {
      name: "listSystemsOfRecord",
      description: "Lists all systems of record.",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => {
        const query = `SELECT id, name, icon FROM "${DB_TABLES.SYSTEMS_OF_RECORD}" ORDER BY name`;
        const res = await pool.query(query);
        return { systems: res.rows };
      },
    },
    {
      name: "deleteSystemOfRecord",
      description:
        "Deletes a system of record if not referenced by data objects.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
      },
      execute: async (params: { id: number }) => {
        // Enforce referential integrity at application level too
        const refCheck = await pool.query(
          `SELECT 1 FROM "${OBJECTS_TABLE}" WHERE "systemOfRecordId" = $1 LIMIT 1`,
          [params.id],
        );
        if ((refCheck.rowCount ?? 0) > 0) {
          throw new Error(
            "Cannot delete: System of record is referenced by data objects",
          );
        }
        const res = await pool.query(
          `DELETE FROM "${DB_TABLES.SYSTEMS_OF_RECORD}" WHERE id = $1`,
          [params.id],
        );
        if (res.rowCount === 0)
          throw new Error(`No system of record found with id ${params.id}`);
        return { success: true, deletedId: params.id };
      },
    },
    {
      name: "saveObjectRecord",
      description:
        "Creates or updates a record for a data object. Set values as {key:value} using the 'data' property",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Record ID (omit for create)",
          },
          objectid: {
            type: "integer",
            description: "ID of the data object this record belongs to",
          },
          data: {
            type: "object",
            description: "List of values to update stored as key-value object",
          },
        },
        required: ["objectid", "data"],
      },
      execute: async (params: {
        id?: number;
        objectid: number;
        data: Record<string, unknown>;
      }) => {
        console.log("=== saveObjectRecord EXECUTION STARTED ===");
        console.log(
          "saveObjectRecord parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("saveObjectRecord called at:", new Date().toISOString());

        const { id, objectid, data } = params;

        if (!objectid) throw new Error("Object ID is required");
        if (!data || typeof data !== "object") {
          throw new Error(
            "Values must be passed using the 'data' property as key-value object.",
          );
        }

        let recordId = id;
        if (recordId) {
          // Update existing record
          const updateQuery = `
            UPDATE "${DB_TABLES.OBJECT_RECORDS}"
            SET data = $1, updated_at = NOW()
            WHERE id = $2 AND objectid = $3
            RETURNING id, objectid, data, created_at, updated_at
          `;
          const result = await pool.query(updateQuery, [
            JSON.stringify(data),
            recordId,
            objectid,
          ]);
          if (result.rowCount === 0) {
            throw new Error(
              `No record found with id ${recordId} for object ${objectid}`,
            );
          }
          console.log("saveObjectRecord UPDATE successful:", result.rows[0]);
          return result.rows[0];
        } else {
          // Create new record
          const insertQuery = `
            INSERT INTO "${DB_TABLES.OBJECT_RECORDS}" (objectid, data)
            VALUES ($1, $2)
            RETURNING id, objectid, data, created_at, updated_at
          `;
          const result = await pool.query(insertQuery, [
            objectid,
            JSON.stringify(data),
          ]);
          console.log("saveObjectRecord INSERT successful:", result.rows[0]);
          return result.rows[0];
        }
      },
    },
    {
      name: "listObjectRecords",
      description:
        "Lists all records for a specific data object. Returns record IDs and data for bulk operations like update or deletion.",
      parameters: {
        type: "object",
        properties: {
          objectid: {
            type: "integer",
            description: "Object ID to list records for",
          },
        },
        required: ["objectid"],
      },
      execute: async (params: { objectid: number }) => {
        console.log("=== listObjectRecords EXECUTION STARTED ===");
        console.log(
          "listObjectRecords parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("listObjectRecords called at:", new Date().toISOString());

        const { objectid } = params;

        if (!objectid) throw new Error("Object ID is required");

        const query = `SELECT id, data FROM "${DB_TABLES.OBJECT_RECORDS}" WHERE objectid = $1 ORDER BY id`;
        console.log("listObjectRecords query:", query);
        console.log("listObjectRecords query values:", [objectid]);
        const result = await pool.query(query, [objectid]);

        const records = result.rows.map((row) => ({
          id: row.id,
          data: row.data,
        }));

        console.log("listObjectRecords successful:", {
          objectid,
          recordCount: records.length,
        });

        return { records, count: records.length };
      },
    },
    {
      name: "deleteObjectRecord",
      description:
        "Permanently deletes a record from a data object. This action is NOT recoverable.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Record ID to delete",
          },
        },
        required: ["id"],
      },
      execute: async (params: { id: number }) => {
        console.log("=== deleteObjectRecord EXECUTION STARTED ===");
        console.log(
          "deleteObjectRecord parameters:",
          JSON.stringify(params, null, 2),
        );
        console.log("deleteObjectRecord called at:", new Date().toISOString());

        const { id } = params;

        if (!id) throw new Error("Record ID is required");

        const deleteQuery = `DELETE FROM "${DB_TABLES.OBJECT_RECORDS}" WHERE id = $1`;
        console.log("deleteObjectRecord query:", deleteQuery);
        console.log("deleteObjectRecord query values:", [id]);
        const result = await pool.query(deleteQuery, [id]);

        if (result.rowCount === 0) {
          console.error(
            `deleteObjectRecord ERROR: No record found with id ${id}`,
          );
          throw new Error(`No record found with id ${id}`);
        }

        console.log("deleteObjectRecord successful:", { id });
        return { success: true, deletedId: id };
      },
    },
    // Data Object tools removed; use Objects with hasWorkflow=false and Fields referencing objectid
  ];

  return tools;
}

// Convert shared tools back to LLM tools for backward compatibility
export function convertToLLMTools(
  sharedTools: ReturnType<typeof createSharedTools>,
): LLMTool[] {
  return sharedTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    execute: tool.execute as unknown as (
      params: ToolParams,
    ) => Promise<ToolResult>,
  }));
}
