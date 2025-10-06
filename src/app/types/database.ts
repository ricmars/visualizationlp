import { fieldTypes, FieldType } from "../utils/fieldTypes";
import { ruleTypeRegistry } from "./ruleTypeRegistry";

// Database column names
export const DB_COLUMNS = {
  CASE_ID: "objectid",
  OBJECT_ID: "objectid",
  APPLICATION_ID: "applicationid",
  ID: "id",
  NAME: "name",
  DESCRIPTION: "description",
  MODEL: "model",
  TYPE: "type",
  PRIMARY: "primary",
  LABEL: "label",
  ICON: "icon",
  ORDER: "order",
  OPTIONS: "options",
} as const;

// Dynamic database table names - get from rule type registry
export const DB_TABLES = {
  get OBJECTS() {
    const ruleType = ruleTypeRegistry.get("object");
    return ruleType?.databaseSchema.tableName || "Objects";
  },
  get APPLICATIONS() {
    const ruleType = ruleTypeRegistry.get("application");
    return ruleType?.databaseSchema.tableName || "Applications";
  },
  get FIELDS() {
    const ruleType = ruleTypeRegistry.get("field");
    return ruleType?.databaseSchema.tableName || "Fields";
  },
  get VIEWS() {
    const ruleType = ruleTypeRegistry.get("view");
    return ruleType?.databaseSchema.tableName || "Views";
  },
  get SYSTEMS_OF_RECORD() {
    const ruleType = ruleTypeRegistry.get("systemOfRecord");
    return ruleType?.databaseSchema.tableName || "SystemsOfRecord";
  },
  get OBJECT_RECORDS() {
    const ruleType = ruleTypeRegistry.get("objectRecord");
    return ruleType?.databaseSchema.tableName || "ObjectRecords";
  },
  get THEMES() {
    const ruleType = ruleTypeRegistry.get("theme");
    return ruleType?.databaseSchema.tableName || "Themes";
  },
  get DECISION_TABLES() {
    const ruleType = ruleTypeRegistry.get("decisionTable");
    return ruleType?.databaseSchema.tableName || "DecisionTables";
  },
} as const;

// Helper function to get table name by rule type ID
export function getTableName(ruleTypeId: string): string {
  const ruleType = ruleTypeRegistry.get(ruleTypeId);
  if (!ruleType) {
    throw new Error(`Rule type '${ruleTypeId}' not found`);
  }
  return ruleType.databaseSchema.tableName;
}

// Field types mapping - using centralized fieldTypes from fields.ts
export const FIELD_TYPES = Object.fromEntries(
  fieldTypes.map((type) => [
    type.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
    type,
  ]),
) as Record<string, FieldType>;

// Database interfaces
export interface DatabaseRecord {
  id: number;
}

// Generic database record type that can be used with any rule type
export type DynamicRecord<T = any> = T & DatabaseRecord;

// Utility functions
export function ensureIntegerId(id: string | number): number {
  return typeof id === "string" ? parseInt(id, 10) : id;
}

export function stringifyModel(model: unknown): string {
  return JSON.stringify(model);
}

export function parseModel<T>(modelString: string): T {
  return JSON.parse(modelString);
}
