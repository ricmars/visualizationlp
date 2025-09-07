"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChangesPanel from "../../../components/ChangesPanel";
import RulesCheckoutPanel from "./RulesCheckoutPanel";
import { Stage, Field } from "../../../types/types";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";

const Icon = dynamic(() =>
  import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
);

interface FloatingLeftPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  leftPanelView: "history" | "checkout";
  onViewChange: (view: "history" | "checkout") => void;
  objectid?: number;
  applicationId?: number;
  stages: Stage[];
  fields: Field[];
}

export default function FloatingLeftPanelModal({
  isOpen,
  onClose,
  leftPanelView,
  onViewChange,
  objectid,
  applicationId,
  stages,
  fields,
}: FloatingLeftPanelModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleteAllCheckpointsModalOpen, setIsDeleteAllCheckpointsModalOpen] =
    useState(false);

  const handleDeleteAllCheckpoints = async () => {
    if (!applicationId) {
      throw new Error("No application ID available");
    }

    try {
      const response = await fetch(`/api/checkpoint?action=deleteAll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationid: applicationId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete checkpoints: ${response.status} ${errorText}`,
        );
      }

      // Refresh the left panel data
      if (leftPanelView === "history") {
        // Trigger a refresh of the changes panel
        window.dispatchEvent(new CustomEvent("refresh-changes-panel"));
      } else {
        // Trigger a refresh of the checkout panel
        window.dispatchEvent(new CustomEvent("refresh-checkout-panel"));
      }
    } catch (error) {
      console.error("Error deleting all checkpoints:", error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none ${
        isExpanded ? "" : "flex items-start justify-start p-4"
      }`}
    >
      <div
        className={`pointer-events-auto floating-left-modal-enter ${
          isExpanded ? "w-full h-full" : ""
        }`}
      >
        <div
          className={`bg-[rgb(14,10,42)] text-white rounded-lg shadow-2xl border border-[rgb(172,117,240)] transition-all duration-300 ease-in-out flex flex-col ${
            isExpanded
              ? "w-full h-full max-w-none max-h-none"
              : "w-80 h-96 sm:w-96 sm:h-[500px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h2>
                {leftPanelView === "checkout"
                  ? "Rules checkout"
                  : "Rules updates"}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Delete all checkpoints"
                  className="btn-secondary w-8"
                  onClick={() => setIsDeleteAllCheckpointsModalOpen(true)}
                >
                  <Icon name="trash" aria-hidden />
                </button>
                <button
                  aria-label="Show rules updates"
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${
                    leftPanelView === "history" ? "bg-white/10" : ""
                  }`}
                  onClick={() => onViewChange("history")}
                >
                  <Icon name="clock" aria-hidden />
                </button>
                <button
                  aria-label="Show checkout"
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${
                    leftPanelView === "checkout" ? "bg-white/10" : ""
                  }`}
                  onClick={() => onViewChange("checkout")}
                >
                  <Icon name="folder-nested" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label={isExpanded ? "Collapse" : "Expand to full screen"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isExpanded ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  )}
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {leftPanelView === "history" ? (
              <div className="px-2 h-full overflow-y-auto">
                <ChangesPanel
                  objectid={objectid}
                  applicationid={applicationId}
                  onRefresh={() =>
                    window.dispatchEvent(new CustomEvent("model-updated"))
                  }
                />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <RulesCheckoutPanel
                  objectid={objectid}
                  applicationId={applicationId}
                  stages={stages}
                  fields={fields}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete All Checkpoints Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteAllCheckpointsModalOpen}
        title="Delete All Checkpoints"
        message="Are you sure you want to delete all checkpoints for this application? This action cannot be undone and will permanently remove all checkpoint history."
        confirmLabel="Delete"
        onCancel={() => setIsDeleteAllCheckpointsModalOpen(false)}
        onConfirm={async () => {
          await handleDeleteAllCheckpoints();
          setIsDeleteAllCheckpointsModalOpen(false);
        }}
      />
    </div>
  );
}
