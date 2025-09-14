import React, { useState, useEffect, useRef, useMemo } from "react";
import { Field, FieldReference } from "../types/types";
import AddFieldModal from "./AddFieldModal";
import EditFieldModal from "./EditFieldModal";
import StepForm from "./StepForm";
import StandardModal from "./StandardModal";
import {
  StepType,
  getAllStepTypes,
  getStepTypeDisplayName,
} from "../utils/stepTypes";

interface StepConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  step?: {
    id: number;
    stageId: number;
    processId: number;
    stepId: number;
    name: string;
    fields: FieldReference[];
    type: string;
  };
  // For add mode, we need stageId and processId
  stageId?: number;
  processId?: number;
  fields: Field[];
  onFieldChange: (fieldId: number, value: string | number | boolean) => void;
  onAddField: (field: {
    label: string;
    type: Field["type"];
    options?: string[];
    required?: boolean;
    primary?: boolean;
  }) => Promise<string>;
  onAddExistingField: (stepId: number, fieldIds: number[]) => void;
  onUpdateField: (updates: Partial<Field>) => void;
  onDeleteField: (field: Field) => void;
  workflowObjects?: Array<{ id: number; name: string }>;
  dataObjects?: Array<{ id: number; name: string }>;
  onUpdateMeta?: (
    name: string,
    type: StepType,
    fields?: (Field & { required: boolean })[],
  ) => void;
  onAddStep?: (
    stageId: number,
    processId: number,
    stepName: string,
    stepType: StepType,
    fields?: (Field & { required: boolean })[],
  ) => void;
}

const StepConfigurationModal: React.FC<StepConfigurationModalProps> = ({
  isOpen,
  onClose,
  mode,
  step,
  stageId,
  processId,
  fields,
  onFieldChange,
  onAddField,
  onAddExistingField: _onAddExistingField,
  onUpdateField: _onUpdateField,
  onDeleteField: _onDeleteField,
  workflowObjects = [],
  dataObjects = [],
  onUpdateMeta,
  onAddStep,
}) => {
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const addFieldButtonRef = useRef<HTMLButtonElement>(
    null,
  ) as React.MutableRefObject<HTMLButtonElement>;

  const [editedName, setEditedName] = useState(step?.name || "");
  const [editedType, setEditedType] = useState<StepType>(
    (step?.type as StepType) || "Collect information",
  );

  // Temporary cache for fields being added/edited in the modal
  const [tempFields, setTempFields] = useState<
    (Field & { required: boolean })[]
  >([]);

  useEffect(() => {
    if (mode === "edit" && step) {
      // Keep local state in sync if parent changes the step
      setEditedName(step.name);
      setEditedType((step.type as StepType) || "Collect information");

      // Initialize tempFields from step.fields
      const initialFields = step.fields
        .map((fieldRef) => {
          const field = fields.find((f) => f.id === fieldRef.fieldId);
          return field && typeof field.id === "number"
            ? ({ ...field, required: fieldRef.required } as Field & {
                required: boolean;
              })
            : null;
        })
        .filter(
          (f): f is Field & { required: boolean } =>
            f !== null && f.id !== undefined,
        );
      setTempFields(initialFields);
    } else if (mode === "add") {
      // Reset to defaults for add mode
      setEditedName("");
      setEditedType("Collect information");
      setTempFields([]);
    }
  }, [mode, step, step?.name, step?.type, fields]);

  // Use tempFields for display - this includes both existing fields (in edit mode) and newly added fields
  const stepFields = useMemo(() => {
    return tempFields;
  }, [tempFields]);

  useEffect(() => {
    if (!isOpen) {
      setIsAddFieldOpen(false);
    }
  }, [isOpen]);

  const handleReorderFields = (startIndex: number, endIndex: number) => {
    const reorderedFields = Array.from(tempFields);
    const [removed] = reorderedFields.splice(startIndex, 1);
    reorderedFields.splice(endIndex, 0, removed);
    setTempFields(reorderedFields);
  };

  const handleRemoveField = (field: Field) => {
    setTempFields((prev) => prev.filter((f) => f.id !== field.id));
  };

  const handleSaveMeta = () => {
    const trimmed = editedName.trim();
    if (!trimmed) return;

    if (mode === "edit" && onUpdateMeta) {
      onUpdateMeta(trimmed, editedType, tempFields);
    } else if (mode === "add" && onAddStep && stageId && processId) {
      onAddStep(stageId, processId, trimmed, editedType, tempFields);
    }
    onClose();
  };

  // For add mode, we need stageId and processId
  if (mode === "add" && (!stageId || !processId)) {
    console.error(
      "StepConfigurationModal: stageId and processId are required for add mode",
    );
    return null;
  }

  const stepFieldIds = stepFields.map((field) => field.id!);

  const modalActions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onClose,
    },
    {
      id: "save",
      label: "Save",
      type: "primary" as const,
      onClick: handleSaveMeta,
      disabled: !editedName.trim(),
    },
  ];

  return (
    <>
      <StandardModal
        isOpen={isOpen}
        onCloseAction={onClose}
        title={mode === "add" ? "Add New Step" : "Edit Step"}
        actions={modalActions}
        width="w-full"
        zIndex="z-[30]"
      >
        <div
          data-allow-freeform-select="true"
          data-viewid={
            step && typeof (step as any)?.viewId === "number"
              ? ((step as any).viewId as number)
              : undefined
          }
        >
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter step title"
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Type
                </label>
                <select
                  value={editedType}
                  onChange={(e) => setEditedType(e.target.value as StepType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
                >
                  {getAllStepTypes().map((t) => (
                    <option key={t} value={t}>
                      {getStepTypeDisplayName(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editedType === "Collect information" ? (
              <div className="relative">
                <div className="flex justify-between items-center mb-3">
                  <h3>
                    Fields
                    <span className="ml-2 text-sm font-normal">
                      ({stepFields.length})
                    </span>
                  </h3>
                  <button
                    ref={addFieldButtonRef}
                    onClick={() => {
                      console.log(
                        "🟦 StepConfigurationModal: open AddFieldModal",
                      );
                      setIsAddFieldOpen(true);
                    }}
                    className="interactive-button"
                  >
                    Add Field
                  </button>
                </div>
                {stepFields.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-interactive dark:text-gray-400">
                      No fields added yet. Click "Add Field" to get started.
                    </p>
                  </div>
                ) : (
                  <StepForm
                    fields={stepFields}
                    onFieldChange={(
                      fieldId: string,
                      value: string | number | boolean,
                    ) => {
                      const numericFieldId = parseInt(fieldId, 10);
                      if (!isNaN(numericFieldId)) {
                        onFieldChange(numericFieldId, value);
                      }
                    }}
                    onDeleteField={handleRemoveField}
                    onReorderFields={handleReorderFields}
                    onEditField={(field) => setEditingField(field)}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </StandardModal>

      <AddFieldModal
        isOpen={isAddFieldOpen}
        onClose={() => setIsAddFieldOpen(false)}
        onAddField={async (field) => {
          console.log("🟩 StepConfigurationModal: onAddField wrapper", field);
          const createdFieldName = await onAddField({
            ...field,
            primary: field.primary ?? false,
          });

          // Add the created field to tempFields
          const createdField = fields.find((f) => f.name === createdFieldName);
          if (createdField && typeof createdField.id === "number") {
            setTempFields((prev) => [
              ...prev,
              { ...createdField, required: field.required ?? false },
            ]);
          }
        }}
        buttonRef={addFieldButtonRef}
        existingFields={fields}
        stepFieldIds={stepFieldIds.map(String)}
        workflowObjects={workflowObjects}
        dataObjects={dataObjects}
        onAddExistingField={(fieldIds) => {
          // Convert string field IDs back to numbers
          console.log(
            "🟨 StepConfigurationModal: onAddExistingField wrapper",
            fieldIds,
          );
          const numericFieldIds = fieldIds
            .map((id) => parseInt(id, 10))
            .filter((id) => !isNaN(id));

          // Add the selected fields to tempFields
          const selectedFields = fields
            .filter((f) => numericFieldIds.includes(f.id!))
            .map(
              (field) =>
                ({ ...field, required: false } as Field & {
                  required: boolean;
                }),
            );

          setTempFields((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newFields = selectedFields.filter(
              (f) => !existingIds.has(f.id),
            );
            return [...prev, ...newFields];
          });
        }}
      />

      {editingField && (
        <EditFieldModal
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onSubmit={(updates) => {
            // Update the field in tempFields
            setTempFields((prev) =>
              prev.map((f) =>
                f.id === editingField.id
                  ? ({ ...f, ...updates } as Field & { required: boolean })
                  : f,
              ),
            );
            setEditingField(null);
          }}
          field={editingField}
          workflowObjects={[]}
          dataObjects={[]}
        />
      )}
    </>
  );
};

export default StepConfigurationModal;
