import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  initialData: {
    name: string;
    description: string;
  };
}

const EditApplicationModal: React.FC<EditApplicationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Application name is required");
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
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-50 modal-surface"
          >
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Edit Application
                </h3>
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
                  <label
                    htmlFor="applicationName"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Application Name
                  </label>
                  <input
                    type="text"
                    id="applicationName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="lp-input w-full"
                    placeholder="Enter application name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="applicationDescription"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="applicationDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="lp-input w-full"
                    placeholder="Enter application description"
                  />
                </div>

                <div className="pt-2" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditApplicationModal;
