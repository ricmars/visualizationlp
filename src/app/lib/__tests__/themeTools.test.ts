import { createSharedTools } from "../sharedTools";
import { Pool } from "pg";

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe("Theme Tools", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getListOfThemes", () => {
    it("should return themes for an application", async () => {
      const mockThemes = [
        {
          id: 1,
          name: "Default Theme",
          description: "Default theme",
          isSystemTheme: true,
        },
        {
          id: 2,
          name: "Custom Theme",
          description: "Custom theme",
          isSystemTheme: false,
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: mockThemes,
      });

      const tools = createSharedTools(mockPool);
      const getListOfThemesTool = tools.find(
        (tool) => tool.name === "getListOfThemes",
      );

      expect(getListOfThemesTool).toBeDefined();

      const result = await getListOfThemesTool!.execute({ applicationid: 1 });

      expect(result).toEqual({ themes: mockThemes });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT id, name, description, "isSystemTheme"',
        ),
        [1],
      );
    });
  });

  describe("getTheme", () => {
    it("should return a theme by ID", async () => {
      const mockTheme = {
        id: 1,
        name: "Default Theme",
        description: "Default theme",
        isSystemTheme: true,
        applicationid: 1,
        model: { base: { colors: { primary: "#000000" } } },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [mockTheme],
      });

      const tools = createSharedTools(mockPool);
      const getThemeTool = tools.find((tool) => tool.name === "getTheme");

      expect(getThemeTool).toBeDefined();

      const result = await getThemeTool!.execute({ id: 1 });

      expect(result).toEqual({
        id: 1,
        name: "Default Theme",
        description: "Default theme",
        isSystemTheme: true,
        applicationid: 1,
        model: { base: { colors: { primary: "#000000" } } },
      });
    });

    it("should throw error if theme not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const tools = createSharedTools(mockPool);
      const getThemeTool = tools.find((tool) => tool.name === "getTheme");

      await expect(getThemeTool!.execute({ id: 999 })).rejects.toThrow(
        "No theme found with id 999",
      );
    });
  });

  describe("saveTheme", () => {
    it("should create a new theme", async () => {
      const newTheme = {
        id: 1,
        name: "New Theme",
        description: "A new theme",
        isSystemTheme: false,
        applicationid: 1,
        model: {},
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [newTheme],
      });

      const tools = createSharedTools(mockPool);
      const saveThemeTool = tools.find((tool) => tool.name === "saveTheme");

      expect(saveThemeTool).toBeDefined();

      const result = await saveThemeTool!.execute({
        name: "New Theme",
        description: "A new theme",
        applicationid: 1,
        isSystemTheme: false,
        model: {},
      });

      expect(result).toEqual(newTheme);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "Themes"'),
        ["New Theme", "A new theme", false, 1, "{}"],
      );
    });

    it("should update an existing theme", async () => {
      const updatedTheme = {
        id: 1,
        name: "Updated Theme",
        description: "An updated theme",
        isSystemTheme: false,
        applicationid: 1,
        model: { base: { colors: { primary: "#ff0000" } } },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [updatedTheme],
      });

      const tools = createSharedTools(mockPool);
      const saveThemeTool = tools.find((tool) => tool.name === "saveTheme");

      const result = await saveThemeTool!.execute({
        id: 1,
        name: "Updated Theme",
        description: "An updated theme",
        applicationid: 1,
        isSystemTheme: false,
        model: { base: { colors: { primary: "#ff0000" } } },
      });

      expect(result).toEqual(updatedTheme);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "Themes"'),
        [
          "Updated Theme",
          "An updated theme",
          false,
          '{"base":{"colors":{"primary":"#ff0000"}}}',
          1,
        ],
      );
    });
  });

  describe("deleteTheme", () => {
    it("should delete a non-system theme", async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ isSystemTheme: false, name: "Custom Theme" }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
        });

      const tools = createSharedTools(mockPool);
      const deleteThemeTool = tools.find((tool) => tool.name === "deleteTheme");

      expect(deleteThemeTool).toBeDefined();

      const result = await deleteThemeTool!.execute({ id: 1 });

      expect(result).toEqual({
        success: true,
        deletedId: 1,
        deletedName: "Custom Theme",
      });
    });

    it("should not delete a system theme", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ isSystemTheme: true, name: "Default Theme" }],
      });

      const tools = createSharedTools(mockPool);
      const deleteThemeTool = tools.find((tool) => tool.name === "deleteTheme");

      await expect(deleteThemeTool!.execute({ id: 1 })).rejects.toThrow(
        "Cannot delete system theme",
      );
    });

    it("should throw error if theme not found", async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const tools = createSharedTools(mockPool);
      const deleteThemeTool = tools.find((tool) => tool.name === "deleteTheme");

      await expect(deleteThemeTool!.execute({ id: 999 })).rejects.toThrow(
        "No theme found with id 999",
      );
    });
  });
});
