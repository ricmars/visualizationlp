"use client";

import React from "react";

export type WorkflowMainTab = "workflow" | "fields" | "data" | "views";

type WorkflowTabsProps = {
  active: WorkflowMainTab;
  onChange: (tab: WorkflowMainTab) => void;
};

export default function WorkflowTabs({ active, onChange }: WorkflowTabsProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex">
        <button
          onClick={() => onChange("workflow")}
          className={`px-4 py-2 text-sm font-medium ${
            active === "workflow"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          Workflow
        </button>
        <button
          onClick={() => onChange("fields")}
          className={`px-4 py-2 text-sm font-medium ${
            active === "fields"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          Fields
        </button>

        <button
          onClick={() => onChange("views")}
          className={`px-4 py-2 text-sm font-medium ${
            active === "views"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          Views
        </button>
        <button
          onClick={() => onChange("data")}
          className={`px-4 py-2 text-sm font-medium ${
            active === "data"
              ? "text-white border-b-2 border-blue-400"
              : "text-white/80 hover:text-white"
          }`}
        >
          Data
        </button>
      </div>
    </div>
  );
}
