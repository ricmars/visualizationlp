import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "../types";
import FieldsList from "./FieldsList";
import AddFieldModal from "./AddFieldModal";
import EditFieldModal from "./EditFieldModal";
import ModalPortal from "./ModalPortal";

interface ViewEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; model: any }) => void;
  initialData: {
    id: number;
    name: string;
    model: any;
    caseid: number;
  };
  isCollectInfoStep?: boolean;
  fields?: Field[];
}

const ViewEditModal: React.FC<ViewEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isCollectInfoStep = false,
  fields = [],
}) => {
  const [name, setName] = useState(initialData.name);
  const [model, setModel] = useState(initialData.model);
  const [error, setError] = useState<string | null>(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setModel(initialData.model);
      setError(null);
    }
  }, [isOpen, initialData]);

  // Get view fields for collect info steps
  const viewFields = React.useMemo(() => {
    if (!model?.fields) return [];

    return model.fields
      .map((fieldRef: { fieldId: number; required?: boolean }) => {
        const field = fields.find((f) => f.id === fieldRef.fieldId);
        if (!field) return null;
        return {
          ...field,
          required: fieldRef.required || false,
        };
      })
      .filter(
        (field: Field | null): field is Field & { required: boolean } =>
          field !== null,
      );
  }, [model, fields]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("View name is required");
      return;
    }

    onSubmit({ name: name.trim(), model });
    onClose();
  };

  const handleAddField = async () => {
    // For now, just close the modal - field management would need to be implemented
    setIsAddFieldOpen(false);
  };

  const handleUpdateField = () => {
    // For now, just close the modal - field management would need to be implemented
    setEditingField(null);
  };

  const handleDeleteField = () => {
    // For now, just close the modal - field management would need to be implemented
  };

  const handleReorderFields = () => {
    // For now, just close the modal - field management would need to be implemented
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-[80] modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[90] bg-[rgb(14,10,42)]"
            role="dialog"
          >
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-white">Edit View</h3>
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="btn-secondary px-3">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="interactive-button px-3"
                  >
                    Save
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    View Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter view name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60"
                  />
                </div>

                {viewFields.length > 0 ? (
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Fields Configuration
                    </label>
                    <div className="text-xs text-white/60 mb-2">
                      This view contains {viewFields.length} fields
                    </div>
                    <div className="bg-[rgb(20,16,60)] border border-gray-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <FieldsList
                        fields={viewFields}
                        onDeleteField={handleDeleteField}
                        onReorderFields={handleReorderFields}
                        onEditField={setEditingField}
                      />
                    </div>
                    {isCollectInfoStep && (
                      <div className="mt-2">
                        <button
                          onClick={() => setIsAddFieldOpen(true)}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add Field
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Fields Configuration
                    </label>
                    <div className="text-xs text-white/60 mb-2">
                      This view contains 0 fields
                    </div>
                    <div className="bg-[rgb(20,16,60)] border border-gray-600 rounded-lg p-3 text-center">
                      <p className="text-sm text-white/60">
                        No fields added yet
                      </p>
                    </div>
                    {isCollectInfoStep && (
                      <div className="mt-2">
                        <button
                          onClick={() => setIsAddFieldOpen(true)}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Add Field
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Field Management Modals */}
      <ModalPortal isOpen={isAddFieldOpen}>
        <AddFieldModal
          isOpen={isAddFieldOpen}
          onClose={() => setIsAddFieldOpen(false)}
          onAddField={handleAddField}
          allowExistingFields={true}
        />
      </ModalPortal>

      <ModalPortal isOpen={!!editingField}>
        {editingField && (
          <EditFieldModal
            isOpen={!!editingField}
            onClose={() => setEditingField(null)}
            onSubmit={handleUpdateField}
            field={editingField}
          />
        )}
      </ModalPortal>
    </AnimatePresence>
  );
};

export default ViewEditModal;
