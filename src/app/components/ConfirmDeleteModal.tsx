"use client";

import { useEffect, useState } from "react";

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

  if (!isOpen) return null;

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

  return (
    <div className="absolute inset-0 modal-backdrop flex items-center justify-center z-[80] modal-overlay p-4">
      <div
        className="rounded-lg shadow-xl w-full max-w-md z-[90] modal-surface min-w-[450px]"
        role="dialog"
      >
        <div className="p-6">
          <div className="lp-modal-header">
            <h2>{title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="btn-secondary px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="interactive-button px-3 flex items-center gap-2"
              >
                {isDeleting && (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
          <p className="p-2 text-sm text-gray-200">{message}</p>

          {progress && (
            <div className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
              {progress}
            </div>
          )}
          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
        </div>
        <div className="px-6 pb-6" />
      </div>
    </div>
  );
}
