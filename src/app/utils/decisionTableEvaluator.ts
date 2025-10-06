import {
  DecisionTable,
  DecisionTableRow,
  FieldDefinition,
  RangeValue,
} from "../types/types";

/**
 * Evaluates a DecisionTable and returns the string value based on matching conditions.
 * Rows are evaluated in order, and the first matching row's return value is used.
 * The last row is treated as an "otherwise" condition if it has no field conditions.
 *
 * @param decisionTable - The DecisionTable to evaluate
 * @param fieldValues - Object containing field values to compare against
 * @returns The return string from the first matching row, or empty string if no match
 */
export function evaluateDecisionTable(
  decisionTable: DecisionTable,
  fieldValues: Record<string, string | number | boolean | Date>,
): string {
  const { fieldDefs, rowData } = decisionTable;

  // Process each row in order
  for (const row of rowData) {
    if (evaluateRow(row, fieldDefs, fieldValues)) {
      return row.return;
    }
  }

  // If no conditions matched, return empty string
  return "";
}

/**
 * Evaluates a single row against field definitions and values.
 * All field conditions must match (AND logic) for the row to be considered a match.
 */
function evaluateRow(
  row: DecisionTableRow,
  fieldDefs: FieldDefinition[],
  fieldValues: Record<string, string | number | boolean | Date>,
): boolean {
  // If no field definitions, this is an "otherwise" condition
  if (fieldDefs.length === 0) {
    return true;
  }

  // Check each field definition
  for (const fieldDef of fieldDefs) {
    const { columnId, comparatorType } = fieldDef;
    const fieldValue = fieldValues[columnId];
    const rowValue = row[columnId];

    // Skip if field value is not provided
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // If row doesn't have this field, this is an "otherwise" condition
    if (rowValue === undefined) {
      return true;
    }

    if (!evaluateCondition(fieldValue, rowValue, comparatorType)) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates a single condition between a field value and row value.
 */
function evaluateCondition(
  fieldValue: string | number | boolean | Date,
  rowValue: string | number | RangeValue,
  comparatorType: string,
): boolean {
  // Handle range comparisons
  if (typeof rowValue === "object" && "from" in rowValue && "to" in rowValue) {
    return evaluateRangeCondition(fieldValue, rowValue, comparatorType);
  }

  // Infer data type from the values and convert appropriately
  const convertedFieldValue = convertValueByInference(fieldValue);
  const convertedRowValue = convertValueByInference(rowValue);

  switch (comparatorType) {
    case "=":
      return convertedFieldValue === convertedRowValue;
    case "!=":
      return convertedFieldValue !== convertedRowValue;
    case ">":
      return convertedFieldValue > convertedRowValue;
    case "<":
      return convertedFieldValue < convertedRowValue;
    case ">=":
      return convertedFieldValue >= convertedRowValue;
    case "<=":
      return convertedFieldValue <= convertedRowValue;
    default:
      return false;
  }
}

/**
 * Evaluates range conditions (BETWEEN, FROM, etc.).
 */
function evaluateRangeCondition(
  fieldValue: string | number | boolean | Date,
  rangeValue: RangeValue,
  comparatorType: string,
): boolean {
  const convertedFieldValue = convertValueByInference(fieldValue);
  const fromValue = convertValueByInference(rangeValue.from);
  const toValue = convertValueByInference(rangeValue.to);

  switch (comparatorType) {
    case "> and <":
      return convertedFieldValue > fromValue && convertedFieldValue < toValue;
    case ">= and <=":
      return convertedFieldValue >= fromValue && convertedFieldValue <= toValue;
    case "> and <=":
      return convertedFieldValue > fromValue && convertedFieldValue <= toValue;
    case ">= and <":
      return convertedFieldValue >= fromValue && convertedFieldValue < toValue;
    default:
      return false;
  }
}

/**
 * Converts a value to the appropriate type for comparison by inferring the type.
 */
function convertValueByInference(
  value: string | number | boolean | Date,
): string | number | Date | boolean {
  // If already the right type, return as is
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }

  // Try to convert to number if it looks like a number
  if (
    typeof value === "string" &&
    !isNaN(Number(value)) &&
    value.trim() !== ""
  ) {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue;
    }
  }

  // Try to convert to date if it looks like a date
  if (typeof value === "string") {
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      return dateValue;
    }
  }

  // Default to string
  return String(value);
}
