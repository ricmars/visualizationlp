"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Field } from "../../../types";
import { DB_TABLES } from "../../../types/database";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import ModalPortal from "../../../components/ModalPortal";
import AddRecordModal from "./AddRecordModal";
import EditRecordModal from "./EditRecordModal";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  model?: any;
};

type ObjectRecord = {
  id: number;
  objectid: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type RecordsPanelProps = {
  selectedDataObject: DataObject | null;
  fields: Field[];
  onRefreshAction?: () => void;
};

export default function RecordsPanel({
  selectedDataObject,
  fields,
  onRefreshAction,
}: RecordsPanelProps) {
  const [records, setRecords] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ObjectRecord | null>(null);
  const [recordPendingDelete, setRecordPendingDelete] =
    useState<ObjectRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!selectedDataObject) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECT_RECORDS}&objectid=${selectedDataObject.id}`,
      );
      if (response.ok) {
        const result = await response.json();
        setRecords(result.data || []);
      } else {
        console.error("Failed to fetch records");
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDataObject]);

  // Fetch records when selectedDataObject changes
  useEffect(() => {
    if (selectedDataObject) {
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [selectedDataObject, fetchRecords]);

  const handleAddRecord = async (data: Record<string, unknown>) => {
    if (!selectedDataObject) return;

    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECT_RECORDS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectid: selectedDataObject.id,
            data: data,
          }),
        },
      );

      if (response.ok) {
        await fetchRecords();
        setIsAddRecordOpen(false);
        onRefreshAction?.();
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to create record: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error creating record:", error);
      alert("Failed to create record. Please try again.");
    }
  };

  const handleEditRecord = async (
    recordId: number,
    data: Record<string, unknown>,
  ) => {
    if (!selectedDataObject) return;

    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECT_RECORDS}&id=${recordId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: recordId,
            objectid: selectedDataObject.id,
            data: data,
          }),
        },
      );

      if (response.ok) {
        await fetchRecords();
        setEditingRecord(null);
        onRefreshAction?.();
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to update record: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error updating record:", error);
      alert("Failed to update record. Please try again.");
    }
  };

  const handleDeleteRecord = async (record: ObjectRecord) => {
    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECT_RECORDS}&id=${record.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await fetchRecords();
        setRecordPendingDelete(null);
        onRefreshAction?.();
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete record: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  // Sort fields by order for consistent column display
  const sortedFields = useMemo(() => {
    return [...fields].sort(
      (a, b) => ((a as any)?.order || 0) - ((b as any)?.order || 0),
    );
  }, [fields]);

  if (!selectedDataObject) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center text-white/60">
          <p>Select a data object to view its records</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center text-white/60">
          <p>Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Records for {selectedDataObject.name}
        </h3>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddRecordOpen(true)}
          className="interactive-button flex items-center gap-2"
          aria-label="Add Record"
        >
          <FaPlus className="w-4 h-4" />
          Add Record
        </motion.button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-white/60">
            No records found. Click "Add Record" to create the first record.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-[rgb(14,10,42)] text-white">
            <thead>
              <tr className="border-b border-white/20">
                {sortedFields.map((field) => (
                  <th
                    key={field.id}
                    className="px-4 py-3 text-left text-sm font-medium text-white/80 border-r border-white/10 last:border-r-0"
                  >
                    {field.label || field.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-sm font-medium text-white/80">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors"
                >
                  {sortedFields.map((field) => (
                    <td
                      key={field.id}
                      className="px-4 py-3 text-sm border-r border-white/10 last:border-r-0"
                    >
                      {renderFieldValue(record.data[field.name], field)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                        aria-label="Edit record"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRecordPendingDelete(record)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        aria-label="Delete record"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Record Modal */}
      <ModalPortal isOpen={isAddRecordOpen}>
        <AddRecordModal
          isOpen={isAddRecordOpen}
          onClose={() => setIsAddRecordOpen(false)}
          fields={sortedFields}
          onSave={handleAddRecord}
        />
      </ModalPortal>

      {/* Edit Record Modal */}
      <ModalPortal isOpen={!!editingRecord}>
        {editingRecord && (
          <EditRecordModal
            isOpen={!!editingRecord}
            onClose={() => setEditingRecord(null)}
            fields={sortedFields}
            record={editingRecord}
            onSave={(data: Record<string, any>) =>
              handleEditRecord(editingRecord.id, data)
            }
          />
        )}
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ModalPortal isOpen={!!recordPendingDelete}>
        <ConfirmDeleteModal
          isOpen={!!recordPendingDelete}
          title="Delete Record"
          message={
            recordPendingDelete
              ? "Are you sure you want to delete this record? This action cannot be undone."
              : ""
          }
          confirmLabel="Delete"
          onCancel={() => setRecordPendingDelete(null)}
          onConfirm={() => {
            if (recordPendingDelete) {
              handleDeleteRecord(recordPendingDelete);
            }
          }}
        />
      </ModalPortal>
    </div>
  );
}

// Helper function to render field values based on field type
function renderFieldValue(value: any, field: Field): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-white/40">—</span>;
  }

  switch (field.type) {
    case "Date":
      try {
        const date = new Date(value);
        return <span>{date.toLocaleDateString()}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }

    case "DateTime":
      try {
        const date = new Date(value);
        return <span>{date.toLocaleString()}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }

    case "Integer":
    case "Currency":
    case "Decimal":
      return <span>{Number(value).toLocaleString()}</span>;

    case "Text":
    case "TextArea":
    case "Email":
    case "Phone":
      return <span className="truncate max-w-xs block">{String(value)}</span>;

    case "Dropdown":
    case "RadioButtons":
      return <span>{String(value)}</span>;

    case "Checkbox":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs"
              >
                {String(item)}
              </span>
            ))}
          </div>
        );
      }
      return <span>{String(value)}</span>;

    // Reference field types
    case "CaseReferenceSingle":
    case "DataReferenceSingle":
      if (typeof value === "object" && value !== null) {
        return <span>{value.name || value.id || "Unknown"}</span>;
      }
      return <span>{String(value)}</span>;

    case "CaseReferenceMulti":
    case "DataReferenceMulti":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs"
              >
                {typeof item === "object" && item !== null
                  ? item.name || item.id
                  : String(item)}
              </span>
            ))}
          </div>
        );
      }
      return <span>{String(value)}</span>;

    default:
      return <span>{String(value)}</span>;
  }
}
