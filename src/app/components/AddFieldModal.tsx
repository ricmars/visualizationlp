import React from "react";
import { Field } from "../types";
import ModalPortal from "./ModalPortal";
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
}) => {
  return (
    <ModalPortal isOpen={isOpen}>
      <>
        <div
          className="absolute inset-0 modal-backdrop z-[120] modal-overlay"
          onClick={onClose}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-xl z-[130] modal-surface min-w-[450px]">
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
          />
        </div>
      </>
    </ModalPortal>
  );
};

export default AddFieldModal;
