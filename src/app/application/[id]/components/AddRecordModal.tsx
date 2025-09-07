"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Field } from "../../../types/types";
import { DB_TABLES } from "../../../types/database";
import StandardModal from "../../../components/StandardModal";

type AddRecordModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  fields: Field[];
  onSaveAction: (data: Record<string, any>) => void;
};

export default function AddRecordModal({
  isOpen,
  onCloseAction,
  fields,
  onSaveAction,
}: AddRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState<
    Record<string, any[]>
  >({});

  const loadReferenceOptions = useCallback(async () => {
    const referenceFields = fields.filter((field) =>
      field.type.includes("Reference"),
    );

    for (const field of referenceFields) {
      try {
        const refObjectId = (field as any).refObjectId;
        if (refObjectId) {
          const response = await fetch(
            `/api/database?table=${DB_TABLES.OBJECTS}&id=${refObjectId}`,
          );
          if (response.ok) {
            const result = await response.json();
            const object = result.data;
            if (object) {
              // For now, we'll use the object name as the option
              // In a real implementation, you might want to fetch related records
              setReferenceOptions((prev) => ({
                ...prev,
                [field.name]: [{ id: object.id, name: object.name }],
              }));
            }
          }
        }
      } catch (error) {
        console.error(
          `Error loading reference options for ${field.name}:`,
          error,
        );
      }
    }
  }, [fields]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      fields.forEach((field) => {
        switch (field.type) {
          case "Integer":
          case "Currency":
          case "Decimal":
            initialData[field.name] = 0;
            break;
          case "Checkbox":
            initialData[field.name] = [];
            break;
          case "CaseReferenceMulti":
          case "DataReferenceMulti":
          case "EmbedDataMulti":
            initialData[field.name] = [];
            break;
          default:
            initialData[field.name] = "";
        }
      });
      setFormData(initialData);
      loadReferenceOptions();
    } else {
      setFormData({});
      setReferenceOptions({});
    }
  }, [isOpen, fields, loadReferenceOptions]);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSaveAction(formData);
    } catch (error) {
      console.error("Error saving record:", error);
    } finally {
      setLoading(false);
    }
  };

  const modalActions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onCloseAction,
    },
    {
      id: "save",
      label: "Save Record",
      type: "primary" as const,
      onClick: () => {
        const form = document.getElementById(
          "add-record-form",
        ) as HTMLFormElement;
        form?.requestSubmit();
      },
      disabled: loading,
      loading: loading,
      form: "add-record-form",
      buttonType: "submit" as const,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Add New Record"
      actions={modalActions}
    >
      <form id="add-record-form" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {field.label || field.name}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {renderFieldInput(
              field,
              formData[field.name] || "",
              handleInputChange,
              referenceOptions,
            )}
          </div>
        ))}
      </form>
    </StandardModal>
  );
}

// Helper function to render different input types
function renderFieldInput(
  field: Field,
  value: any,
  onChange: (fieldName: string, value: any) => void,
  referenceOptions: Record<string, any[]>,
): React.ReactNode {
  const fieldName = field.name;
  const isRequired = field.required;

  switch (field.type) {
    case "Text":
    case "Email":
    case "Phone":
      return (
        <input
          type={
            field.type === "Email"
              ? "email"
              : field.type === "Phone"
              ? "tel"
              : "text"
          }
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${field.label || field.name.toLowerCase()}`}
        />
      );

    case "TextArea":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          rows={3}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
          placeholder={`Enter ${field.label || field.name.toLowerCase()}`}
        />
      );

    case "Integer":
    case "Currency":
    case "Decimal":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(fieldName, parseFloat(e.target.value) || 0)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${field.label || field.name.toLowerCase()}`}
        />
      );

    case "Date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );

    case "DateTime":
      return (
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );

    case "Dropdown":
      const dropdownOptions = Array.isArray(field.options) ? field.options : [];
      return (
        <select
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select an option</option>
          {dropdownOptions.map((option: string, index: number) => (
            <option key={index} value={option} className="bg-[rgb(14,10,42)]">
              {option}
            </option>
          ))}
        </select>
      );

    case "RadioButtons":
      const radioOptions = Array.isArray(field.options) ? field.options : [];
      return (
        <div className="space-y-2">
          {radioOptions.map((option: string, index: number) => (
            <label key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name={fieldName}
                value={option}
                checked={value === option}
                onChange={(e) => onChange(fieldName, e.target.value)}
                required={isRequired}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 focus:ring-blue-500"
              />
              <span className="text-white/80">{option}</span>
            </label>
          ))}
        </div>
      );

    case "Checkbox":
      const checkboxOptions = Array.isArray(field.options) ? field.options : [];
      return (
        <div className="space-y-2">
          {checkboxOptions.map((option: string, index: number) => (
            <label key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(option)}
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    onChange(fieldName, [...currentValues, option]);
                  } else {
                    onChange(
                      fieldName,
                      currentValues.filter((v: string) => v !== option),
                    );
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
              />
              <span className="text-white/80">{option}</span>
            </label>
          ))}
        </div>
      );

    // Reference field types - simplified for now
    case "CaseReferenceSingle":
    case "DataReferenceSingle":
    case "EmbedDataSingle":
      return (
        <select
          value={typeof value === "object" ? value?.id : value}
          onChange={(e) => {
            const selectedOption = referenceOptions[fieldName]?.find(
              (opt: any) => opt.id.toString() === e.target.value,
            );
            onChange(fieldName, selectedOption || null);
          }}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select an option</option>
          {referenceOptions[fieldName]?.map((option: any) => (
            <option
              key={option.id}
              value={option.id}
              className="bg-[rgb(14,10,42)]"
            >
              {option.name}
            </option>
          ))}
        </select>
      );

    case "CaseReferenceMulti":
    case "DataReferenceMulti":
    case "EmbedDataMulti":
      return (
        <div className="space-y-2">
          {referenceOptions[fieldName]?.map((option: any) => (
            <label key={option.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  Array.isArray(value) &&
                  value.some((v: any) => v.id === option.id)
                }
                onChange={(e) => {
                  const currentValues = Array.isArray(value) ? value : [];
                  if (e.target.checked) {
                    onChange(fieldName, [...currentValues, option]);
                  } else {
                    onChange(
                      fieldName,
                      currentValues.filter((v: any) => v.id !== option.id),
                    );
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
              />
              <span className="text-white/80">{option.name}</span>
            </label>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(fieldName, e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${field.label || field.name.toLowerCase()}`}
        />
      );
  }
}
