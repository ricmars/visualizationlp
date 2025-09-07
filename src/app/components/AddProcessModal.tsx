import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import StandardModal from "./StandardModal";

interface AddProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProcess: (processData: { name: string }) => void;
  children?: React.ReactNode;
}

const AddProcessModal: React.FC<AddProcessModalProps> = ({
  isOpen,
  onClose,
  onAddProcess,
  children,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError("Process name is required");
      return;
    }

    onAddProcess({ name: name.trim() });
    onClose();
  }, [name, onAddProcess, onClose]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Add Process"
      width="w-full"
      zIndex="z-[90]"
      onKeyDownAction={handleKeyDown}
      actions={actions}
    >
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="processName"
            className="block text-sm font-medium text-white mb-1"
          >
            Process Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            id="processName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60 transition-colors"
            placeholder="Enter process name"
          />
        </div>

        {children}
      </div>
    </StandardModal>
  );
};

export default AddProcessModal;
