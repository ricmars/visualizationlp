import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface EditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  onDelete?: () => Promise<void> | void;
  initialData: {
    name: string;
    description: string;
  };
}

const EditWorkflowModal: React.FC<EditWorkflowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
}) => {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Workflow name is required");
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop z-40 modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-50 modal-surface"
          >
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3>Edit Workflow</h3>
                <div className="flex items-center gap-2">
                  {onDelete && (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="btn-secondary px-3"
                    >
                      Delete
                    </button>
                  )}
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
                  <label
                    htmlFor="workflowName"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    id="workflowName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
                    placeholder="Enter workflow name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="workflowDescription"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="workflowDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
                    placeholder="Enter workflow description"
                  />
                </div>

                <div className="pt-2" />
              </div>
            </div>
          </motion.div>
          <ConfirmDeleteModal
            isOpen={isConfirmingDelete}
            title="Delete workflow"
            message={`Are you sure you want to delete "${name}"? This will permanently remove the workflow, all fields, views, and checkpoints for this case.`}
            onCancel={() => setIsConfirmingDelete(false)}
            onConfirm={async () => {
              if (!onDelete) return;
              await onDelete();
              setIsConfirmingDelete(false);
              onClose();
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default EditWorkflowModal;
