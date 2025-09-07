"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Field } from "../../../types/types";
import AddFieldModal from "@/app/components/AddFieldModal";
import FieldsList from "@/app/components/FieldsList";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import RecordsPanel from "./RecordsPanel";

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  isEmbedded?: boolean;
  model?: any;
};

type DataPanelProps = {
  dataObjects: DataObject[];
  fields: Field[];
  selectedId?: number | null;
  workflowObjects?: Array<{ id: number; name: string }>;
  onAddNewFieldAndAttachAction: (
    dataObjectId: number,
    field: {
      label: string;
      type: Field["type"];
      options?: string[];
      required?: boolean;
      primary?: boolean;
      sampleValue?: string;
      refObjectId?: number;
      refMultiplicity?: "single" | "multi";
    },
  ) => Promise<void>;
  onRemoveFieldFromDataObjectAction: (
    dataObjectId: number,
    field: Field,
  ) => void;
  onReorderFieldsInDataObjectAction: (
    dataObjectId: number,
    fieldIds: number[],
  ) => void;
};

export default function DataPanel({
  dataObjects,
  fields,
  selectedId,
  workflowObjects = [],
  onAddNewFieldAndAttachAction,
  onRemoveFieldFromDataObjectAction,
  onReorderFieldsInDataObjectAction,
}: DataPanelProps) {
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [fieldPendingDelete, setFieldPendingDelete] = useState<Field | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"fields" | "records">("fields");
  const addFieldButtonRef = useRef<HTMLButtonElement>(null);

  const selectedDataObject = useMemo(
    () =>
      dataObjects.find((d) => d.id === (selectedId as number | null)) || null,
    [dataObjects, selectedId],
  );

  const selectedFields: Field[] = useMemo(() => {
    if (!selectedDataObject) return [];
    const ownFields = (fields as any[]).filter(
      (f) => (f as any)?.objectid === selectedDataObject.id,
    );
    return ownFields.sort(
      (a, b) => ((a as any)?.order || 0) - ((b as any)?.order || 0),
    ) as Field[];
  }, [selectedDataObject, fields]);

  const handleDeleteField = (field: Field) => {
    setFieldPendingDelete(field);
  };

  const handleFieldsReorder = (startIndex: number, endIndex: number) => {
    if (!selectedDataObject) return;
    const currentFieldIds = selectedFields
      .map((f) => f.id)
      .filter((id): id is number => typeof id === "number");
    const reordered = Array.from(currentFieldIds);
    const [removed] = reordered.splice(startIndex, 1);
    reordered.splice(endIndex, 0, removed);
    onReorderFieldsInDataObjectAction(selectedDataObject.id, reordered);
  };

  return (
    <div className="h-full flex flex-col">
      {selectedDataObject ? (
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab("fields")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "fields"
                  ? "text-white border-b-2 border-blue-400"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Fields
            </button>
            <button
              onClick={() => setActiveTab("records")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "records"
                  ? "text-white border-b-2 border-blue-400"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Records
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "fields" ? (
              <div className="h-full p-4 overflow-y-auto">
                <div className="flex items-center justify-end mb-4">
                  <motion.button
                    ref={addFieldButtonRef}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAddFieldOpen(true)}
                    className="interactive-button"
                    aria-label="Add Field"
                  >
                    Add Field
                  </motion.button>
                </div>

                {selectedFields.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-interactive dark:text-gray-400">
                      No fields added yet. Click "Add Field" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <FieldsList
                      fields={selectedFields}
                      onDeleteField={handleDeleteField}
                      onEditField={(field) => {
                        const event = new CustomEvent("edit-field", {
                          detail: { field },
                        });
                        window.dispatchEvent(event);
                      }}
                      onReorderFields={handleFieldsReorder}
                    />
                  </div>
                )}
              </div>
            ) : (
              <RecordsPanel
                selectedDataObject={selectedDataObject}
                fields={selectedFields}
                onRefreshAction={() => {
                  // Refresh logic if needed
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="h-full p-4 flex items-center justify-center">
          <div className="text-center text-interactive dark:text-gray-400">
            Select a data object to see its fields and records
          </div>
        </div>
      )}

      {/* Add Field Modal (new-only) */}
      <AddFieldModal
        isOpen={isAddFieldOpen}
        onClose={() => setIsAddFieldOpen(false)}
        onAddField={async (field) => {
          if (!selectedDataObject) return;
          await onAddNewFieldAndAttachAction(selectedDataObject.id, field);
        }}
        buttonRef={addFieldButtonRef as React.RefObject<HTMLButtonElement>}
        existingFields={[]}
        stepFieldIds={[]}
        allowExistingFields={false}
        workflowObjects={workflowObjects}
        dataObjects={dataObjects.map((d) => ({
          id: d.id,
          name: d.name,
          isEmbedded: d.isEmbedded,
        }))}
      />
      <ConfirmDeleteModal
        isOpen={!!fieldPendingDelete}
        title="Remove field from data object"
        message={
          fieldPendingDelete
            ? `Are you sure you want to remove "${
                fieldPendingDelete.label || fieldPendingDelete.name
              }" from this data object?`
            : ""
        }
        confirmLabel="Remove"
        onCancel={() => setFieldPendingDelete(null)}
        onConfirm={async () => {
          if (!selectedDataObject || !fieldPendingDelete) return;
          onRemoveFieldFromDataObjectAction(
            selectedDataObject.id,
            fieldPendingDelete,
          );
          setFieldPendingDelete(null);
        }}
      />
    </div>
  );
}
