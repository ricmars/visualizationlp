"use client";

import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface DeleteDataObjectModalProps {
  isOpen: boolean;
  objectid?: number;
  objectName?: string;
  onCancel: () => void;
  onConfirm: (objectid: number) => Promise<void>;
}

export default function DeleteDataObjectModal({
  isOpen,
  objectid,
  objectName,
  onCancel,
  onConfirm,
}: DeleteDataObjectModalProps) {
  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      title="Delete data object"
      message={`Are you sure you want to delete "${objectName}"? This will permanently remove the data object and its fields.`}
      onCancel={onCancel}
      onConfirm={async () => {
        if (!objectid) return;
        await onConfirm(objectid);
      }}
    />
  );
}
