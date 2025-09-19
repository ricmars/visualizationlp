"use client";

import { useEffect, useState } from "react";
import StandardModal from "./StandardModal";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setProgress("");
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    setProgress("Processing...");
    try {
      await onConfirm();
      setProgress("Done.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete action");
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onCancel,
      disabled: isDeleting,
    },
    {
      id: "confirm",
      label: confirmLabel,
      type: "primary" as const,
      onClick: handleConfirm,
      disabled: isDeleting,
      loading: isDeleting,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onCancel}
      title={title}
      actions={actions}
      width="w-full"
      zIndex="z-[90]"
      closeOnOverlayClick={!isDeleting}
      closeOnEscape={!isDeleting}
    >
      <p className="text-sm text-gray-200">{message}</p>

      {progress && <div className="text-sm text-white p-2">{progress}</div>}
      {error && <div className="text-sm text-white p-2">{error}</div>}
    </StandardModal>
  );
}
