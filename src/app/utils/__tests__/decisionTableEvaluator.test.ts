import { evaluateDecisionTable } from "../decisionTableEvaluator";
import { DecisionTable } from "../../types/types";

describe("DecisionTableEvaluator", () => {
  describe("Basic comparisons", () => {
    it("should return correct value for exact match with equals operator", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Priority Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "pyID",
            dataType: "Integer",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "High Priority",
            pyID: 10,
          },
          {
            id: "2",
            return: "Low Priority",
            pyID: 5,
          },
        ],
      };

      const fieldValues = { pyID: 10 };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("High Priority");
    });

    it("should return correct value for not equal comparison", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Status Decision Table",
        fieldDefs: [
          {
            comparatorType: "!=",
            columnId: "status",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Active",
            status: "inactive",
          },
          {
            id: "2",
            return: "Inactive",
            status: "active",
          },
        ],
      };

      const fieldValues = { status: "active" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Active");
    });

    it("should return correct value for greater than comparison", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Score Decision Table",
        fieldDefs: [
          {
            comparatorType: ">",
            columnId: "score",
            dataType: "Decimal",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Excellent",
            score: 90,
          },
          {
            id: "2",
            return: "Good",
            score: 70,
          },
          {
            id: "3",
            return: "Average",
            score: 50,
          },
        ],
      };

      const fieldValues = { score: 85 };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Good");
    });

    it("should return correct value for less than comparison", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Age Decision Table",
        fieldDefs: [
          {
            comparatorType: "<",
            columnId: "age",
            dataType: "Integer",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Minor",
            age: 18,
          },
          {
            id: "2",
            return: "Adult",
            age: 65,
          },
        ],
      };

      const fieldValues = { age: 16 };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Minor");
    });

    it("should return correct value for greater than or equal comparison", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Temperature Decision Table",
        fieldDefs: [
          {
            comparatorType: ">=",
            columnId: "temperature",
            dataType: "Decimal",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Hot",
            temperature: 30,
          },
          {
            id: "2",
            return: "Warm",
            temperature: 20,
          },
        ],
      };

      const fieldValues = { temperature: 30 };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Hot");
    });

    it("should return correct value for less than or equal comparison", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Price Decision Table",
        fieldDefs: [
          {
            comparatorType: "<=",
            columnId: "price",
            dataType: "Decimal",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Affordable",
            price: 50,
          },
          {
            id: "2",
            return: "Expensive",
            price: 100,
          },
        ],
      };

      const fieldValues = { price: 45 };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Affordable");
    });
  });

  describe("Range comparisons", () => {
    it("should return correct value for between range (exclusive)", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Date Range Decision Table",
        fieldDefs: [
          {
            comparatorType: "> and <",
            columnId: "pxCreateDateTime",
            dataType: "DateTime",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Recent",
            pxCreateDateTime: {
              from: "2022-03-24T03:33:18.417Z",
              to: "2022-03-25T12:30:18.417Z",
            },
          },
          {
            id: "2",
            return: "Older",
            pxCreateDateTime: {
              from: "2022-03-20T00:00:00.000Z",
              to: "2022-03-24T00:00:00.000Z",
            },
          },
        ],
      };

      const fieldValues = {
        pxCreateDateTime: new Date("2022-03-24T10:00:00.000Z"),
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Recent");
    });

    it("should return correct value for inclusive range", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Inclusive Range Decision Table",
        fieldDefs: [
          {
            comparatorType: ">= and <=",
            columnId: "pxCreateDateTime",
            dataType: "DateTime",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Current Period",
            pxCreateDateTime: {
              from: "2022-03-24T00:00:00.000Z",
              to: "2022-03-25T23:59:59.999Z",
            },
          },
        ],
      };

      const fieldValues = {
        pxCreateDateTime: new Date("2022-03-24T00:00:00.000Z"),
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Current Period");
    });

    it("should return correct value for custom range 1 (exclusive start, inclusive end)", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Custom Range 1 Decision Table",
        fieldDefs: [
          {
            comparatorType: "> and <=",
            columnId: "pxCreateDateTime",
            dataType: "DateTime",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "In Range",
            pxCreateDateTime: {
              from: "2022-03-24T00:00:00.000Z",
              to: "2022-03-25T23:59:59.999Z",
            },
          },
        ],
      };

      const fieldValues = {
        pxCreateDateTime: new Date("2022-03-25T23:59:59.999Z"),
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("In Range");
    });

    it("should return correct value for custom range 2 (inclusive start, exclusive end)", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Custom Range 2 Decision Table",
        fieldDefs: [
          {
            comparatorType: ">= and <",
            columnId: "pxCreateDateTime",
            dataType: "DateTime",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "In Range",
            pxCreateDateTime: {
              from: "2022-03-24T00:00:00.000Z",
              to: "2022-03-25T23:59:59.999Z",
            },
          },
        ],
      };

      const fieldValues = {
        pxCreateDateTime: new Date("2022-03-24T00:00:00.000Z"),
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("In Range");
    });
  });

  describe("Multiple field conditions (AND logic)", () => {
    it("should return correct value when all conditions match", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Multi-Condition Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "pyID",
            dataType: "Integer",
          },
          {
            comparatorType: "!=",
            columnId: "pxActiveChannel",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Match Found",
            pyID: 10,
            pxActiveChannel: "30",
          },
          {
            id: "2",
            return: "No Match",
            pyID: 5,
            pxActiveChannel: "30",
          },
        ],
      };

      const fieldValues = {
        pyID: 10,
        pxActiveChannel: "20",
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Match Found");
    });

    it("should return empty string when not all conditions match", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Multi-Condition Decision Table 2",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "pyID",
            dataType: "Integer",
          },
          {
            comparatorType: "!=",
            columnId: "pxActiveChannel",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Match Found",
            pyID: 10,
            pxActiveChannel: "30",
          },
        ],
      };

      const fieldValues = {
        pyID: 10,
        pxActiveChannel: "30", // This should not match the != condition
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("");
    });
  });

  describe("Otherwise condition (last row without field conditions)", () => {
    it("should return otherwise value when no conditions match", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Otherwise Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "status",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Active",
            status: "active",
          },
          {
            id: "2",
            return: "Default Status",
            // No field conditions - this is the "otherwise" condition
          },
        ],
      };

      const fieldValues = { status: "unknown" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Default Status");
    });

    it("should return otherwise value when no field definitions exist", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "No Field Definitions Decision Table",
        fieldDefs: [],
        rowData: [
          {
            id: "1",
            return: "Default Status",
            // No field definitions - this is the "otherwise" condition
          },
        ],
      };

      const fieldValues = { status: "unknown" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Default Status");
    });
  });

  describe("Boolean field types", () => {
    it("should handle boolean comparisons correctly", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Boolean Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "isActive",
            dataType: "Checkbox",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Active User",
            isActive: "true",
          },
          {
            id: "2",
            return: "Inactive User",
            isActive: "false",
          },
        ],
      };

      const fieldValues = { isActive: "true" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("Active User");
    });
  });

  describe("Edge cases", () => {
    it("should return empty string when no rows match", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "No Match Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "status",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Active",
            status: "active",
          },
        ],
      };

      const fieldValues = { status: "inactive" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("");
    });

    it("should handle missing field values", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Missing Field Decision Table",
        fieldDefs: [
          {
            comparatorType: "=",
            columnId: "status",
            dataType: "Text",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "Active",
            status: "active",
          },
        ],
      };

      const fieldValues = {}; // No status field provided
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("");
    });

    it("should handle empty decision table", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Empty Decision Table",
        fieldDefs: [],
        rowData: [],
      };

      const fieldValues = { status: "active" };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("");
    });
  });

  describe("Complex scenarios", () => {
    it("should handle multiple field types with different comparators", () => {
      const decisionTable: DecisionTable = {
        id: 1,
        name: "Complex Decision Table",
        fieldDefs: [
          {
            comparatorType: ">=",
            columnId: "age",
            dataType: "Integer",
          },
          {
            comparatorType: "=",
            columnId: "isVip",
            dataType: "Checkbox",
          },
          {
            comparatorType: "> and <",
            columnId: "pxCreateDateTime",
            dataType: "DateTime",
          },
        ],
        rowData: [
          {
            id: "1",
            return: "VIP Customer",
            age: 18,
            isVip: "true",
            pxCreateDateTime: {
              from: "2022-01-01T00:00:00.000Z",
              to: "2022-12-31T23:59:59.999Z",
            },
          },
          {
            id: "2",
            return: "Regular Customer",
            age: 18,
            isVip: "false",
            pxCreateDateTime: {
              from: "2022-01-01T00:00:00.000Z",
              to: "2022-12-31T23:59:59.999Z",
            },
          },
          {
            id: "3",
            return: "Default Customer",
          },
        ],
      };

      const fieldValues = {
        age: 25,
        isVip: "true",
        pxCreateDateTime: new Date("2022-06-15T12:00:00.000Z"),
      };
      const result = evaluateDecisionTable(decisionTable, fieldValues);
      expect(result).toBe("VIP Customer");
    });
  });
});
