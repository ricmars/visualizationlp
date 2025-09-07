import React, { useEffect, useRef, useState } from "react";
import { StepType } from "../utils/stepTypes";
import { getAllStepTypes, getStepTypeDisplayName } from "../utils/stepTypes";
import StandardModal from "./StandardModal";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "stage" | "process" | "step";
  name: string;
  stepType?: StepType;
  onSubmit: (data: { name: string; type?: StepType; fields?: never[] }) => void;
}

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

  const handleSubmit = () => {
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

  const getTitle = () => {
    const itemType =
      type === "stage" ? "Stage" : type === "process" ? "Process" : "Step";
    return `Edit ${itemType}`;
  };

  const getFieldLabel = () => {
    const itemType =
      type === "stage" ? "Stage" : type === "process" ? "Process" : "Step";
    return `${itemType} Name`;
  };

  const actions = [
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
      onClick: handleSubmit,
      disabled: !editedName.trim(),
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title={getTitle()}
      actions={actions}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            {getFieldLabel()}
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
    </StandardModal>
  );
};

export default EditModal;
