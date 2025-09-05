import React, { useState, useEffect, useRef, useMemo } from "react";
import { Field, FieldReference } from "../types";
import AddFieldModal from "./AddFieldModal";
import EditFieldModal from "./EditFieldModal";
import StepForm from "./StepForm";

interface StepConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: {
    id: number;
    stageId: number;
    processId: number;
    stepId: number;
    name: string;
    fields: FieldReference[];
    type: string;
  };
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
}

const StepConfigurationModal: React.FC<StepConfigurationModalProps> = ({
  isOpen,
  onClose,
  step,
  fields,
  onFieldChange,
  onAddField,
  onAddExistingField,
  onUpdateField,
  onDeleteField,
  workflowObjects = [],
  dataObjects = [],
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const addFieldButtonRef = useRef<HTMLButtonElement>(
    null,
  ) as React.MutableRefObject<HTMLButtonElement>;

  // Map field references to actual fields using fieldId
  const stepFields = useMemo(() => {
    return step.fields
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
  }, [step.fields, fields]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "unset";
      setIsAddFieldOpen(false);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Note: We intentionally avoid updating parent-selected fields here to prevent render loops.
  // Editing field properties is handled via onUpdateField and reflected through `fields` props.

  const handleReorderFields = (startIndex: number, endIndex: number) => {
    const reorderedFields = Array.from(stepFields);
    const [removed] = reorderedFields.splice(startIndex, 1);
    reorderedFields.splice(endIndex, 0, removed);

    onAddExistingField(
      step.id,
      reorderedFields.map((field) => field.id!),
    );
  };

  const handleRemoveField = (field: Field) => {
    onDeleteField(field);
  };

  if (!isOpen) return null;

  const stepFieldIds = stepFields.map((field) => field.id!);

  return (
    <div className="absolute inset-0 modal-backdrop flex items-center justify-center z-[100] modal-overlay">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[90] modal-surface min-w-[450px]"
        ref={modalRef}
        role="dialog"
        data-allow-freeform-select="true"
        data-viewid={
          typeof (step as any)?.viewId === "number"
            ? ((step as any).viewId as number)
            : undefined
        }
      >
        <div className="lp-modal-header p-6">
          <h2 className="text-xl font-semibold text-white">
            {`Edit View: ${step.name}`}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              {step.type === "Collect information" ? (
                <>
                  <h3 className="text-lg font-medium">
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
                </>
              ) : null}
            </div>

            {step.type === "Collect information" ? (
              stepFields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-interactive dark:text-gray-400">
                    No fields added yet. Click "Add Field" to get started.
                  </p>
                </div>
              ) : (
                <div className="relative">
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
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-white">
                  Only "Collect information" steps can have fields
                </p>
              </div>
            )}
          </div>
        </div>

        <AddFieldModal
          isOpen={isAddFieldOpen}
          onClose={() => setIsAddFieldOpen(false)}
          onAddField={async (field) => {
            console.log("🟩 StepConfigurationModal: onAddField wrapper", field);
            await onAddField({
              ...field,
              primary: field.primary ?? false,
            });
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
            onAddExistingField(step.id, numericFieldIds);
          }}
        />

        {editingField && (
          <EditFieldModal
            isOpen={!!editingField}
            onClose={() => setEditingField(null)}
            onSubmit={(updates) => {
              onUpdateField(updates);
              setEditingField(null);
            }}
            field={editingField}
            workflowObjects={[]}
            dataObjects={[]}
          />
        )}
      </div>
    </div>
  );
};

export default StepConfigurationModal;
