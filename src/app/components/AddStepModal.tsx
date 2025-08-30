import React, { useState } from "react";
import { StepType } from "../utils/stepTypes";
import { motion, AnimatePresence } from "framer-motion";
import { getAllStepTypes, getStepTypeDisplayName } from "../utils/stepTypes";

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

  const handleSubmit = () => {
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
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[90] modal-surface min-w-[450px]"
            role="dialog"
          >
            <div className="space-y-4 p-6">
              <div className="lp-modal-header">
                <h3 className="text-lg font-semibold text-white">
                  Add New Step
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="btn-secondary px-3"
                    aria-label="Cancel"
                  >
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
                    htmlFor="stepName"
                    className="block text-sm font-medium text-white mb-1"
                  >
                    Step Name
                  </label>
                  <input
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddStepModal;
