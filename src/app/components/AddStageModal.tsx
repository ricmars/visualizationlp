import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import StandardModal from "./StandardModal";

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
      // Focus the input after modal opens
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Add New Stage"
      actions={actions}
      width="w-full max-w-md"
    >
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="stageName"
            className="block text-sm font-medium text-white mb-1"
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
    </StandardModal>
  );
};

export default AddStageModal;
