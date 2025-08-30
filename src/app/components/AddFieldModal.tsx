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
  buttonRef,
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [maxHeightPx, setMaxHeightPx] = useState<number>(600);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter out fields that are already in the step
  const availableFields = existingFields.filter(
    (field) => !stepFieldIds.includes(field.id?.toString() || ""),
  );

  // Calculate position anchored to the trigger button, flip if needed, and clamp to main content area
  useEffect(() => {
    const computePosition = () => {
      if (!isOpen || !buttonRef?.current) return;
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const estimatedWidth = 450; // Match min width requirement
      const viewportPadding = 8;

      // Determine bounds using the main content container
      const container =
        document.getElementById("main-content-area") ||
        (document.querySelector("[data-main-content]") as HTMLElement | null);
      const containerRect = container
        ? container.getBoundingClientRect()
        : ({
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          } as any);

      // Adaptive max height based on container height
      const allowedMaxHeight = Math.max(
        240,
        containerRect.height - viewportPadding * 2,
      );
      setMaxHeightPx(allowedMaxHeight);

      // Horizontal placement relative to container
      const nextLeft = Math.min(
        Math.max(viewportPadding, buttonRect.left - containerRect.left),
        Math.max(
          viewportPadding,
          containerRect.width - estimatedWidth - viewportPadding,
        ),
      );

      // Vertical placement relative to container: prefer below; flip above if not enough space
      const overlayHeight =
        overlayRef.current?.offsetHeight || allowedMaxHeight;
      const spaceBelow =
        containerRect.height -
        (buttonRect.bottom - containerRect.top) -
        viewportPadding;
      let nextTop: number;
      if (
        overlayHeight > spaceBelow &&
        buttonRect.top - containerRect.top > spaceBelow
      ) {
        // Place above
        nextTop = Math.max(
          viewportPadding,
          buttonRect.top - containerRect.top - overlayHeight - viewportPadding,
        );
      } else {
        // Place below
        nextTop = buttonRect.bottom - containerRect.top + viewportPadding;
      }

      // Clamp to container bounds
      nextTop = Math.min(
        Math.max(viewportPadding, nextTop),
        containerRect.height - viewportPadding - overlayHeight,
      );

      setPosition({ top: nextTop, left: nextLeft });
    };

    // Compute now and once after render to account for measured height
    computePosition();
    const raf = requestAnimationFrame(computePosition);

    // Reposition on resize/scroll while open
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, true);
    // Focus after open
    const focusTimer = setTimeout(() => {
      if (mode === "new") {
        labelInputRef.current?.focus();
      }
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, true);
      clearTimeout(focusTimer);
    };
  }, [isOpen, buttonRef, mode]);

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
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: position.top,
              left: position.left,
              maxHeight: maxHeightPx,
            }}
            className="w-[450px] modal-surface rounded-lg shadow-xl border overflow-auto border-gray-700 z-[5000]"
            onKeyDown={handleKeyDown}
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

                <div className="flex gap-2 p-1 rounded-lg bg-[rgb(20,16,60)]">
                  {allowExistingFields && (
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
                  )}
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
                                    {getFieldTypeDisplayName(field.type as any)}
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
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};

export default AddFieldModal;
