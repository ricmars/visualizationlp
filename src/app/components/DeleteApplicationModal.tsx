"use client";

import { useEffect, useState } from "react";
import { fetchWithBaseUrl } from "@/app/lib/fetchWithBaseUrl";

interface DeleteApplicationModalProps {
  isOpen: boolean;
  applicationId?: number;
  applicationName?: string;
  onCancel: () => void;
  // Called after successful deletion so parent can update local state
  onConfirm: (applicationId: number) => void | Promise<void>;
}

export default function DeleteApplicationModal({
  isOpen,
  applicationId,
  applicationName,
  onCancel,
  onConfirm,
}: DeleteApplicationModalProps) {
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
    if (!applicationId) return;
    setIsDeleting(true);
    setError(null);
    setProgress("Fetching application workflows...");

    try {
      // 1) Load all cases/workflows for this application
      const casesRes = await fetchWithBaseUrl(
        `/api/database?table=Objects&applicationid=${applicationId}`,
      );
      if (!casesRes.ok) {
        const err = await casesRes.text();
        throw new Error(`Failed to load workflows: ${err}`);
      }
      const casesJson = await casesRes.json();
      const workflows: Array<{ id: number; name?: string }> =
        (casesJson?.data as any[]) || [];

      // 2) For each workflow, delete checkpoints then delete the case (cascades fields/views)
      for (let i = 0; i < workflows.length; i++) {
        const wf = workflows[i];
        setProgress(
          `Deleting checkpoints for workflow ${i + 1}/${workflows.length}...`,
        );

        await fetchWithBaseUrl(`/api/checkpoint?action=deleteAll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectid: wf.id }),
        });

        setProgress(
          `Deleting workflow ${i + 1}/${
            workflows.length
          } (and its fields/views)...`,
        );
        const delCaseRes = await fetchWithBaseUrl(
          `/api/dynamic?ruleType=case&id=${wf.id}`,
          { method: "DELETE" },
        );
        if (!delCaseRes.ok) {
          const err = await delCaseRes.text();
          throw new Error(`Failed to delete workflow ${wf.id}: ${err}`);
        }
      }

      // 3) Delete the application itself
      setProgress("Deleting application...");
      const delAppRes = await fetchWithBaseUrl(
        `/api/dynamic?ruleType=application&id=${applicationId}`,
        { method: "DELETE" },
      );
      if (!delAppRes.ok) {
        const err = await delAppRes.text();
        throw new Error(`Failed to delete application: ${err}`);
      }

      setProgress("Application deleted.");
      await onConfirm(applicationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete application");
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
            <h2 className="text-lg font-semibold text-white">
              Delete application
            </h2>
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
                Delete
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-200">
            Are you sure you want to delete "{applicationName}"? This will
            permanently remove the application, all of its workflows, fields,
            views, and checkpoints.
          </p>

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
