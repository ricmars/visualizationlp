import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "../types";
import Tooltip from "./Tooltip";
import { getAllFieldTypes, getFieldTypeDisplayName } from "../utils/fieldTypes";
import ModalPortal from "./ModalPortal";

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddField: (field: {
    label: string;
    type: Field["type"];
    options?: string[];
    required: boolean;
    primary?: boolean;
    sampleValue: string;
  }) => Promise<void>;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  existingFields?: Field[];
  stepFieldIds?: string[];
  onAddExistingField?: (fieldIds: string[]) => void;
  allowExistingFields?: boolean;
}

const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  onClose,
  onAddField,
  existingFields = [],
  stepFieldIds = [],
  onAddExistingField,
  allowExistingFields = true,
}) => {
  const [mode, setMode] = useState<"new" | "existing">(
    allowExistingFields ? "existing" : "new",
  );
  const [label, setLabel] = useState("");
  const [type, setType] = useState<Field["type"]>("Text");
  const [required, setRequired] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [options, setOptions] = useState("");
  const [sampleValue, setSampleValue] = useState<string>("");
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Filter out fields that are already in the step
  const availableFields = existingFields.filter(
    (field) => !stepFieldIds.includes(field.id?.toString() || ""),
  );

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => {
      if (mode === "new") {
        labelInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [isOpen, mode]);

  // Intentionally do NOT close on outside click. The popover should only
  // close via explicit actions (Cancel, Add, Close).
  useEffect(() => {
    return () => {};
  }, [isOpen]);

  const handleSubmit = async () => {
    if (mode === "existing") {
      console.log("🟦 AddFieldModal submit: existing", { selectedFieldIds });
      if (selectedFieldIds.length === 0) {
        setError("Please select at least one field");
        return;
      }
      if (onAddExistingField) {
        onAddExistingField(selectedFieldIds);
      }
    } else {
      console.log("🟩 AddFieldModal submit: new", {
        label,
        type,
        required,
        isPrimary,
        options,
        sampleValue,
      });
      if (!label.trim()) {
        setError("Label is required");
        return;
      }
      const parsedOptions = options.trim()
        ? options
            .split(",")
            .map((opt) => opt.trim())
            .filter((opt) => opt.length > 0)
        : [];
      await onAddField({
        label,
        type,
        required,
        primary: isPrimary,
        options: parsedOptions,
        sampleValue: sampleValue,
      });
    }
    setLabel("");
    setType("Text");
    setRequired(false);
    setIsPrimary(false);
    setOptions("");
    setSampleValue("");
    setSelectedFieldIds([]);
    setError("");
    onClose();
  };

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds((prev: string[]) =>
      prev.includes(fieldId)
        ? prev.filter((id: string) => id !== fieldId)
        : [...prev, fieldId],
    );
    setError("");
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal isOpen={isOpen}>
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
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-50 modal-surface min-w-[450px]"
              onKeyDown={handleKeyDown}
              tabIndex={-1}
            >
              <div className="p-4">
                <div className="space-y-4">
                  <div className="lp-modal-header">
                    <h3 className="text-lg font-semibold text-white">
                      Add Field
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={onClose} className="btn-secondary px-3">
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="interactive-button px-3"
                      >
                        {mode === "existing"
                          ? `Add Field${
                              selectedFieldIds.length !== 1 ? "s" : ""
                            } (${selectedFieldIds.length})`
                          : "Save"}
                      </button>
                    </div>
                  </div>

                  {allowExistingFields && (
                    <div className="flex gap-2 p-1 rounded-lg bg-[rgb(20,16,60)]">
                      <button
                        onClick={() => setMode("existing")}
                        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          mode === "existing"
                            ? "bg-modal text-white shadow-sm"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        Select Existing
                      </button>
                      <button
                        onClick={() => setMode("new")}
                        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          mode === "new"
                            ? "bg-modal text-white shadow-sm"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        Add New
                      </button>
                    </div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-sm text-red-500"
                    >
                      {error}
                    </motion.p>
                  )}

                  <div className="space-y-4">
                    {mode === "existing" ? (
                      <div>
                        {availableFields.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-interactive dark:text-gray-400">
                              No available fields to add.
                            </p>
                            <button
                              onClick={() => setMode("new")}
                              className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              Create a new field instead
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableFields
                              .sort((a, b) => a.label.localeCompare(b.label))
                              .map((field, index) => (
                                <label
                                  key={field.id?.toString() || index}
                                  className={`flex items-center p-3 rounded-lg border ${
                                    selectedFieldIds.includes(
                                      field.id?.toString() || "",
                                    )
                                      ? "border-white bg-[rgb(20,16,60)]"
                                      : "border-gray-700 hover:bg-[rgb(20,16,60)]"
                                  } cursor-pointer transition-colors`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFieldIds.includes(
                                      field.id?.toString() || "",
                                    )}
                                    onChange={() =>
                                      toggleFieldSelection(
                                        field.id?.toString() || "",
                                      )
                                    }
                                    className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {field.label}
                                    </div>
                                    <div className="text-sm text-white/70">
                                      Type:{" "}
                                      {getFieldTypeDisplayName(
                                        field.type as any,
                                      )}
                                    </div>
                                  </div>
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">
                            Label
                          </label>
                          <input
                            ref={labelInputRef}
                            type="text"
                            value={label}
                            onChange={(e) => {
                              setLabel(e.target.value);
                              setError("");
                            }}
                            className={`w-full px-3 py-2 rounded-lg border ${
                              error
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-600 focus:ring-blue-500"
                            } focus:outline-none focus:ring-2 bg-[rgb(20,16,60)] text-white transition-colors`}
                            placeholder="Enter field label"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-1">
                            Type
                          </label>
                          <select
                            value={type}
                            onChange={(e) =>
                              setType(e.target.value as Field["type"])
                            }
                            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
                          >
                            {getAllFieldTypes().map((fieldType) => (
                              <option key={fieldType} value={fieldType}>
                                {getFieldTypeDisplayName(fieldType as any)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="required"
                            checked={required}
                            onChange={(e) => setRequired(e.target.checked)}
                            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="required"
                            className="text-sm text-white"
                          >
                            Required
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isPrimary"
                            checked={isPrimary}
                            onChange={(e) => setIsPrimary(e.target.checked)}
                            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="isPrimary"
                            className="text-sm text-white"
                          >
                            Primary Field
                          </label>
                          <Tooltip content="Primary fields are used as identifiers and are displayed prominently in the workflow">
                            <span className="text-gray-400 hover:text-interactive cursor-help">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </span>
                          </Tooltip>
                        </div>

                        {(type === "Dropdown" ||
                          type === "RadioButtons" ||
                          type === "Status" ||
                          type === "ReferenceValues") && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-1">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={options}
                              onChange={(e) => setOptions(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-white mb-1">
                            Sample value
                          </label>
                          <input
                            type="text"
                            value={sampleValue}
                            onChange={(e) => setSampleValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
                            placeholder="Enter sample value"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};

export default AddFieldModal;
