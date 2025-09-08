import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Tooltip from "./Tooltip";
import { Field } from "../types/types";
import { getAllFieldTypes, getFieldTypeDisplayName } from "../utils/fieldTypes";
import FieldRow from "./FieldRow";
import { DB_TABLES } from "../types/database";
import StandardModal from "./StandardModal";

export type FieldModalMode = "add" | "edit";

interface FieldModalProps {
  isOpen: boolean;
  mode: FieldModalMode;
  title?: string;
  onClose: () => void;

  // Add mode specific
  allowExistingFields?: boolean;
  existingFields?: Field[];
  stepFieldIds?: string[];
  onAddExistingField?: (fieldIds: string[]) => void;
  onSubmitAdd?: (field: {
    label: string;
    type: Field["type"];
    options?: string[];
    required: boolean;
    primary?: boolean;
    sampleValue: string;
    refObjectId?: number;
    refMultiplicity?: "single" | "multi";
  }) => Promise<void>;

  // Edit mode specific
  initialField?: Field;
  onSubmitEdit?: (updates: Partial<Field>) => void;

  // Reference targets
  workflowObjects?: Array<{ id: number; name: string; isEmbedded?: boolean }>;
  dataObjects?: Array<{ id: number; name: string; isEmbedded?: boolean }>;

  // Render behavior
  usePortal?: boolean;
}

const FieldModal: React.FC<FieldModalProps> = ({
  isOpen,
  mode,
  title,
  onClose,
  allowExistingFields = false,
  existingFields = [],
  stepFieldIds = [],
  onAddExistingField,
  onSubmitAdd,
  initialField,
  onSubmitEdit,
  workflowObjects = [],
  dataObjects = [],
  usePortal = true,
}) => {
  const [addMode, setAddMode] = useState<"new" | "existing">(
    allowExistingFields ? "existing" : "new",
  );

  const [label, setLabel] = useState<string>(initialField?.label || "");
  const [type, setType] = useState<Field["type"]>(
    (initialField?.type as Field["type"]) || ("Text" as Field["type"]),
  );
  const [required, setRequired] = useState<boolean>(!!initialField?.required);
  const [isPrimary, setIsPrimary] = useState<boolean>(!!initialField?.primary);
  const [options, setOptions] = useState<string>("");
  const [sampleValue, setSampleValue] = useState<string>("");
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Reference selection state and target lists
  const [refGroup, setRefGroup] = useState<"workflow" | "data" | null>(null);
  const [refObjectId, setRefObjectId] = useState<number | null>(null);
  const [resolvedWorkflowObjects, setResolvedWorkflowObjects] = useState<
    Array<{ id: number; name: string; isEmbedded?: boolean }>
  >(workflowObjects || []);
  const [resolvedDataObjects, setResolvedDataObjects] = useState<
    Array<{ id: number; name: string; isEmbedded?: boolean }>
  >(dataObjects || []);

  const workflowIdToName = useMemo(() => {
    const map = new Map<number, string>();
    (resolvedWorkflowObjects || []).forEach((o) => map.set(o.id, o.name));
    return map;
  }, [resolvedWorkflowObjects]);
  const dataIdToName = useMemo(() => {
    const map = new Map<number, string>();
    (resolvedDataObjects || []).forEach((o) => map.set(o.id, o.name));
    return map;
  }, [resolvedDataObjects]);

  // Filter out fields that are already in the step/view
  const availableFields = useMemo(() => {
    return (existingFields || []).filter(
      (field) => !stepFieldIds.includes(field.id?.toString() || ""),
    );
  }, [existingFields, stepFieldIds]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (mode === "add" && addMode === "new") {
        labelInputRef.current?.focus();
      }
      if (mode === "edit") {
        labelInputRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, mode, addMode]);

  // Initialize edit-specific state on open
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && initialField) {
      setLabel(initialField.label);
      setType(initialField.type as Field["type"]);
      setIsPrimary(initialField.primary || false);
      setRequired(initialField.required || false);
      // Parse options from field.options (string or array)
      const parsedOptions = initialField.options
        ? Array.isArray(initialField.options)
          ? initialField.options
          : (() => {
              try {
                return JSON.parse(initialField.options);
              } catch {
                return [] as string[];
              }
            })()
        : [];
      setOptions(parsedOptions.join(", "));

      const dv: any = (initialField as any).sampleValue;
      if (dv === null || dv === undefined) setSampleValue("");
      else if (typeof dv === "string") setSampleValue(dv);
      else {
        try {
          setSampleValue(JSON.stringify(dv));
        } catch {
          setSampleValue(String(dv));
        }
      }

      const isCaseRef =
        initialField.type === "CaseReferenceSingle" ||
        initialField.type === "CaseReferenceMulti";
      const isDataRef =
        initialField.type === "DataReferenceSingle" ||
        initialField.type === "DataReferenceMulti";
      const isEmbedCase =
        initialField.type === "EmbedDataSingle" ||
        initialField.type === "EmbedDataMulti";
      if (isCaseRef || isDataRef || isEmbedCase) {
        setRefGroup(isCaseRef ? "workflow" : "data");
        if (typeof initialField.refObjectId === "number") {
          setRefObjectId(initialField.refObjectId);
        } else {
          setRefObjectId(null);
        }
        // Keep the actual field type for reference/embedded fields
        setType(initialField.type as Field["type"]);
      } else {
        setRefGroup(null);
        setRefObjectId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Autoload reference target lists in edit mode when not provided
  useEffect(() => {
    if (!isOpen || mode !== "edit" || !initialField) return;
    const needsWorkflow =
      !resolvedWorkflowObjects || resolvedWorkflowObjects.length === 0;
    const needsData = !resolvedDataObjects || resolvedDataObjects.length === 0;
    if (!needsWorkflow && !needsData) return;
    const load = async () => {
      try {
        const objRes = await fetch(
          `/api/database?table=${DB_TABLES.OBJECTS}&id=${
            (initialField as any)?.objectid
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds((prev: string[]) =>
      prev.includes(fieldId)
        ? prev.filter((id: string) => id !== fieldId)
        : [...prev, fieldId],
    );
    setError("");
  };

  const handleSubmit = useCallback(async () => {
    if (mode === "add") {
      if (addMode === "existing") {
        if (selectedFieldIds.length === 0) {
          setError("Please select at least one field");
          return;
        }
        if (onAddExistingField) onAddExistingField(selectedFieldIds);
      } else {
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
        if (refGroup && refObjectId) {
          const refName =
            refGroup === "workflow"
              ? workflowIdToName.get(refObjectId)
              : dataIdToName.get(refObjectId);
          if (!sampleValue) setSampleValue(refName || "");
        }
        if (onSubmitAdd) {
          // Determine the actual field type based on the selected object's isEmbedded property
          let actualType = type;
          if (refGroup && refObjectId) {
            const selectedObject =
              refGroup === "workflow"
                ? resolvedWorkflowObjects.find((o) => o.id === refObjectId)
                : resolvedDataObjects.find((o) => o.id === refObjectId);

            const isEmbedded = selectedObject?.isEmbedded || false;

            if (refGroup === "workflow") {
              actualType = isEmbedded
                ? type === "CaseReferenceMulti"
                  ? "EmbedDataMulti"
                  : "EmbedDataSingle"
                : type;
            } else {
              actualType = isEmbedded
                ? type === "DataReferenceMulti"
                  ? "EmbedDataMulti"
                  : "EmbedDataSingle"
                : type;
            }
          }

          await onSubmitAdd({
            label,
            type: actualType,
            required,
            primary: isPrimary,
            options: parsedOptions,
            sampleValue: sampleValue,
            refObjectId: refObjectId ?? undefined,
            refMultiplicity:
              refGroup && refObjectId
                ? type === "CaseReferenceMulti" || type === "DataReferenceMulti"
                  ? "multi"
                  : "single"
                : undefined,
          });
        }
      }
      onClose();
      return;
    }

    // edit mode
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
    if (onSubmitEdit && initialField) {
      // Determine the actual field type based on the selected object's isEmbedded property
      let actualType = type;
      if (refGroup && refObjectId) {
        const selectedObject =
          refGroup === "workflow"
            ? resolvedWorkflowObjects.find((o) => o.id === refObjectId)
            : resolvedDataObjects.find((o) => o.id === refObjectId);

        const isEmbedded = selectedObject?.isEmbedded || false;

        if (refGroup === "workflow") {
          actualType = isEmbedded
            ? type === "CaseReferenceMulti"
              ? "EmbedDataMulti"
              : "EmbedDataSingle"
            : type;
        } else {
          actualType = isEmbedded
            ? type === "DataReferenceMulti"
              ? "EmbedDataMulti"
              : "EmbedDataSingle"
            : type;
        }
      }

      onSubmitEdit({
        name: initialField.name,
        label: label.trim(),
        type: actualType,
        primary: isPrimary,
        required: required,
        options: parsedOptions,
        sampleValue: sampleValue,
        refObjectId: refObjectId ?? undefined,
        refMultiplicity:
          refGroup && refObjectId
            ? type === "CaseReferenceMulti" || type === "DataReferenceMulti"
              ? "multi"
              : "single"
            : undefined,
      });
    }
    onClose();
  }, [
    mode,
    addMode,
    selectedFieldIds,
    onAddExistingField,
    label,
    options,
    refGroup,
    refObjectId,
    workflowIdToName,
    dataIdToName,
    sampleValue,
    onSubmitAdd,
    type,
    resolvedWorkflowObjects,
    resolvedDataObjects,
    required,
    isPrimary,
    onSubmitEdit,
    initialField,
    onClose,
  ]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSubmit();
    }
  };

  const actions = useMemo(() => {
    const modalActions = [
      {
        id: "cancel",
        label: "Cancel",
        type: "secondary" as const,
        onClick: onClose,
      },
      {
        id: "submit",
        label:
          mode === "add"
            ? addMode === "existing"
              ? `Add Field${selectedFieldIds.length !== 1 ? "s" : ""} (${
                  selectedFieldIds.length
                })`
              : "Save"
            : "Save",
        type: "primary" as const,
        onClick: handleSubmit,
      },
    ];

    return modalActions;
  }, [mode, addMode, selectedFieldIds.length, onClose, handleSubmit]);

  const selectValue = refGroup
    ? `${refGroup}:${refObjectId ?? ""}`
    : (type as string);
  const referenceTypes = new Set([
    "DataReferenceSingle",
    "DataReferenceMulti",
    "CaseReferenceSingle",
    "CaseReferenceMulti",
  ] as const);
  const embedTypes = new Set(["EmbedDataSingle", "EmbedDataMulti"] as const);
  const standardTypes = getAllFieldTypes().filter(
    (t) =>
      !(referenceTypes as any).has(t as any) &&
      !(embedTypes as any).has(t as any),
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title={title || (mode === "edit" ? "Edit Field" : "Add Field")}
      actions={actions}
      width="w-full max-w-md"
      onKeyDownAction={handleKeyDown}
      usePortal={usePortal}
    >
      {mode === "add" && allowExistingFields && (
        <div className="flex gap-2 p-1 rounded-lg bg-[rgb(20,16,60)]">
          <button
            onClick={() => setAddMode("existing")}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              addMode === "existing"
                ? "bg-modal text-white shadow-sm"
                : "text-white/80 hover:text-white"
            }`}
          >
            Select Existing
          </button>
          <button
            onClick={() => setAddMode("new")}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              addMode === "new"
                ? "bg-modal text-white shadow-sm"
                : "text-white/80 hover:text-white"
            }`}
          >
            Add New
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      <div className="space-y-4">
        {mode === "add" && allowExistingFields && addMode === "existing" ? (
          <div>
            {availableFields.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-interactive dark:text-gray-400">
                  No available fields to add.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableFields
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((field, index) => (
                    <label
                      key={field.id?.toString() || index}
                      className={`flex items-center p-3 rounded-lg border ${
                        selectedFieldIds.includes(field.id?.toString() || "")
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
                          toggleFieldSelection(field.id?.toString() || "")
                        }
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 mr-3"
                      />
                      <div className="flex-1 flex items-center">
                        <div className="flex items-center space-x-3 p-0 rounded-lg text-white w-full">
                          <FieldRow
                            field={field}
                            hideDragHandle
                            disableRefNavigation
                          />
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
                {mode === "edit" ? "Field Label" : "Label"}
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
                {mode === "edit" ? "Field Type" : "Type"}
              </label>
              <select
                value={selectValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value.startsWith("workflow:") ||
                    value.startsWith("data:")
                  ) {
                    const [grp, idStr] = value.split(":");
                    const pickedId = parseInt(idStr || "", 10);
                    const group = (grp === "workflow" ? "workflow" : "data") as
                      | "workflow"
                      | "data";
                    setRefGroup(group);
                    setRefObjectId(Number.isNaN(pickedId) ? null : pickedId);
                    setType(
                      group === "workflow"
                        ? ("CaseReferenceSingle" as Field["type"])
                        : ("DataReferenceSingle" as Field["type"]),
                    );
                    if (!sampleValue) {
                      const targetName =
                        group === "workflow"
                          ? workflowIdToName.get(pickedId)
                          : dataIdToName.get(pickedId);
                      if (targetName) setSampleValue(targetName);
                    }
                  } else {
                    setRefGroup(null);
                    setRefObjectId(null);
                    setType(value as Field["type"]);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white transition-colors"
              >
                <optgroup label="Standard">
                  {standardTypes.map((fieldType) => (
                    <option key={fieldType} value={fieldType}>
                      {getFieldTypeDisplayName(fieldType as any)}
                    </option>
                  ))}
                </optgroup>
                {(resolvedWorkflowObjects || []).length > 0 && (
                  <>
                    <optgroup label="Workflow Reference">
                      {(resolvedWorkflowObjects || []).map((o) => (
                        <option
                          key={`workflow:${o.id}`}
                          value={`workflow:${o.id}`}
                        >
                          {o.name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
                {(resolvedDataObjects || []).length > 0 && (
                  <>
                    <optgroup label="Data Reference">
                      {(resolvedDataObjects || [])
                        .filter((o) => !o.isEmbedded)
                        .map((o) => (
                          <option key={`data:${o.id}`} value={`data:${o.id}`}>
                            {o.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Embedded Data">
                      {(resolvedDataObjects || [])
                        .filter((o) => o.isEmbedded)
                        .map((o) => (
                          <option key={`data:${o.id}`} value={`data:${o.id}`}>
                            {o.name}
                          </option>
                        ))}
                    </optgroup>
                  </>
                )}
              </select>
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
                      name="ref-cardinality"
                      checked={
                        (refGroup === "workflow" &&
                          type === "CaseReferenceSingle") ||
                        (refGroup === "data" && type === "DataReferenceSingle")
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
                      name="ref-cardinality"
                      checked={
                        (refGroup === "workflow" &&
                          type === "CaseReferenceMulti") ||
                        (refGroup === "data" && type === "DataReferenceMulti")
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
                id="required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="required" className="text-sm text-white">
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

            {(type === "Dropdown" ||
              type === "RadioButtons" ||
              type === "Status") && (
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
    </StandardModal>
  );
};

export default FieldModal;
