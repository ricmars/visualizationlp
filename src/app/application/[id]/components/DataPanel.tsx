"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Field } from "../../../types";
import AddFieldModal from "@/app/components/AddFieldModal";
import FieldsList from "@/app/components/FieldsList";
import { FaTrash, FaPencilAlt } from "react-icons/fa";

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  model?: any;
};

type DataPanelProps = {
  dataObjects: DataObject[];
  fields: Field[];
  selectedId?: number | null;
  onSelectDataObjectAction?: (id: number) => void;
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
  onEditDataObjectAction: (id: number) => void;
  onDeleteDataObjectAction: (id: number) => void | Promise<void>;
};

export default function DataPanel({
  dataObjects,
  fields,
  selectedId,
  onSelectDataObjectAction,
  workflowObjects = [],
  onAddNewFieldAndAttachAction,
  onRemoveFieldFromDataObjectAction,
  onReorderFieldsInDataObjectAction,
  onEditDataObjectAction,
  onDeleteDataObjectAction,
}: DataPanelProps) {
  const [selectedDataObjectId, setSelectedDataObjectId] = useState<
    number | null
  >(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const addFieldButtonRef = useRef<HTMLButtonElement>(null);

  // Keep internal selection in sync with external selection
  React.useEffect(() => {
    if (typeof selectedId === "number" || selectedId === null) {
      setSelectedDataObjectId(selectedId ?? null);
    }
  }, [selectedId]);

  const selectedDataObject = useMemo(
    () => dataObjects.find((d) => d.id === selectedDataObjectId) || null,
    [dataObjects, selectedDataObjectId],
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
    if (!selectedDataObject) return;
    onRemoveFieldFromDataObjectAction(selectedDataObject.id, field);
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
    <div className="flex h-full">
      {/* Left list */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <div className="space-y-2">
            {dataObjects.map((d) => (
              <div
                key={d.id}
                className={`w-full px-4 py-3 rounded-lg transition-colors border ${
                  selectedDataObjectId === d.id
                    ? "border-white bg-[rgb(20,16,60)] text-white"
                    : "border-transparent hover:bg-[rgb(20,16,60)] hover:text-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedDataObjectId(d.id);
                      onSelectDataObjectAction &&
                        onSelectDataObjectAction(d.id);
                    }}
                    className="text-left flex-1"
                  >
                    <div className="font-medium">{d.name}</div>
                    <div className="text-sm opacity-80">{d.description}</div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit data object"
                      onClick={() => onEditDataObjectAction(d.id)}
                      className="btn-secondary w-8"
                    >
                      <FaPencilAlt className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete data object"
                      onClick={() => void onDeleteDataObjectAction(d.id)}
                      className="btn-secondary w-8"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right detail: fields */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedDataObject ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{selectedDataObject.name}</h3>
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
          <div className="text-center text-interactive dark:text-gray-400 mt-8">
            Select a data object to see its fields
          </div>
        )}
      </div>

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
        dataObjects={dataObjects.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
