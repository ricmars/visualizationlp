import { createSharedTools } from "../sharedTools";
import { pool } from "../db";
import { LLMTool } from "../toolTypes";
import { waitForPendingPromises, cleanupTimers } from "../testUtils";

// Mock the rule type registry to provide dynamic table names
jest.mock("../../types/ruleTypeRegistry", () => ({
  ruleTypeRegistry: {
    get: jest.fn((id: string) => {
      const mockRuleTypes: Record<string, any> = {
        case: {
          databaseSchema: { tableName: "Cases" },
        },
        application: {
          databaseSchema: { tableName: "Applications" },
        },
        field: {
          databaseSchema: { tableName: "Fields" },
        },
        view: {
          databaseSchema: { tableName: "Views" },
        },
      };
      return mockRuleTypes[id];
    }),
  },
}));

// Mock the database types with dynamic approach
jest.mock("../../types/database", () => ({
  DB_TABLES: {
    get CASES() {
      return "Cases";
    },
    get APPLICATIONS() {
      return "Applications";
    },
    get FIELDS() {
      return "Fields";
    },
    get VIEWS() {
      return "Views";
    },
  },
  getTableName: jest.fn((ruleTypeId: string) => {
    const tableMap: Record<string, string> = {
      case: "Cases",
      field: "Fields",
      view: "Views",
    };
    return tableMap[ruleTypeId] || ruleTypeId;
  }),

  FIELD_TYPES: {
    TEXT: "Text",
    DATE: "Date",
    EMAIL: "Email",
    BOOLEAN: "Checkbox",
  },
}));

// Mock the database pool
jest.mock("../db", () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as unknown as jest.Mock<any, any>;

describe("llmTools", () => {
  let databaseTools: LLMTool[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    databaseTools = createSharedTools(pool) as unknown as LLMTool[];
  });

  afterEach(async () => {
    // Clean up after each test
    await waitForPendingPromises();
    cleanupTimers();
  });

  afterAll(async () => {
    // Final cleanup
    const cleanupFn = (
      global as { cleanupTestEnvironment?: () => Promise<void> }
    ).cleanupTestEnvironment;
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  describe("createObject", () => {
    it("should create a new case successfully", async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "Test Case",
            description: "Test Description",
            model: '{"stages": []}',
            applicationid: 10,
          },
        ],
      };
      mockQuery.mockResolvedValueOnce(mockResult);

      const createObjectTool = databaseTools.find(
        (tool: any) => tool.name === "createObject",
      );
      expect(createObjectTool).toBeDefined();

      const result = await (createObjectTool!.execute as any)({
        name: "Test Case",
        description: "Test Description",
        hasWorkflow: true,
        applicationid: 10,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Cases"'),
        [
          "Test Case",
          "Test Description",
          expect.any(String),
          10,
          true,
          false,
          null,
        ],
      );
      expect(result).toEqual({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: { stages: [] },
      });
    });

    it("should throw error for missing name", async () => {
      const createObjectTool = databaseTools.find(
        (tool: any) => tool.name === "createObject",
      );
      expect(createObjectTool).toBeDefined();

      await expect(
        (createObjectTool!.execute as any)({
          description: "Test Description",
        }),
      ).rejects.toThrow("Object name is required");
    });

    it("should throw error for missing description", async () => {
      const createObjectTool = databaseTools.find(
        (tool: any) => tool.name === "createObject",
      );
      expect(createObjectTool).toBeDefined();

      await expect(
        (createObjectTool!.execute as any)({
          name: "Test Case",
          applicationid: 10,
        }),
      ).rejects.toThrow("Object description is required");
    });
  });

  describe("saveObject", () => {
    it("should update an existing case successfully when id is provided", async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "Updated Case",
            description: "Updated Description",
            model: '{"stages": []}',
            hasWorkflow: false,
          },
        ],
      };
      // Mock the update query (no viewId validation needed since no viewIds in model)
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Updated Case",
        description: "Updated Description",
        model: { stages: [] },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Cases"'),
        expect.arrayContaining([
          "Updated Case",
          "Updated Description",
          1,
          undefined,
        ]),
      );
      const callArgs = mockQuery.mock.calls[0][1]; // Only one call is the UPDATE query (no viewId validation needed)
      expect(JSON.parse(callArgs[2])).toEqual({ stages: [] });
      expect(result).toEqual({
        id: 1,
        name: "Updated Case",
        description: "Updated Description",
        hasWorkflow: false, // This comes from the mock database result
        model: { stages: [] },
      });
    });

    it("should update hasWorkflow parameter when provided", async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "Updated Case",
            description: "Updated Description",
            model: '{"stages": []}',
            hasWorkflow: true,
          },
        ],
      };
      // Mock the viewId validation query (no viewIds to check)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock the update query
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Updated Case",
        description: "Updated Description",
        hasWorkflow: true,
        model: { stages: [] },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Cases"'),
        expect.arrayContaining([
          "Updated Case",
          "Updated Description",
          1,
          true,
        ]),
      );
      const callArgs = mockQuery.mock.calls[0][1];
      expect(JSON.parse(callArgs[2])).toEqual({ stages: [] });
      expect(callArgs[4]).toBe(true); // hasWorkflow parameter
      expect(result).toEqual({
        id: 1,
        name: "Updated Case",
        description: "Updated Description",
        hasWorkflow: true,
        model: { stages: [] },
      });
    });

    it("should throw error when id is missing", async () => {
      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await expect(
        (saveObjectTool!.execute as any)({
          name: "Test Case",
          description: "Test Description",
          model: { stages: [] },
        }),
      ).rejects.toThrow(
        "object ID is required for saveObject - use the ID returned from createObject",
      );
    });

    it("should reject case with fields arrays in steps", async () => {
      // Mock the viewId validation query (no viewIds to check)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await expect(
        (saveObjectTool!.execute as any)({
          id: 1,
          name: "Test Case",
          description: "Test Description",
          model: {
            stages: [
              {
                id: "stage1",
                name: "Stage 1",
                order: 1,
                processes: [
                  {
                    id: "process1",
                    name: "Process 1",
                    order: 1,
                    steps: [
                      {
                        id: "step1",
                        type: "Collect information",
                        name: "Step 1",
                        order: 1,
                        fields: [{ id: 1, required: true }], // ❌ Fields in step
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(
        'Step "Step 1" contains a fields array. Fields should be stored in views, not in steps. Remove the fields array from the step.',
      );
    });

    it("should throw error when model is missing stages", async () => {
      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await expect(
        (saveObjectTool!.execute as any)({
          id: 1,
          name: "Test Case",
          description: "Test Description",
          model: { stages: "not an array" }, // Invalid stages type
        }),
      ).rejects.toThrow("Model stages must be an array");
    });

    it("should throw error when model is null", async () => {
      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await expect(
        (saveObjectTool!.execute as any)({
          id: 1,
          name: "Test Case",
          description: "Test Description",
          model: null,
        }),
      ).rejects.toThrow("Case model is required for saveObject");
    });

    it("should validate collect_information steps have viewId", async () => {
      // Mock the viewId validation query (no viewIds to check)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock the update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Test Case",
            description: "Test Description",
            model: '{"stages": []}',
          },
        ],
      });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      // Spy on console.warn
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: {
          stages: [
            {
              id: "stage1",
              name: "Stage 1",
              order: 1,
              processes: [
                {
                  id: "process1",
                  name: "Process 1",
                  order: 1,
                  steps: [
                    {
                      id: "step1",
                      type: "Collect information",
                      name: "Step 1",
                      order: 1,
                      // Missing viewId - should trigger warning
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Step "Step 1" is a collect_information step but doesn\'t have a viewId. Add a viewId to reference the view containing the fields.',
      );

      consoleSpy.mockRestore();
    });

    it("should validate viewId uniqueness", async () => {
      // Mock the viewId validation query (viewIds exist)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });
      // Mock the update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Test Case",
            description: "Test Description",
            model: '{"stages": []}',
          },
        ],
      });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: {
          stages: [
            {
              id: "stage1",
              name: "Stage 1",
              order: 1,
              processes: [
                {
                  id: "process1",
                  name: "Process 1",
                  order: 1,
                  steps: [
                    {
                      id: "step1",
                      type: "Collect information",
                      name: "Step 1",
                      order: 1,
                      viewId: 1,
                    },
                    {
                      id: "step2",
                      type: "Collect information",
                      name: "Step 2",
                      order: 2,
                      viewId: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      // Should not throw error for unique viewIds
    });

    it("should throw error when viewId does not exist in database", async () => {
      // Mock the viewId validation query (viewId 999 does not exist)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      await expect(
        (saveObjectTool!.execute as any)({
          id: 1,
          name: "Test Case",
          description: "Test Description",
          model: {
            stages: [
              {
                id: "stage1",
                name: "Stage 1",
                order: 1,
                processes: [
                  {
                    id: "process1",
                    name: "Process 1",
                    order: 1,
                    steps: [
                      {
                        id: "step1",
                        type: "Collect information",
                        name: "Step 1",
                        order: 1,
                        viewId: 999, // Non-existent viewId
                      },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      ).rejects.toThrow(
        "The following viewId values do not exist in the database: 999. Make sure to use the actual IDs returned from saveView calls.",
      );
    });

    it("should allow empty processes arrays", async () => {
      // Mock the viewId validation query (no viewIds to check)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock the update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Test Case",
            description: "Test Description",
            model: JSON.stringify({
              stages: [
                {
                  id: "stage1",
                  name: "Stage 1",
                  order: 1,
                  processes: [], // Empty processes array
                },
              ],
            }),
          },
        ],
      });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const inputModel = {
        stages: [
          {
            id: "stage1",
            name: "Stage 1",
            order: 1,
            processes: [], // Empty processes array
          },
        ],
      };

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: inputModel,
      });

      expect(result).toEqual({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: inputModel,
      });
    });

    it("should allow empty models and provide default structure", async () => {
      // Mock the viewId validation query (no viewIds to check)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock the update query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Test Case",
            description: "Test Description",
            model: '{"stages": []}',
          },
        ],
      });

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: { stages: [] },
      });

      expect(result).toEqual({
        id: 1,
        name: "Test Case",
        description: "Test Description",
        model: { stages: [] },
      });
    });

    it("should handle embedded to non-embedded transitions with systemOfRecordId", async () => {
      // Mock update result for non-embedded object with systemOfRecordId
      const mockUpdateResult = {
        rows: [
          {
            id: 1,
            name: "Test Object",
            description: "Test Description",
            model: JSON.stringify({ stages: [] }),
            hasWorkflow: false,
            isEmbedded: false,
            systemOfRecordId: 5,
          },
        ],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValueOnce(mockUpdateResult);

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Object",
        description: "Test Description",
        model: { stages: [] },
        isEmbedded: false,
        systemOfRecordId: 5,
      });

      expect(result).toEqual({
        id: 1,
        name: "Test Object",
        description: "Test Description",
        model: { stages: [] },
        hasWorkflow: false,
        isEmbedded: false,
      });

      // Verify the UPDATE query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Cases"'),
        [
          "Test Object",
          "Test Description",
          '{"stages":[]}',
          1,
          undefined,
          false,
          5,
        ],
      );
    });

    it("should handle non-embedded to embedded transitions", async () => {
      // Mock update result for embedded object
      const mockUpdateResult = {
        rows: [
          {
            id: 1,
            name: "Test Object",
            description: "Test Description",
            model: JSON.stringify({ stages: [] }),
            hasWorkflow: false,
            isEmbedded: true,
            systemOfRecordId: null,
          },
        ],
        rowCount: 1,
      };

      (pool.query as jest.Mock).mockResolvedValueOnce(mockUpdateResult);

      const saveObjectTool = databaseTools.find(
        (tool: any) => tool.name === "saveObject",
      );
      expect(saveObjectTool).toBeDefined();

      const result = await (saveObjectTool!.execute as any)({
        id: 1,
        name: "Test Object",
        description: "Test Description",
        model: { stages: [] },
        isEmbedded: true,
        systemOfRecordId: null,
      });

      expect(result).toEqual({
        id: 1,
        name: "Test Object",
        description: "Test Description",
        model: { stages: [] },
        hasWorkflow: false,
        isEmbedded: true,
      });

      // Verify the UPDATE query was called with correct parameters
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Cases"'),
        [
          "Test Object",
          "Test Description",
          '{"stages":[]}',
          1,
          undefined,
          true,
          null,
        ],
      );
    });
  });

  describe("saveFields", () => {
    it("should create multiple new fields successfully", async () => {
      // Mock insert results
      const mockResult1 = {
        rows: [
          {
            id: 1,
            name: "field1",
            type: "Text",
            objectid: 1,
            primary: false,
            required: false,
            label: "Field 1",
            description: "Test Description 1",
            order: 0,
            options: "[]",
          },
        ],
        rowCount: 1,
      };
      const mockResult2 = {
        rows: [
          {
            id: 2,
            name: "field2",
            type: "Email",
            objectid: 1,
            primary: true,
            required: true,
            label: "Field 2",
            description: "Test Description 2",
            order: 1,
            options: "[]",
          },
        ],
        rowCount: 1,
      };
      // Mock existing field checks and inserts in correct order
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // First field check
      mockQuery.mockResolvedValueOnce(mockResult1); // First field insert
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // Second field check
      mockQuery.mockResolvedValueOnce(mockResult2); // Second field insert

      const saveFieldsTool = databaseTools.find(
        (tool: any) => tool.name === "saveFields",
      );
      expect(saveFieldsTool).toBeDefined();

      const result = await (saveFieldsTool!.execute as any)({
        fields: [
          {
            name: "field1",
            type: "Text",
            objectid: 1,
            label: "Field 1",
            description: "Test Description 1",
            sampleValue: "",
          },
          {
            name: "field2",
            type: "Email",
            objectid: 1,
            label: "Field 2",
            description: "Test Description 2",
            primary: true,
            required: true,
            order: 1,
            sampleValue: "",
          },
        ],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Fields"'),
        [
          "field1",
          "Text",
          1,
          "Field 1",
          "Test Description 1",
          0,
          "[]",
          false,
          false,
          null,
          null,
          null,
        ],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Fields"'),
        [
          "field2",
          "Email",
          1,
          "Field 2",
          "Test Description 2",
          1,
          "[]",
          true,
          true,
          null,
          null,
          null,
        ],
      );
      expect(result).toEqual({
        ids: [1, 2],
        fields: [
          {
            ...mockResult1.rows[0],
            options: [],
            refObjectId: null,
            refMultiplicity: null,
          },
          {
            ...mockResult2.rows[0],
            options: [],
            refObjectId: null,
            refMultiplicity: null,
          },
        ],
      });
    });

    it("should handle mixed create and update operations", async () => {
      // Mock existing field check for first field (exists)
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, name: "existingField" }],
      });
      // Mock full field data query for existing field
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            name: "existingField",
            type: "Text",
            objectid: 1,
            primary: false,
            required: false,
            label: "Existing Field",
            description: "Existing Description",
            order: 0,
            options: "[]",
          },
        ],
      });

      // Mock the UPDATE of the existing field (by name)
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 1,
            name: "existingField",
            type: "Text",
            objectid: 1,
            primary: false,
            required: false,
            label: "Existing Field",
            description: "Existing Description",
            order: 0,
            options: "[]",
            sampleValue: null,
          },
        ],
      });

      // Mock existing field check for second field (doesn't exist)
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      // Mock insert result for new field
      const mockResult = {
        rows: [
          {
            id: 2,
            name: "newField",
            type: "Email",
            objectid: 1,
            primary: false,
            required: false,
            label: "New Field",
            description: "New Description",
            order: 1,
            options: "[]",
          },
        ],
        rowCount: 1,
      };
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveFieldsTool = databaseTools.find(
        (tool: any) => tool.name === "saveFields",
      );
      expect(saveFieldsTool).toBeDefined();

      const result = await (saveFieldsTool!.execute as any)({
        fields: [
          {
            name: "existingField",
            type: "Text",
            objectid: 1,
            label: "Existing Field",
            description: "Existing Description",
            sampleValue: "",
          },
          {
            name: "newField",
            type: "Email",
            objectid: 1,
            label: "New Field",
            description: "New Description",
            order: 1,
            sampleValue: "",
          },
        ],
      });

      expect(result).toEqual({
        ids: [1, 2],
        fields: [
          expect.objectContaining({
            id: 1,
            name: "existingField",
            type: "Text",
            objectid: 1,
            label: "Existing Field",
            description: "Existing Description",
            order: 0,
            options: [],
            required: false,
            primary: false,
          }),
          expect.objectContaining({
            id: 2,
            name: "newField",
            type: "Email",
            objectid: 1,
            label: "New Field",
            description: "New Description",
            order: 1,
            options: [],
            required: false,
            primary: false,
          }),
        ],
      });
    });

    it("should throw error for empty fields array", async () => {
      const saveFieldsTool = databaseTools.find(
        (tool: any) => tool.name === "saveFields",
      );
      expect(saveFieldsTool).toBeDefined();

      await expect(
        (saveFieldsTool!.execute as any)({
          fields: [],
        }),
      ).rejects.toThrow(
        "Fields array is required and must not be empty for saveFields",
      );
    });

    it("should throw error for invalid field type in array", async () => {
      // Mock existing field check (no existing field with same name)
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      // Mock insert result
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "testField",
            type: "InvalidType",
            objectid: 1,
            primary: false,
            required: false,
            label: "Test Field",
            description: "",
            order: 0,
            options: "[]",
          },
        ],
        rowCount: 1,
      };
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveFieldsTool = databaseTools.find(
        (tool: any) => tool.name === "saveFields",
      );
      expect(saveFieldsTool).toBeDefined();

      await expect(
        (saveFieldsTool!.execute as any)({
          fields: [
            {
              name: "testField",
              type: "InvalidType",
              objectid: 1,
              label: "Test Field",
            },
          ],
        }),
      ).rejects.toThrow('Invalid field type "InvalidType"');
    });

    it("should throw error for missing required parameters in array", async () => {
      const saveFieldsTool = databaseTools.find(
        (tool: any) => tool.name === "saveFields",
      );
      expect(saveFieldsTool).toBeDefined();

      await expect(
        (saveFieldsTool!.execute as any)({
          fields: [
            {
              // Missing required parameters
            },
          ],
        }),
      ).rejects.toThrow("Field name is required for saveFields");
    });
  });

  describe("saveView", () => {
    it("should create a new view successfully", async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "Test View",
            objectid: 1,
            model: '{"fields":[]}',
          },
        ],
      };
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveViewTool = databaseTools.find(
        (tool: any) => tool.name === "saveView",
      );
      expect(saveViewTool).toBeDefined();

      const result = await (saveViewTool!.execute as any)({
        name: "Test View",
        objectid: 1,
        model: { fields: [] },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Views"'),
        ["Test View", 1, expect.any(String)],
      );
      expect(result).toEqual({
        id: 1,
        name: "Test View",
        objectid: 1,
        model: { fields: [] },
      });
    });

    it("should update an existing view successfully", async () => {
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "Updated View",
            objectid: 1,
            model: '{"fields":[]}',
          },
        ],
        rowCount: 1,
      };
      mockQuery.mockResolvedValueOnce(mockResult);

      const saveViewTool = databaseTools.find(
        (tool: any) => tool.name === "saveView",
      );
      expect(saveViewTool).toBeDefined();

      const result = await (saveViewTool!.execute as any)({
        id: 1,
        name: "Updated View",
        objectid: 1,
        model: { fields: [] },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Views"'),
        ["Updated View", 1, expect.any(String), 1],
      );
      expect(result).toEqual({
        id: 1,
        name: "Updated View",
        objectid: 1,
        model: { fields: [] },
      });
    });

    it("should throw error for missing required parameters", async () => {
      const saveViewTool = databaseTools.find(
        (tool: any) => tool.name === "saveView",
      );
      expect(saveViewTool).toBeDefined();

      await expect(
        (saveViewTool!.execute as any)({
          // Missing required parameters
        }),
      ).rejects.toThrow("View name is required for saveView");
    });
  });

  describe("deleteObject", () => {
    it("should delete a case successfully", async () => {
      // Mock the three delete operations: fields, views, case
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // delete fields
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // delete views
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // delete case

      const deleteObjectTool = databaseTools.find(
        (tool: any) => tool.name === "deleteObject",
      );
      expect(deleteObjectTool).toBeDefined();

      const result = await (deleteObjectTool!.execute as any)({ id: 1 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "Fields"'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "Views"'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "Cases"'),
        [1],
      );
      expect(result).toEqual({ success: true, deletedId: 1 });
    });

    it("should throw error when case does not exist", async () => {
      // Mock the three delete operations: fields, views, case
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // delete fields
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // delete views
      mockQuery.mockResolvedValueOnce({ rowCount: 0 }); // delete case - no rows affected

      const deleteObjectTool = databaseTools.find(
        (tool: any) => tool.name === "deleteObject",
      );
      expect(deleteObjectTool).toBeDefined();

      await expect(
        (deleteObjectTool!.execute as any)({ id: 999 }),
      ).rejects.toThrow("No object found with id 999");
    });
  });

  describe("deleteField", () => {
    it("should delete a field successfully", async () => {
      // Mock the SELECT query to get field name and objectid
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "Test Field", objectid: 1 }],
        rowCount: 1,
      });
      // Mock the SELECT query to get views that might reference this field
      mockQuery.mockResolvedValueOnce({
        rows: [], // No views reference this field
        rowCount: 0,
      });
      // Mock the DELETE query
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const deleteFieldTool = databaseTools.find(
        (tool: any) => tool.name === "deleteField",
      );
      expect(deleteFieldTool).toBeDefined();

      const result = await (deleteFieldTool!.execute as any)({ id: 1 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT name, objectid as objectid FROM "Fields"',
        ),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, model FROM "Views"'),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "Fields"'),
        [1],
      );
      expect(result).toEqual({
        success: true,
        deletedId: 1,
        deletedName: "Test Field",
        type: "field",
        updatedViewsCount: 0,
      });
    });

    it("should throw error when field does not exist", async () => {
      // Mock the SELECT query to return no rows (field not found)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const deleteFieldTool = databaseTools.find(
        (tool: any) => tool.name === "deleteField",
      );
      expect(deleteFieldTool).toBeDefined();

      await expect(
        (deleteFieldTool!.execute as any)({ id: 999 }),
      ).rejects.toThrow("No field found with id 999");
    });
  });

  describe("deleteView", () => {
    it("should delete a view successfully", async () => {
      // Mock the SELECT query to get view name and objectid
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "Test View", objectid: 10 }],
        rowCount: 1,
      });
      // Mock load case for model cleanup
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            model: JSON.stringify({
              stages: [
                {
                  processes: [
                    {
                      steps: [
                        {
                          id: 1,
                          type: "Collect information",
                          name: "S1",
                          order: 1,
                          viewId: 1,
                        },
                        {
                          id: 2,
                          type: "Collect information",
                          name: "S2",
                          order: 2,
                          viewId: 99,
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          },
        ],
        rowCount: 1,
      });
      // Mock case update after cleanup
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      // Mock the DELETE query for the view itself
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const deleteViewTool = databaseTools.find(
        (tool: any) => tool.name === "deleteView",
      );
      expect(deleteViewTool).toBeDefined();

      const result = await (deleteViewTool!.execute as any)({ id: 1 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT name, objectid as objectid FROM "Views"',
        ),
        [1],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, model FROM "Cases"'),
        [10],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Cases" SET model = $1 WHERE id = $2'),
        [expect.any(String), 10],
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "Views"'),
        [1],
      );
      expect(result).toEqual({
        success: true,
        deletedId: 1,
        deletedName: "Test View",
        type: "view",
        updatedobjectid: 10,
        updatedStepsCount: 1,
      });
    });

    it("should throw error when view does not exist", async () => {
      // Mock the SELECT query to return no rows (view not found)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const deleteViewTool = databaseTools.find(
        (tool: any) => tool.name === "deleteView",
      );
      expect(deleteViewTool).toBeDefined();

      await expect(
        (deleteViewTool!.execute as any)({ id: 999 }),
      ).rejects.toThrow("No view found with id 999");
    });
  });
});
