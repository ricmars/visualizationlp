import React, { useState, useRef, useEffect, useCallback } from "react";
import { StepType } from "../utils/stepTypes";
import { getAllStepTypes, getStepTypeDisplayName } from "../utils/stepTypes";
import StandardModal from "./StandardModal";

interface AddStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStep: (
    stageId: number,
    processId: number,
    stepName: string,
    stepType: StepType,
  ) => void;
  stageId: number;
  processId: number;
}

const AddStepModal: React.FC<AddStepModalProps> = ({
  isOpen,
  onClose,
  onAddStep,
  stageId,
  processId,
}) => {
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState<StepType>("Collect information");
  const [error, setError] = useState<string | null>(null);
  const stepNameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    console.log("AddStepModal handleSubmit:", { stepName, stepType });
    if (!stepName.trim()) {
      setError("Step name is required");
      return;
    }
    onAddStep(stageId, processId, stepName.trim(), stepType);
    setStepName("");
    setStepType("Collect information");
    setError(null);
    onClose();
  }, [stepName, stepType, stageId, processId, onAddStep, onClose]);

  useEffect(() => {
    if (isOpen) {
      setStepName("");
      setStepType("Collect information");
      setError(null);
      // Focus the input after modal opens
      setTimeout(() => {
        stepNameInputRef.current?.focus();
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
      title="Add New Step"
      width="w-full"
      zIndex="z-[90]"
      onKeyDownAction={handleKeyDown}
      actions={actions}
    >
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="stepName"
            className="block text-sm font-medium text-white mb-1"
          >
            Step Name
          </label>
          <input
            ref={stepNameInputRef}
            type="text"
            id="stepName"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white placeholder-white/60 transition-colors"
            placeholder="Enter step name"
          />
        </div>

        <div>
          <label
            htmlFor="stepType"
            className="block text-sm font-medium text-white mb-1"
          >
            Step Type
          </label>
          <select
            id="stepType"
            value={stepType}
            onChange={(e) => setStepType(e.target.value as StepType)}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
          >
            {getAllStepTypes().map((type) => (
              <option key={type} value={type}>
                {getStepTypeDisplayName(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2" />
      </div>
    </StandardModal>
  );
};

export default AddStepModal;
