import React from "react";
import { Field } from "../types/types";
import FieldModal from "./FieldModal";

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
    refObjectId?: number;
    refMultiplicity?: "single" | "multi";
  }) => Promise<void>;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  existingFields?: Field[];
  stepFieldIds?: string[];
  onAddExistingField?: (fieldIds: string[]) => void;
  allowExistingFields?: boolean;
  workflowObjects?: Array<{ id: number; name: string }>;
  dataObjects?: Array<{ id: number; name: string }>;
  usePortal?: boolean;
}

const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  onClose,
  onAddField,
  existingFields = [],
  stepFieldIds = [],
  onAddExistingField,
  allowExistingFields = true,
  workflowObjects = [],
  dataObjects = [],
  usePortal = true,
}) => {
  return (
    <FieldModal
      isOpen={isOpen}
      mode="add"
      title="Add Field"
      onClose={onClose}
      allowExistingFields={allowExistingFields}
      existingFields={existingFields}
      stepFieldIds={stepFieldIds}
      onAddExistingField={onAddExistingField}
      onSubmitAdd={onAddField}
      workflowObjects={workflowObjects}
      dataObjects={dataObjects}
      usePortal={usePortal}
    />
  );
};

export default AddFieldModal;
