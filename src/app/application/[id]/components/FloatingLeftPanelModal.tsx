"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChangesPanel from "../../../components/ChangesPanel";
import RulesCheckoutPanel from "./RulesCheckoutPanel";
import { Stage, Field } from "../../../types";

const Icon = dynamic(() =>
  import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
);

interface FloatingLeftPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  leftPanelView: "history" | "checkout";
  onViewChange: (view: "history" | "checkout") => void;
  caseId?: number;
  applicationId?: number;
  stages: Stage[];
  fields: Field[];
}

export default function FloatingLeftPanelModal({
  isOpen,
  onClose,
  leftPanelView,
  onViewChange,
  caseId,
  applicationId,
  stages,
  fields,
}: FloatingLeftPanelModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
              <h3 className="text-sm font-medium opacity-80">
                {leftPanelView === "checkout"
                  ? "Rules checkout"
                  : "Rules updates"}
              </h3>
              <div className="flex items-center gap-1">
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
              <div className="h-full">
                <ChangesPanel
                  caseid={caseId}
                  applicationid={applicationId}
                  onRefresh={() =>
                    window.dispatchEvent(new CustomEvent("model-updated"))
                  }
                />
              </div>
            ) : (
              <div className="h-full">
                <RulesCheckoutPanel
                  caseId={caseId}
                  applicationId={applicationId}
                  stages={stages}
                  fields={fields}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
