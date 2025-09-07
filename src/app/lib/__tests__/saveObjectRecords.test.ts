import { createSharedTools } from "../sharedTools";
import { pool } from "../db";

jest.mock("../db", () => ({
  pool: { query: jest.fn() },
}));

jest.mock("../../types/ruleTypeRegistry", () => ({
  ruleTypeRegistry: {
    get: jest.fn((id: string) => {
      const mock: Record<string, any> = {
        object: { databaseSchema: { tableName: "Objects" } },
        objectRecord: { databaseSchema: { tableName: "ObjectRecords" } },
        application: { databaseSchema: { tableName: "Applications" } },
        field: { databaseSchema: { tableName: "Fields" } },
        view: { databaseSchema: { tableName: "Views" } },
        systemOfRecord: { databaseSchema: { tableName: "SystemsOfRecord" } },
      };
      return mock[id];
    }),
  },
}));

const mockQuery = pool.query as unknown as jest.Mock<any, any>;

describe("saveObjectRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  function getTool() {
    const tools = createSharedTools(pool);
    const tool = tools.find((t) => t.name === "saveObjectRecords");
    if (!tool) throw new Error("saveObjectRecords tool not found");
    return tool;
  }

  it("creates multiple records with data", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 102,
            objectid: 14,
            data: { name: "Y" },
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 103,
            objectid: 14,
            data: { name: "Z" },
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ],
        rowCount: 1,
      });

    const tool = getTool();
    const result = await (tool.execute as any)({
      objectid: 14,
      records: [{ data: { name: "Y" } }, { data: { name: "Z" } }],
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "ObjectRecords"'),
      [14, JSON.stringify({ name: "Y" })],
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "ObjectRecords"'),
      [14, JSON.stringify({ name: "Z" })],
    );
    expect(result.ids).toEqual([102, 103]);
  });

  it("updates record when id is provided", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 200,
          objectid: 14,
          data: { name: "ZZ" },
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ],
      rowCount: 1,
    });

    const tool = getTool();
    const result = await (tool.execute as any)({
      objectid: 14,
      records: [{ id: 200, data: { name: "ZZ" } }],
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "ObjectRecords"'),
      [JSON.stringify({ name: "ZZ" }), 200, 14],
    );
    expect(result.ids).toEqual([200]);
  });

  it("throws when records array is missing or empty", async () => {
    const tool = getTool();
    await expect(
      (tool.execute as any)({ objectid: 14, records: [] }),
    ).rejects.toThrow(
      "records array is required and must not be empty for saveObjectRecords",
    );
  });
});
