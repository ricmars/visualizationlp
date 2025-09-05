"use client";

import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface DeleteWorkflowModalProps {
  isOpen: boolean;
  objectid?: number;
  caseName?: string;
  onCancel: () => void;
  onConfirm: (objectid: number) => Promise<void>;
}

export default function DeleteWorkflowModal({
  isOpen,
  objectid,
  caseName,
  onCancel,
  onConfirm,
}: DeleteWorkflowModalProps) {
  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      title="Delete workflow"
      message={`Are you sure you want to delete "${caseName}"? This will permanently remove the workflow, all fields, views, and checkpoints for this case.`}
      onCancel={onCancel}
      onConfirm={async () => {
        if (!objectid) return;
        // Delete checkpoints for this case (if any)
        try {
          await fetch(`/api/checkpoint?action=deleteAll`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectid }),
          });
        } catch {}
        await onConfirm(objectid);
      }}
    />
  );
}
