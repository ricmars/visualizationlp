/**
 * Rule Type Definitions using the new Interface Template System
 *
 * This system eliminates duplication by:
 * 1. Using TypeScript interface templates instead of string-based interfaces
 * 2. Generating validation logic from the interface template
 * 3. Providing compile-time type safety
 * 4. Single source of truth for type definitions
 *
 * Benefits:
 * - No more string-based interfaces that could have syntax errors
 * - No duplication between validation schemas and type definitions
 * - Compile-time validation of interface structure
 * - Automatic code generation from structured data
 */

import { ruleTypeRegistry, RuleTypeDefinition } from "./ruleTypeRegistry";

// Case Rule Type Definition
export const caseRuleType: RuleTypeDefinition = {
  id: "case",
  name: "Case",
  description: "A workflow case that represents a business process or workflow",
  category: "workflow",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Case",
    description:
      "A workflow case that represents a business process or workflow",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "string",
        description: "Case name",
      },
      {
        name: "description",
        type: "string",
        description: "Case description",
      },
      {
        name: "model",
        type: "ViewModel",
        description: "JSON model containing the workflow structure",
      },
    ],
  },

  databaseSchema: {
    tableName: "Cases",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "applicationid",
        type: "INTEGER",
        nullable: true,
        description: "Reference to parent application",
      },
      {
        name: "name",
        type: "TEXT",
        nullable: false,
        description: "Case name",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: false,
        description: "Case description",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: true,
        description: "JSON workflow model",
      },
    ],
    foreignKeys: [
      {
        name: "cases_applicationid_fkey",
        columns: ["applicationid"],
        referenceTable: "Applications",
        referenceColumns: ["id"],
        onDelete: "SET NULL",
      },
    ],
    indexes: [
      {
        name: "cases_name_idx",
        columns: ["name"],
      },
      {
        name: "cases_applicationid_idx",
        columns: ["applicationid"],
      },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      // Normalize model to an object for JSONB storage
      if (data.model === undefined || data.model === null) {
        data.model = { stages: [] };
        return data;
      }

      if (typeof data.model === "string") {
        try {
          data.model = JSON.parse(data.model);
        } catch {
          throw new Error("Invalid JSON in model field");
        }
      }

      return data;
    },

    beforeUpdate: async (data) => {
      // Normalize model for updates as well
      if (data.model === undefined || data.model === null) {
        return data;
      }
      if (typeof data.model === "string") {
        try {
          data.model = JSON.parse(data.model);
        } catch {
          throw new Error("Invalid JSON in model field");
        }
      }
      return data;
    },

    afterCreate: async (data, id) => {
      console.log(`Created case ${id}: ${data.name}`);
    },
  },
};

// Application Rule Type Definition
export const applicationRuleType: RuleTypeDefinition = {
  id: "application",
  name: "Application",
  description:
    "An application that groups multiple workflows (cases). Includes name, description, and icon.",
  category: "app",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Application",
    description: "An application that groups multiple workflows (cases).",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      { name: "name", type: "string", description: "Application name" },
      {
        name: "description",
        type: "string",
        description: "Application description",
      },
      { name: "icon", type: "string", optional: true, description: "Icon" },
    ],
  },

  databaseSchema: {
    tableName: "Applications",
    columns: [
      { name: "id", type: "INTEGER", primaryKey: true, nullable: false },
      { name: "name", type: "TEXT", nullable: false },
      { name: "description", type: "TEXT", nullable: false },
      { name: "icon", type: "TEXT", nullable: true },
    ],
    indexes: [{ name: "applications_name_idx", columns: ["name"] }],
  },
};

// Field Rule Type Definition
export const fieldRuleType: RuleTypeDefinition = {
  id: "field",
  name: "Field",
  description:
    "A field within a case or data object that can be collected and displayed",
  category: "data",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Field",
    description:
      "A field within a case or data object that can be collected and displayed",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "string",
        description: "Field name",
      },
      {
        name: "caseid",
        type: "number",
        optional: true,
        description:
          "Reference to parent case (required if dataObjectId is not set)",
      },
      {
        name: "dataObjectId",
        type: "number",
        optional: true,
        description:
          "Reference to parent data object (required if caseid is not set)",
      },
      {
        name: "type",
        type: "FieldType",
        description: "Field type",
      },
      {
        name: "primary",
        type: "boolean",
        optional: true,
        description: "Whether this is a primary field",
      },
      {
        name: "label",
        type: "string",
        description: "Display label",
      },
      {
        name: "description",
        type: "string",
        description: "Field description",
      },
      {
        name: "order",
        type: "number",
        description: "Display order",
      },
      {
        name: "options",
        type: "string[]",
        description: "Available options for selection fields",
      },
      {
        name: "required",
        type: "boolean",
        description: "Whether field is required",
      },
      {
        name: "sampleValue",
        type: "unknown",
        optional: true,
        description: "Sample value for previews",
      },
    ],
  },

  databaseSchema: {
    tableName: "Fields",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "type",
        type: "TEXT",
        nullable: false,
        description: "Field type",
      },
      {
        name: "name",
        type: "TEXT",
        nullable: false,
        description: "Field name",
      },
      {
        name: "primary",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description: "Whether this is a primary field",
      },
      {
        name: "caseid",
        type: "INTEGER",
        nullable: true,
        description:
          "Reference to parent case (nullable when dataObjectId is set)",
      },
      {
        name: "dataObjectId",
        type: "INTEGER",
        nullable: true,
        description:
          "Reference to parent data object (nullable when caseid is set)",
      },
      {
        name: "label",
        type: "TEXT",
        nullable: false,
        description: "Display label",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: false,
        defaultValue: "",
        description: "Field description",
      },
      {
        name: "order",
        type: "INTEGER",
        nullable: false,
        defaultValue: 0,
        description: "Display order",
      },
      {
        name: "options",
        type: "TEXT",
        nullable: false,
        defaultValue: "[]",
        description: "JSON array of options",
      },
      {
        name: "required",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description: "Whether field is required",
      },
      {
        name: "sampleValue",
        type: "TEXT",
        nullable: true,
        description: "Sample value",
      },
    ],
    foreignKeys: [
      {
        name: "fields_caseid_fkey",
        columns: ["caseid"],
        referenceTable: "Cases",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
      {
        name: "fields_dataobjectid_fkey",
        columns: ["dataObjectId"],
        referenceTable: "DataObjects",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [
      {
        name: "fields_caseid_idx",
        columns: ["caseid"],
      },
      {
        name: "fields_dataobjectid_idx",
        columns: ["dataObjectId"],
      },
      {
        name: "fields_name_caseid_unique",
        columns: ["name", "caseid"],
        unique: true,
      },
      {
        name: "fields_name_dataobjectid_unique",
        columns: ["name", "dataObjectId"],
        unique: true,
      },
    ],
    constraints: [
      {
        name: "fields_caseid_xor_dataobjectid",
        type: "CHECK",
        expression: '((caseid IS NOT NULL) <> ("dataObjectId" IS NOT NULL))',
      },
      {
        name: "fields_name_caseid_unique",
        type: "UNIQUE",
        expression: "(name, caseid)",
      },
      {
        name: "fields_name_dataobjectid_unique",
        type: "UNIQUE",
        expression: '(name, "dataObjectId")',
      },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      // Ensure options is a JSON string for database storage
      if (Array.isArray(data.options)) {
        data.options = JSON.stringify(data.options);
      }
      // Normalize sampleValue to a string for TEXT column storage
      if (data.sampleValue !== undefined && data.sampleValue !== null) {
        if (typeof data.sampleValue !== "string") {
          try {
            data.sampleValue = JSON.stringify(data.sampleValue);
          } catch {
            data.sampleValue = String(data.sampleValue);
          }
        }
      }
      return data;
    },

    beforeUpdate: async (data) => {
      // Ensure options is a JSON string for database storage
      if (Array.isArray(data.options)) {
        data.options = JSON.stringify(data.options);
      }
      // Normalize sampleValue to a string for TEXT column storage
      if (data.sampleValue !== undefined && data.sampleValue !== null) {
        if (typeof data.sampleValue !== "string") {
          try {
            data.sampleValue = JSON.stringify(data.sampleValue);
          } catch {
            data.sampleValue = String(data.sampleValue);
          }
        }
      }
      return data;
    },

    afterCreate: async (data, id) => {
      console.log(`Created field ${id}: ${data.name} (${data.type})`);
    },
  },
};

// View Rule Type Definition
export const viewRuleType: RuleTypeDefinition = {
  id: "view",
  name: "View",
  description: "A view that defines how fields are displayed and organized",
  category: "ui",
  version: "1.0.0",

  interfaceTemplate: {
    name: "View",
    description: "A view that defines how fields are displayed and organized",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "string",
        description: "View name",
      },
      {
        name: "caseid",
        type: "number",
        description: "Reference to parent case",
      },
      {
        name: "model",
        type: "ViewModel",
        description: "View configuration model",
      },
    ],
  },

  databaseSchema: {
    tableName: "Views",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "TEXT",
        nullable: false,
        description: "View name",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: false,
        description: "View configuration model",
      },
      {
        name: "caseid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent case",
      },
    ],
    foreignKeys: [
      {
        name: "views_caseid_fkey",
        columns: ["caseid"],
        referenceTable: "Cases",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [
      {
        name: "views_caseid_idx",
        columns: ["caseid"],
      },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      // Ensure model is stored as JSON
      if (typeof data.model === "object") {
        data.model = JSON.stringify(data.model);
      }
      return data;
    },

    afterCreate: async (data, id) => {
      console.log(`Created view ${id}: ${data.name}`);
    },
  },
};

// System Of Record Rule Type Definition
export const systemOfRecordRuleType: RuleTypeDefinition = {
  id: "systemOfRecord",
  name: "System of Record",
  description:
    "A back-end system that is the authoritative source for a given data object (e.g., Pega or others).",
  category: "integration",
  version: "1.0.0",

  interfaceTemplate: {
    name: "SystemOfRecord",
    description: "Defines an external or internal system of record.",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      { name: "name", type: "string", description: "System of record name" },
      {
        name: "icon",
        type: "string",
        optional: true,
        description: "Icon name or URL",
      },
    ],
  },

  databaseSchema: {
    tableName: "SystemsOfRecord",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "TEXT",
        nullable: false,
        description: "System of record name",
      },
      {
        name: "icon",
        type: "TEXT",
        nullable: true,
        description: "Icon name or URL",
      },
    ],
    indexes: [{ name: "systems_of_record_name_idx", columns: ["name"] }],
    constraints: [
      {
        name: "systems_of_record_name_unique",
        type: "UNIQUE",
        expression: "(name)",
      },
    ],
  },
};

// Data Object Rule Type Definition
export const dataObjectRuleType: RuleTypeDefinition = {
  id: "dataObject",
  name: "Data Object",
  description:
    "A business data object that can be integrated, stored, or updated within workflows. References a system of record and contains a model with fields.",
  category: "data",
  version: "1.0.0",

  interfaceTemplate: {
    name: "DataObject",
    description:
      "A business data object linked to a workflow (case) and a system of record. Model contains list of fields and integration configuration.",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      { name: "name", type: "string", description: "Data object name" },
      {
        name: "description",
        type: "string",
        description: "Data object description",
      },
      {
        name: "caseid",
        type: "number",
        description: "Reference to parent case (workflow)",
      },
      {
        name: "systemOfRecordId",
        type: "number",
        description: "Reference to system of record",
      },
      {
        name: "model",
        type: "ViewModel",
        description: "JSON model including fields and integration details",
      },
    ],
  },

  databaseSchema: {
    tableName: "DataObjects",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "name",
        type: "TEXT",
        nullable: false,
        description: "Data object name",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: false,
        description: "Data object description",
      },
      {
        name: "caseid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent case",
      },
      {
        name: "systemOfRecordId",
        type: "INTEGER",
        nullable: false,
        description: "Reference to system of record",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: true,
        description: "JSON model containing list of fields and configuration",
      },
    ],
    foreignKeys: [
      {
        name: "dataobjects_caseid_fkey",
        columns: ["caseid"],
        referenceTable: "Cases",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
      {
        name: "dataobjects_sorid_fkey",
        columns: ["systemOfRecordId"],
        referenceTable: "SystemsOfRecord",
        referenceColumns: ["id"],
        onDelete: "RESTRICT",
      },
    ],
    indexes: [
      { name: "dataobjects_caseid_idx", columns: ["caseid"] },
      { name: "dataobjects_sorid_idx", columns: ["systemOfRecordId"] },
      {
        name: "dataobjects_name_caseid_unique",
        columns: ["name", "caseid"],
        unique: true,
      },
    ],
    constraints: [
      {
        name: "dataobjects_name_caseid_unique",
        type: "UNIQUE",
        expression: "(name, caseid)",
      },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      // Provide a default model so validation passes when none supplied
      if (data.model === undefined || data.model === null) {
        data.model = { fields: [] };
        return data;
      }
      if (data.model && typeof data.model === "string") {
        try {
          data.model = JSON.parse(data.model);
        } catch {
          throw new Error("Invalid JSON in model field");
        }
      }
      return data;
    },
    beforeUpdate: async (data) => {
      if (data.model && typeof data.model === "string") {
        try {
          data.model = JSON.parse(data.model);
        } catch {
          throw new Error("Invalid JSON in model field");
        }
      }
      return data;
    },
  },
};

// Register all rule types
export function registerRuleTypes(): void {
  try {
    // Register Applications first so Cases can reference it via FK
    ruleTypeRegistry.register(applicationRuleType);
    ruleTypeRegistry.register(caseRuleType);
    // Ensure dependency order for foreign keys:
    // SystemsOfRecord and DataObjects must exist before Fields (Fields -> DataObjects)
    ruleTypeRegistry.register(systemOfRecordRuleType);
    ruleTypeRegistry.register(dataObjectRuleType);
    ruleTypeRegistry.register(fieldRuleType);
    ruleTypeRegistry.register(viewRuleType);
    console.log("✅ All rule types registered successfully");
  } catch (error) {
    console.error("❌ Failed to register rule types:", error);
    throw error;
  }
}
