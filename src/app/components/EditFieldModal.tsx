import React, { useState, useEffect, useRef } from "react";
import { DB_TABLES } from "../types/database";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "../types";
import Tooltip from "./Tooltip";
import { getAllFieldTypes, getFieldTypeDisplayName } from "../utils/fieldTypes";

interface EditFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: Partial<Field>) => void;
  field: Field;
  workflowObjects?: Array<{ id: number; name: string }>;
  dataObjects?: Array<{ id: number; name: string }>;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  field,
  workflowObjects = [],
  dataObjects = [],
}) => {
  const [label, setLabel] = useState(field.label);
  const [type, setType] = useState(field.type);
  const [isPrimary, setIsPrimary] = useState(field.primary || false);
  const [isRequired, setIsRequired] = useState(field.required || false);
  const [options, setOptions] = useState("");
  const [sampleValue, setSampleValue] = useState<string>("");
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const [refGroup, setRefGroup] = useState<"workflow" | "data" | null>(null);
  const [refObjectId, setRefObjectId] = useState<number | null>(null);
  const [resolvedWorkflowObjects, setResolvedWorkflowObjects] = useState<
    Array<{ id: number; name: string }>
  >(workflowObjects || []);
  const [resolvedDataObjects, setResolvedDataObjects] = useState<
    Array<{ id: number; name: string }>
  >(dataObjects || []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        labelInputRef.current?.focus();
      }, 100);
      // Set initial values when modal opens
      setLabel(field.label);
      setType(field.type);
      setIsPrimary(field.primary || false);
      setIsRequired(field.required || false);
      // Parse options from field.options (could be string or array)
      const parsedOptions = field.options
        ? Array.isArray(field.options)
          ? field.options
          : (() => {
              try {
                return JSON.parse(field.options);
              } catch {
                return [];
              }
            })()
        : [];
      setOptions(parsedOptions.join(", "));
      // Initialize sample value as string for editing
      const dv: any = (field as any).sampleValue;
      if (dv === null || dv === undefined) {
        setSampleValue("");
      } else if (typeof dv === "string") {
        setSampleValue(dv);
      } else {
        try {
          setSampleValue(JSON.stringify(dv));
        } catch {
          setSampleValue(String(dv));
        }
      }
      // Initialize reference state from field.type and field.refObjectId
      const isCaseRef =
        field.type === "CaseReferenceSingle" ||
        field.type === "CaseReferenceMulti";
      const isDataRef =
        field.type === "DataReferenceSingle" ||
        field.type === "DataReferenceMulti";
      if (isCaseRef || isDataRef) {
        setRefGroup(isCaseRef ? "workflow" : "data");
        if (typeof field.refObjectId === "number") {
          setRefObjectId(field.refObjectId);
        } else {
          setRefObjectId(null);
        }
      } else {
        setRefGroup(null);
        setRefObjectId(null);
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, field]);

  // Autoload reference target lists when not provided
  useEffect(() => {
    if (!isOpen) return;
    const needsWorkflow =
      !resolvedWorkflowObjects || resolvedWorkflowObjects.length === 0;
    const needsData = !resolvedDataObjects || resolvedDataObjects.length === 0;
    if (!needsWorkflow && !needsData) return;
    const load = async () => {
      try {
        const objRes = await fetch(
          `/api/database?table=${DB_TABLES.OBJECTS}&id=${
            (field as any)?.objectid
          }`,
        );
        const objJson = await objRes.json();
        const appId: number | undefined = objJson?.data?.applicationid;
        if (typeof appId === "number") {
          if (needsWorkflow) {
            try {
              const wfRes = await fetch(
                `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${appId}&hasWorkflow=true`,
              );
              const wfJson = await wfRes.json();
              const list =
                (wfJson?.data as Array<{ id: number; name: string }>) || [];
              setResolvedWorkflowObjects(
                list.map((w) => ({ id: w.id, name: (w as any).name })),
              );
            } catch {}
          }
          if (needsData) {
            try {
              const doRes = await fetch(
                `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${appId}&hasWorkflow=false`,
              );
              const doJson = await doRes.json();
              const list =
                (doJson?.data as Array<{ id: number; name: string }>) || [];
              setResolvedDataObjects(
                list.map((d) => ({ id: d.id, name: (d as any).name })),
              );
            } catch {}
          }
        }
      } catch {}
    };
    void load();
    // Only run on open or when the lists are empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = () => {
    if (!label.trim()) {
      setError("Field label is required");
      return;
    }
    const parsedOptions = options.trim()
      ? options
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
      : [];
    const finalOptions = [...parsedOptions];
    onSubmit({
      name: field.name,
      label: label.trim(),
      type,
      primary: isPrimary,
      required: isRequired,
      options: finalOptions,
      sampleValue: sampleValue,
      refObjectId: refObjectId ?? undefined,
      refMultiplicity:
        refGroup && refObjectId
          ? type === "CaseReferenceMulti" || type === "DataReferenceMulti"
            ? "multi"
            : "single"
          : undefined,
    });
    setError("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop z-[120] modal-overlay"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[130] modal-surface min-w-[450px]"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            <div className="space-y-4 p-6">
              <div className="lp-modal-header">
                <h3 className="text-lg font-semibold text-white">Edit Field</h3>
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
                  <label className="block text-sm font-medium text-white mb-1">
                    Field Label
                  </label>
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Enter field label"
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Field Type
                  </label>
                  {(() => {
                    const referenceTypes = new Set([
                      "DataReferenceSingle",
                      "DataReferenceMulti",
                      "CaseReferenceSingle",
                      "CaseReferenceMulti",
                    ] as const);
                    const standardTypes = getAllFieldTypes().filter(
                      (t) => !(referenceTypes as any).has(t as any),
                    );
                    const selectValue = refGroup
                      ? `${refGroup}:${refObjectId ?? ""}`
                      : (type as string);
                    const handleTypeChange = (
                      e: React.ChangeEvent<HTMLSelectElement>,
                    ) => {
                      const value = e.target.value;
                      if (
                        value.startsWith("workflow:") ||
                        value.startsWith("data:")
                      ) {
                        const [grp, idStr] = value.split(":");
                        const pickedId = parseInt(idStr || "", 10);
                        const group = (
                          grp === "workflow" ? "workflow" : "data"
                        ) as "workflow" | "data";
                        setRefGroup(group);
                        setRefObjectId(
                          Number.isNaN(pickedId) ? null : pickedId,
                        );
                        setType(
                          group === "workflow"
                            ? ("CaseReferenceSingle" as Field["type"])
                            : ("DataReferenceSingle" as Field["type"]),
                        );
                      } else {
                        setRefGroup(null);
                        setRefObjectId(null);
                        setType(value as Field["type"]);
                      }
                    };
                    return (
                      <select
                        value={selectValue}
                        onChange={handleTypeChange}
                        className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
                      >
                        <optgroup label="Standard">
                          {standardTypes.map((fieldType) => (
                            <option key={fieldType} value={fieldType}>
                              {getFieldTypeDisplayName(fieldType as any)}
                            </option>
                          ))}
                        </optgroup>
                        {resolvedWorkflowObjects.length > 0 && (
                          <optgroup label="Workflow">
                            {resolvedWorkflowObjects.map((o) => (
                              <option
                                key={`workflow:${o.id}`}
                                value={`workflow:${o.id}`}
                              >
                                {o.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {resolvedDataObjects.length > 0 && (
                          <optgroup label="Data">
                            {resolvedDataObjects.map((o) => (
                              <option
                                key={`data:${o.id}`}
                                value={`data:${o.id}`}
                              >
                                {o.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    );
                  })()}
                </div>

                {refGroup && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Cardinality
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-white">
                        <input
                          type="radio"
                          name="edit-ref-cardinality"
                          checked={
                            (refGroup === "workflow" &&
                              type === "CaseReferenceSingle") ||
                            (refGroup === "data" &&
                              type === "DataReferenceSingle")
                          }
                          onChange={() =>
                            setType(
                              refGroup === "workflow"
                                ? ("CaseReferenceSingle" as Field["type"])
                                : ("DataReferenceSingle" as Field["type"]),
                            )
                          }
                          className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        Single (default)
                      </label>
                      <label className="inline-flex items-center gap-2 text-white">
                        <input
                          type="radio"
                          name="edit-ref-cardinality"
                          checked={
                            (refGroup === "workflow" &&
                              type === "CaseReferenceMulti") ||
                            (refGroup === "data" &&
                              type === "DataReferenceMulti")
                          }
                          onChange={() =>
                            setType(
                              refGroup === "workflow"
                                ? ("CaseReferenceMulti" as Field["type"])
                                : ("DataReferenceMulti" as Field["type"]),
                            )
                          }
                          className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                        Multiple
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm text-white">
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="isRequired" className="text-sm text-white">
                    Required Field
                  </label>
                  <Tooltip content="Required fields must be filled out before proceeding">
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
              </div>

              <div className="mt-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditFieldModal;
