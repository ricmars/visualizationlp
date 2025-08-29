"use client";

import React from "react";

type WorkflowToolbarProps = {
  onAddStage: () => void;
};

export default function WorkflowToolbar({ onAddStage }: WorkflowToolbarProps) {
  return (
    <div className="flex items-center justify-between p-6">
      <div />
      <button
        onClick={onAddStage}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      >
        Add Stage
      </button>
    </div>
  );
}
