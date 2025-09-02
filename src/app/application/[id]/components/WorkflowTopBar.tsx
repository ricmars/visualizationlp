"use client";

import React from "react";
import { FaPencilAlt } from "react-icons/fa";

type WorkflowTopBarProps = {
  selectedCaseName?: string;
  canEdit: boolean;
  onEditWorkflowAction: () => void;
  isPreviewMode: boolean;
  onTogglePreviewAction: () => void;
  workflows?: Array<{ id: number; name: string }>;
  activeWorkflowId?: number;
  onChangeWorkflowAction?: (id: number) => void;
};

export default function WorkflowTopBar({
  selectedCaseName,
  canEdit,
  onEditWorkflowAction,
  isPreviewMode,
  onTogglePreviewAction,
  workflows,
  activeWorkflowId,
  onChangeWorkflowAction,
}: WorkflowTopBarProps) {
  return (
    <div className="flex items-center justify-between p-6">
      <div className="flex items-center">
        <div className="flex items-center">
          {workflows && workflows.length > 1 && onChangeWorkflowAction && (
            <div className="relative ml-4">
              <details className="group">
                <summary className="list-none inline-flex items-center gap-2 cursor-pointer select-none bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5">
                  <span className="truncate max-w-[220px]">
                    {selectedCaseName}
                  </span>
                  <svg
                    className="w-4 h-4 transition-transform group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <div className="absolute mt-2 z-50 w-72 max-w-[80vw] bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-72 overflow-auto">
                    {workflows
                      .filter((wf) => wf.id !== activeWorkflowId)
                      .map((wf) => (
                        <button
                          key={wf.id}
                          onClick={() => onChangeWorkflowAction(wf.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-800"
                        >
                          {wf.name}
                        </button>
                      ))}
                  </div>
                </div>
              </details>
            </div>
          )}
          {canEdit && (
            <button
              onClick={onEditWorkflowAction}
              className="ml-3 btn-secondary w-8"
              aria-label="Edit workflow"
            >
              <FaPencilAlt className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <label className="flex items-center cursor-pointer group">
        <div className="lp-toggle">
          <input
            type="checkbox"
            className="sr-only"
            checked={isPreviewMode}
            onChange={onTogglePreviewAction}
          />
          <div className="lp-toggle-track"></div>
          <div className={`lp-toggle-dot`}></div>
        </div>
        <div className="ml-3 text-sm font-medium text-interactive transition-colors duration-200">
          Preview
        </div>
      </label>
    </div>
  );
}
