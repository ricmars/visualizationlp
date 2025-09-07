import React from "react";
import { Field } from "../types/types";
import FieldModal from "./FieldModal";

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
  return (
    <FieldModal
      isOpen={isOpen}
      mode="edit"
      title="Edit Field"
      onClose={onClose}
      initialField={field}
      onSubmitEdit={onSubmit}
      workflowObjects={workflowObjects}
      dataObjects={dataObjects}
    />
  );
};

export default EditFieldModal;
