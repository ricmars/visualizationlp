import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStage: (stageData: { name: string }) => void;
  children?: React.ReactNode;
}

const AddStageModal: React.FC<AddStageModalProps> = ({
  isOpen,
  onClose,
  onAddStage,
  children,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError("Stage name is required");
      return;
    }

    onAddStage({ name: name.trim() });
    onClose();
  }, [name, onAddStage, onClose]);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      nameInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalRef.current || !isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Tab") {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSubmit]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop z-[80] modal-overlay"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[90] modal-surface min-w-[450px]"
            tabIndex={-1}
            role="dialog"
          >
            <div className="space-y-4 p-6">
              <div className="lp-modal-header">
                <h3 className="text-lg font-semibold text-white">
                  Add New Stage
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
                    htmlFor="stageName"
                    className="block text-sm font-medium text-white mb-1 mb-1"
                  >
                    Stage Name
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="stageName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60 transition-colors"
                    placeholder="Enter stage name"
                  />
                </div>

                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddStageModal;
