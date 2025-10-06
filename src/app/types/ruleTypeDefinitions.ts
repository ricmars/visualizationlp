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

// Object Rule Type Definition (unifies previous Case and DataObject)
export const objectRuleType: RuleTypeDefinition = {
  id: "object",
  name: "Object",
  description:
    "A business object that may represent a workflow (hasWorkflow=true) or a data object (hasWorkflow=false).",
  category: "core",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Object",
    description:
      "A business object that contains a list of fields. If hasWorkflow is true, model contains also the workflow structure.",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      {
        name: "applicationid",
        type: "number",
        optional: true,
        description: "Reference to parent application",
      },
      { name: "name", type: "string", description: "Object name" },
      {
        name: "description",
        type: "string",
        description: "Object description",
      },
      {
        name: "hasWorkflow",
        type: "boolean",
        optional: true,
        description: "Whether this object contains a workflow",
      },
      {
        name: "isEmbedded",
        type: "boolean",
        optional: true,
        description:
          "Whether this object is embedded (data is stored directly rather than referenced)",
      },
      {
        name: "systemOfRecordId",
        type: "number",
        optional: true,
        description:
          "Optional reference to system of record - if hasWorkflow is true, this is not necessary",
      },
      {
        name: "model",
        type: "ViewModel",
        optional: true,
        description: "JSON model containing workflow and/or metadata",
      },
    ],
  },

  databaseSchema: {
    tableName: "Objects",
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
        description: "Object name",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: false,
        description: "Object description",
      },
      {
        name: "hasWorkflow",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description: "Whether this object contains a workflow",
      },
      {
        name: "isEmbedded",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description:
          "Whether this object is embedded (data is stored directly rather than referenced)",
      },
      {
        name: "systemOfRecordId",
        type: "INTEGER",
        nullable: true,
        description: "Optional reference to system of record",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: true,
        description: "JSON model",
      },
    ],
    foreignKeys: [
      {
        name: "objects_applicationid_fkey",
        columns: ["applicationid"],
        referenceTable: "Applications",
        referenceColumns: ["id"],
        onDelete: "SET NULL",
      },
      {
        name: "objects_sorid_fkey",
        columns: ["systemOfRecordId"],
        referenceTable: "SystemsOfRecord",
        referenceColumns: ["id"],
        onDelete: "SET NULL",
      },
    ],
    indexes: [
      { name: "objects_name_idx", columns: ["name"] },
      { name: "objects_applicationid_idx", columns: ["applicationid"] },
      { name: "objects_hasworkflow_idx", columns: ["hasWorkflow"] },
      { name: "objects_isembedded_idx", columns: ["isEmbedded"] },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      if (data.model === undefined || data.model === null) {
        // Default empty structures based on hasWorkflow
        data.model = data.hasWorkflow ? { stages: [] } : {};
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
      console.log(
        `Created object ${id}: ${data.name} (hasWorkflow=${data.hasWorkflow})`,
      );
    },
  },
};

// Application Rule Type Definition
export const applicationRuleType: RuleTypeDefinition = {
  id: "application",
  name: "Application",
  description:
    "An application that contains multiple objects includes some with workflows. Includes name, description, and icon.",
  category: "app",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Application",
    description:
      "An application that contains multiple objects includes some with workflows.",
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
  description: "A field within an object that can be collected and displayed",
  category: "data",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Field",
    description: "A field within an object that can be collected and displayed",
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
        name: "objectid",
        type: "number",
        description: "Reference to parent object",
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
        name: "refObjectId",
        type: "number",
        optional: true,
        description: "Target object ID when this field is a reference",
      },
      {
        name: "refMultiplicity",
        type: "string",
        optional: true,
        description: "Reference multiplicity: 'single' or 'multi'",
      },
      {
        name: "sampleValue",
        type: "unknown",
        optional: true,
        description: "Sample value for previews",
      },
      {
        name: "source",
        type: "string",
        optional: true,
        description: "Source of the field data: 'User input' or 'Calculated'",
      },
      {
        name: "highlighted",
        type: "boolean",
        optional: true,
        description: "Whether this field should be highlighted in the UI",
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
        name: "objectid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent object",
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
        name: "refObjectId",
        type: "INTEGER",
        nullable: true,
        description: "Target object ID when this field is a reference",
      },
      {
        name: "refMultiplicity",
        type: "TEXT",
        nullable: true,
        description: "Reference multiplicity: 'single' or 'multi'",
      },
      {
        name: "sampleValue",
        type: "TEXT",
        nullable: true,
        description: "Sample value",
      },
      {
        name: "source",
        type: "TEXT",
        nullable: true,
        description: "Source of the field data: 'User input' or 'Calculated'",
      },
      {
        name: "highlighted",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description: "Whether this field should be highlighted in the UI",
      },
    ],
    foreignKeys: [
      {
        name: "fields_objectid_fkey",
        columns: ["objectid"],
        referenceTable: "Objects",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [
      { name: "fields_objectid_idx", columns: ["objectid"] },
      {
        name: "fields_name_objectid_unique",
        columns: ["name", "objectid"],
        unique: true,
      },
    ],
    constraints: [
      {
        name: "fields_name_objectid_unique",
        type: "UNIQUE",
        expression: "(name, objectid)",
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
        name: "objectid",
        type: "number",
        description: "Reference to parent object",
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
        name: "objectid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent object",
      },
    ],
    foreignKeys: [
      {
        name: "views_objectid_fkey",
        columns: ["objectid"],
        referenceTable: "Objects",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [{ name: "views_objectid_idx", columns: ["objectid"] }],
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

// Object Record Rule Type Definition
export const objectRecordRuleType: RuleTypeDefinition = {
  id: "objectRecord",
  name: "Object Record",
  description:
    "A record instance of an object containing field values stored as JSONB",
  category: "data",
  version: "1.0.0",

  interfaceTemplate: {
    name: "ObjectRecord",
    description: "A record instance of an object containing field values",
    properties: [
      {
        name: "id",
        type: "number",
        optional: true,
        description: "Primary key identifier",
      },
      {
        name: "objectid",
        type: "number",
        description: "Reference to parent object",
      },
      {
        name: "data",
        type: "Record<string, any>",
        description: "Field values stored as JSONB",
      },
      {
        name: "created_at",
        type: "string",
        optional: true,
        description: "Record creation timestamp",
      },
      {
        name: "updated_at",
        type: "string",
        optional: true,
        description: "Record last update timestamp",
      },
    ],
  },

  databaseSchema: {
    tableName: "ObjectRecords",
    columns: [
      {
        name: "id",
        type: "INTEGER",
        primaryKey: true,
        nullable: false,
        description: "Primary key identifier",
      },
      {
        name: "objectid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent object",
      },
      {
        name: "data",
        type: "JSONB",
        nullable: false,
        description: "Field values stored as JSONB",
      },
      {
        name: "created_at",
        type: "TIMESTAMP",
        nullable: false,
        defaultValue: "NOW()",
        description: "Record creation timestamp",
      },
      {
        name: "updated_at",
        type: "TIMESTAMP",
        nullable: false,
        defaultValue: "NOW()",
        description: "Record last update timestamp",
      },
    ],
    foreignKeys: [
      {
        name: "object_records_objectid_fkey",
        columns: ["objectid"],
        referenceTable: "Objects",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [
      { name: "object_records_objectid_idx", columns: ["objectid"] },
      { name: "object_records_created_at_idx", columns: ["created_at"] },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      if (data.data === undefined || data.data === null) {
        data.data = {};
      }
      if (typeof data.data === "string") {
        try {
          data.data = JSON.parse(data.data);
        } catch {
          throw new Error("Invalid JSON in data field");
        }
      }
      return data;
    },
    beforeUpdate: async (data) => {
      if (data.data === undefined || data.data === null) {
        return data;
      }
      if (typeof data.data === "string") {
        try {
          data.data = JSON.parse(data.data);
        } catch {
          throw new Error("Invalid JSON in data field");
        }
      }
      // Update the updated_at timestamp
      data.updated_at = new Date().toISOString();
      return data;
    },
    afterCreate: async (data, id) => {
      console.log(`Created object record ${id} for object ${data.objectid}`);
    },
  },
};

// Theme Rule Type Definition
export const themeRuleType: RuleTypeDefinition = {
  id: "theme",
  name: "Theme",
  description:
    "A theme that defines the visual styling and appearance of an application",
  category: "ui",
  version: "1.0.0",

  interfaceTemplate: {
    name: "Theme",
    description:
      "A theme that defines the visual styling and appearance of an application",
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
        description: "Theme name",
      },
      {
        name: "description",
        type: "string",
        description: "Theme description",
      },
      {
        name: "isSystemTheme",
        type: "boolean",
        optional: true,
        description: "Whether this is a system theme that cannot be deleted",
      },
      {
        name: "applicationid",
        type: "number",
        description: "Reference to parent application",
      },
      {
        name: "model",
        type: "ThemeModel",
        optional: true,
        description: "Theme configuration model",
      },
      {
        name: "logoURL",
        type: "string",
        optional: true,
        description:
          "URL to the logo of the application - logo will be displayed in the header",
      },
    ],
  },

  databaseSchema: {
    tableName: "Themes",
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
        description: "Theme name",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: false,
        description: "Theme description",
      },
      {
        name: "isSystemTheme",
        type: "BOOLEAN",
        nullable: false,
        defaultValue: false,
        description: "Whether this is a system theme that cannot be deleted",
      },
      {
        name: "applicationid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent application",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: true,
        description: "Theme configuration model",
      },
      {
        name: "logoURL",
        type: "TEXT",
        nullable: true,
        description:
          "URL to the logo of the application - logo will be displayed in the header",
      },
    ],
    foreignKeys: [
      {
        name: "themes_applicationid_fkey",
        columns: ["applicationid"],
        referenceTable: "Applications",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [
      { name: "themes_name_idx", columns: ["name"] },
      { name: "themes_applicationid_idx", columns: ["applicationid"] },
      { name: "themes_issystemtheme_idx", columns: ["isSystemTheme"] },
    ],
    constraints: [
      {
        name: "themes_name_applicationid_unique",
        type: "UNIQUE",
        expression: "(name, applicationid)",
      },
    ],
  },

  hooks: {
    beforeCreate: async (data) => {
      if (data.model === undefined || data.model === null) {
        data.model = {};
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
    beforeDelete: async (id) => {
      // Check if this is a system theme
      const pool = (global as any).pool;
      if (pool) {
        const checkQuery = `SELECT "isSystemTheme" FROM "Themes" WHERE id = $1`;
        const result = await pool.query(checkQuery, [id]);
        if (result.rows.length > 0 && result.rows[0].isSystemTheme) {
          throw new Error("Cannot delete system theme");
        }
      }
      return true;
    },
    afterCreate: async (data, id) => {
      console.log(
        `Created theme ${id}: ${data.name} (isSystemTheme=${data.isSystemTheme})`,
      );
    },
  },
};

// Decision Table Rule Type Definition
export const decisionTableRuleType: RuleTypeDefinition = {
  id: "decisionTable",
  name: "DecisionTable",
  description:
    "A decision table that defines business logic rules with field definitions and row data",
  category: "logic",
  version: "1.0.0",

  interfaceTemplate: {
    name: "DecisionTable",
    description:
      "A decision table with field definitions and row data for business logic",
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
        description: "Decision table name",
      },
      {
        name: "description",
        type: "string",
        optional: true,
        description: "Decision table description",
      },
      {
        name: "objectid",
        type: "number",
        description: "Reference to parent object",
      },
      {
        name: "model",
        type: "DecisionTableModel",
        description: "Decision table configuration model",
      },
    ],
  },

  databaseSchema: {
    tableName: "DecisionTables",
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
        description: "Decision table name",
      },
      {
        name: "description",
        type: "TEXT",
        nullable: true,
        description: "Decision table description",
      },
      {
        name: "objectid",
        type: "INTEGER",
        nullable: false,
        description: "Reference to parent object",
      },
      {
        name: "model",
        type: "JSONB",
        nullable: false,
        description: "Decision table configuration model",
      },
    ],
    foreignKeys: [
      {
        name: "decisiontables_objectid_fkey",
        columns: ["objectid"],
        referenceTable: "Objects",
        referenceColumns: ["id"],
        onDelete: "CASCADE",
      },
    ],
    indexes: [{ name: "decisiontables_objectid_idx", columns: ["objectid"] }],
  },

  hooks: {
    beforeCreate: async (data) => {
      // Ensure model is stored as JSON
      if (typeof data.model === "object") {
        data.model = JSON.stringify(data.model);
      }
    },
    afterCreate: async (data, id) => {
      console.log(`Created decision table ${id}: ${data.name}`);
    },
  },
};

// Removed Data Object Rule Type (merged into Object)

// Register all rule types
export function registerRuleTypes(): void {
  try {
    // Register in dependency order for FK correctness
    // Applications → SystemsOfRecord → Objects → Fields → Views → DecisionTables → ObjectRecords → Themes
    ruleTypeRegistry.register(applicationRuleType);
    ruleTypeRegistry.register(systemOfRecordRuleType);
    ruleTypeRegistry.register(objectRuleType);
    ruleTypeRegistry.register(fieldRuleType);
    ruleTypeRegistry.register(viewRuleType);
    ruleTypeRegistry.register(decisionTableRuleType);
    ruleTypeRegistry.register(objectRecordRuleType);
    ruleTypeRegistry.register(themeRuleType);
    console.log("✅ All rule types registered successfully");
  } catch (error) {
    console.error("❌ Failed to register rule types:", error);
    throw error;
  }
}
