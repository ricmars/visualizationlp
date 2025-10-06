import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import {
  Field,
  DecisionTable,
  FieldDefinition,
  DecisionTableRow,
  ComparatorType,
  RangeValue,
} from "../types/types";
import { FieldType } from "../utils/fieldTypes";
import { getFieldTypeDisplayName } from "../utils/fieldTypes";

interface DecisionTableAuthoringProps {
  decisionTable?: DecisionTable;
  fields: Field[];
  steps?: Array<{ id: number; name: string }>;
  onSave: (decisionTable: DecisionTable) => void;
  onCancel: () => void;
}

export interface DecisionTableAuthoringRef {
  save: () => void;
}

const DecisionTableAuthoring = forwardRef<
  DecisionTableAuthoringRef,
  DecisionTableAuthoringProps
>(({ decisionTable, fields, steps = [], onSave, onCancel: _onCancel }, ref) => {
  const [name, setName] = useState(decisionTable?.name || "");
  const [description, setDescription] = useState(
    decisionTable?.description || "",
  );
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>(
    decisionTable?.fieldDefs || [],
  );
  const [rowData, setRowData] = useState<DecisionTableRow[]>(
    decisionTable?.rowData || [],
  );
  const [returnElse, setReturnElse] = useState<string>(
    decisionTable?.returnElse || "",
  );

  // Keep local state in sync when a different decision table is selected
  const prevDecisionTableIdRef = useRef<number | undefined>(decisionTable?.id);
  useEffect(() => {
    const prevId = prevDecisionTableIdRef.current;
    const nextId = decisionTable?.id;
    if (prevId !== nextId) {
      setName(decisionTable?.name || "");
      setDescription(decisionTable?.description || "");
      setFieldDefs(decisionTable?.fieldDefs || []);
      setRowData(decisionTable?.rowData || []);
      setReturnElse(decisionTable?.returnElse || "");
      prevDecisionTableIdRef.current = nextId;
    }
  }, [decisionTable]);

  // Expose save function to parent component
  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const comparatorTypes: ComparatorType[] = [
    "=",
    "!=",
    ">",
    "<",
    ">=",
    "<=",
    "> and <",
    ">= and <=",
    "> and <=",
    ">= and <",
  ];

  // Helper function to get field type from field ID
  const getFieldType = (fieldId: string): FieldType => {
    const field = fields.find((f) => f.id?.toString() === fieldId);
    return field?.type || "Text";
  };

  // Helper function to get column CSS class based on field type
  const getColumnClass = (fieldType: FieldType): string => {
    switch (fieldType) {
      case "Integer":
      case "Decimal":
      case "Currency":
      case "Percentage":
        return "col-number";
      case "Date":
      case "DateTime":
      case "Time":
        return "col-date";
      case "Checkbox":
        return "col-boolean";
      case "Dropdown":
      case "RadioButtons":
        return "col-select";
      default:
        return "col-text";
    }
  };

  // Helper function to check if comparator is a range
  const isRangeComparator = (comparator: ComparatorType): boolean => {
    return [" > and <", " >= and <=", " > and <=", " >= and <"].includes(
      comparator,
    );
  };

  const addColumn = useCallback(() => {
    const newColumnId = `col_${Date.now()}`;
    const newFieldDef: FieldDefinition = {
      columnId: newColumnId,
      comparatorType: "=",
      dataType: "Text",
    };
    setFieldDefs((prev) => [...prev, newFieldDef]);
  }, []);

  const updateColumn = useCallback(
    (index: number, updates: Partial<FieldDefinition>) => {
      setFieldDefs((prev) =>
        prev.map((def, i) => (i === index ? { ...def, ...updates } : def)),
      );
    },
    [],
  );

  const removeColumn = useCallback(
    (index: number) => {
      const columnId = fieldDefs[index]?.columnId;
      setFieldDefs((prev) => prev.filter((_, i) => i !== index));
      // Remove this column from all rows
      setRowData((prev) =>
        prev.map((row) => {
          const newRow = { ...row };
          if (columnId) {
            delete newRow[columnId];
          }
          return newRow;
        }),
      );
    },
    [fieldDefs],
  );

  const addRow = useCallback(() => {
    const newRow: DecisionTableRow = {
      id: `row_${Date.now()}`,
      return: "",
    };
    setRowData((prev) => [...prev, newRow]);
  }, []);

  const updateRow = useCallback(
    (index: number, updates: Partial<DecisionTableRow>) => {
      setRowData((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
      );
    },
    [],
  );

  const removeRow = useCallback((index: number) => {
    setRowData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const decisionTableData: DecisionTable = {
      id: decisionTable?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      fieldDefs,
      rowData,
      returnElse: returnElse.trim() || undefined,
    };

    onSave(decisionTableData);
  }, [
    name,
    description,
    fieldDefs,
    rowData,
    returnElse,
    decisionTable?.id,
    onSave,
  ]);

  const renderCell = (rowIndex: number, columnIndex: number) => {
    const fieldDef = fieldDefs[columnIndex];
    const row = rowData[rowIndex];
    const columnId = fieldDef?.columnId;

    if (!fieldDef || !columnId) return null;

    const fieldType = getFieldType(columnId);
    const isRange = isRangeComparator(fieldDef.comparatorType);
    const cellValue = row[columnId];

    const handleCellChange = (value: string | RangeValue) => {
      updateRow(rowIndex, { [columnId]: value });
    };

    const renderInput = () => {
      if (isRange) {
        const rangeValue =
          typeof cellValue === "object" && cellValue && "from" in cellValue
            ? (cellValue as RangeValue)
            : { from: "", to: "" };

        return (
          <div className="range-input-container">
            <input
              type={
                fieldType === "Date"
                  ? "date"
                  : fieldType === "Integer" || fieldType === "Decimal"
                  ? "number"
                  : "text"
              }
              value={rangeValue.from}
              onChange={(e) =>
                handleCellChange({ ...rangeValue, from: e.target.value })
              }
              placeholder="From"
            />
            <input
              type={
                fieldType === "Date"
                  ? "date"
                  : fieldType === "Integer" || fieldType === "Decimal"
                  ? "number"
                  : "text"
              }
              value={rangeValue.to}
              onChange={(e) =>
                handleCellChange({ ...rangeValue, to: e.target.value })
              }
              placeholder="To"
            />
          </div>
        );
      } else {
        return (
          <input
            type={
              fieldType === "Date"
                ? "date"
                : fieldType === "Integer" || fieldType === "Decimal"
                ? "number"
                : "text"
            }
            value={
              typeof cellValue === "string" || typeof cellValue === "number"
                ? cellValue
                : ""
            }
            onChange={(e) => handleCellChange(e.target.value)}
            placeholder={`Enter ${fieldType.toLowerCase()} value`}
          />
        );
      }
    };

    return <td>{renderInput()}</td>;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Decision Table Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter decision table name"
            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60"
          />
        </div>
      </div>

      {/* Column Configuration */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-white">Columns</h3>
          <button onClick={addColumn} className="interactive-button">
            Add Column
          </button>
        </div>

        {fieldDefs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              No columns added yet. Click "Add Column" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fieldDefs.map((fieldDef, index) => (
              <div
                key={`field-def-${index}-${fieldDef.columnId}`}
                className="flex items-center space-x-3 p-3 bg-[rgb(20,16,60)] rounded-lg border border-gray-600"
              >
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white mb-1">
                      Field
                    </label>
                    <select
                      value={fieldDef.columnId}
                      onChange={(e) =>
                        updateColumn(index, { columnId: e.target.value })
                      }
                      className="w-full px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white text-sm"
                    >
                      <option value="">Select field</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.id?.toString()}>
                          {field.label} ({getFieldTypeDisplayName(field.type)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white mb-1">
                      Comparator
                    </label>
                    <select
                      value={fieldDef.comparatorType}
                      onChange={(e) =>
                        updateColumn(index, {
                          comparatorType: e.target.value as ComparatorType,
                        })
                      }
                      className="w-full px-2 py-1 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white text-sm"
                    >
                      {comparatorTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => removeColumn(index)}
                  className="btn-secondary w-8"
                  title="Remove column"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Table */}
      {fieldDefs.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-white">Decision Rules</h3>
            <button onClick={addRow} className="interactive-button">
              Add Row
            </button>
          </div>

          <div className="decision-table-container">
            <table className="decision-table">
              <thead>
                <tr>
                  {fieldDefs.map((fieldDef, index) => {
                    const field = fields.find(
                      (f) => f.id?.toString() === fieldDef.columnId,
                    );
                    const fieldType = field?.type || "Text";
                    const columnClass = getColumnClass(fieldType);
                    return (
                      <th
                        key={`header-${index}-${fieldDef.columnId}`}
                        className={columnClass}
                      >
                        {field?.label || `Column ${index + 1}`}
                        <div className="text-xs text-gray-400">
                          {fieldDef.comparatorType} •{" "}
                          {getFieldTypeDisplayName(fieldType)}
                        </div>
                      </th>
                    );
                  })}
                  <th className="col-next-step">Next Step</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rowData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={fieldDefs.length + 2}
                      className="text-center text-gray-400"
                    >
                      No rules added yet. Click "Add Row" to get started.
                    </td>
                  </tr>
                ) : (
                  rowData.map((row, rowIndex) => (
                    <tr key={row.id || rowIndex}>
                      {fieldDefs.map((fieldDef, columnIndex) => (
                        <React.Fragment
                          key={`cell-${rowIndex}-${columnIndex}-${fieldDef.columnId}`}
                        >
                          {renderCell(rowIndex, columnIndex)}
                        </React.Fragment>
                      ))}
                      <td>
                        <select
                          value={row.nextStepId || ""}
                          onChange={(e) => {
                            const stepId = e.target.value
                              ? parseInt(e.target.value)
                              : undefined;
                            const selectedStep = steps.find(
                              (s) => s.id === stepId,
                            );
                            updateRow(rowIndex, {
                              nextStepId: stepId,
                              return: selectedStep?.name || "",
                            });
                          }}
                        >
                          <option value="">Select step</option>
                          {steps.map((step) => (
                            <option key={step.id} value={step.id}>
                              {step.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() => removeRow(rowIndex)}
                          className="btn-secondary w-8"
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Else Condition */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">
          Return Else Condition
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          Specify the return value when no decision rules match.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Return Else Step
            </label>
            <select
              value={returnElse}
              onChange={(e) => setReturnElse(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
            >
              <option value="">Select step for else condition</option>
              {steps.map((step) => (
                <option key={step.id} value={step.name}>
                  {step.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

DecisionTableAuthoring.displayName = "DecisionTableAuthoring";

export default DecisionTableAuthoring;
