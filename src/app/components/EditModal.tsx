import React, { useEffect, useRef, useState } from "react";
import { StepType } from "../utils/stepTypes";
import { getAllStepTypes, getStepTypeDisplayName } from "../utils/stepTypes";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "stage" | "process" | "step";
  name: string;
  stepType?: StepType;
  onSubmit: (data: { name: string; type?: StepType; fields?: never[] }) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="absolute inset-0 modal-backdrop z-[80] modal-overlay"
        onClick={onClose}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90]"
        role="dialog"
      >
        {children}
      </div>
    </>
  );
};

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  type,
  name,
  stepType,
  onSubmit,
}) => {
  const [editedName, setEditedName] = useState(name);
  const [editedType, setEditedType] = useState<StepType>(
    stepType || "Collect information",
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;

    // If changing from "Collect information" to another type, submit with empty fields array
    if (
      type === "step" &&
      stepType === "Collect information" &&
      editedType !== "Collect information"
    ) {
      onSubmit({
        name: editedName.trim(),
        type: editedType,
        fields: [], // This will signal to the parent to remove all fields
      });
    } else {
      onSubmit({
        name: editedName.trim(),
        type: editedType,
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full modal-surface">
        <div className="p-6">
          <div className="lp-modal-header">
            <h3>
              Edit{" "}
              {type === "stage"
                ? "Stage"
                : type === "process"
                ? "Process"
                : "Step"}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-modal-form"
                className="interactive-button px-3"
              >
                Save
              </button>
            </div>
          </div>
          <form id="edit-modal-form" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  {type === "stage"
                    ? "Stage"
                    : type === "process"
                    ? "Process"
                    : "Step"}{" "}
                  Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder={`Enter ${type} name`}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60"
                />
              </div>

              {type === "step" && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Step Type
                  </label>
                  <select
                    value={editedType}
                    onChange={(e) => setEditedType(e.target.value as StepType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
                  >
                    {getAllStepTypes().map((type) => (
                      <option key={type} value={type}>
                        {getStepTypeDisplayName(type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default EditModal;
