"use client";

import React, { useState } from "react";
import { DefaultTheme } from "styled-components";
import ThemeEditorImpl from "./ThemeEditorImpl";

export type ThemeEditorWithToggleProps = {
  theme: DefaultTheme;
  name: string;
  onUpdate: (theme: DefaultTheme) => void;
  readOnly?: boolean;
};

const ThemeEditorWithToggle: React.FC<ThemeEditorWithToggleProps> = ({
  theme,
  name,
  onUpdate,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<"editor" | "json">("editor");

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setViewMode(event.target.checked ? "json" : "editor");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toggle Switch Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70">Theme Model</h3>
        <label className="flex items-center cursor-pointer group">
          <div className="lp-toggle">
            <input
              type="checkbox"
              className="sr-only"
              checked={viewMode === "json"}
              onChange={handleToggleChange}
              disabled={readOnly}
            />
            <div className="lp-toggle-track"></div>
            <div className="lp-toggle-dot"></div>
          </div>
          <div className="ml-3 text-sm font-medium text-interactive transition-colors duration-200">
            {viewMode === "editor" ? "Editor" : "JSON"}
          </div>
        </label>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "editor" ? (
          <div className="h-full">
            <ThemeEditorImpl theme={theme} name={name} onUpdate={onUpdate} />
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-600 rounded-md p-4 h-full overflow-auto">
            <pre className="text-sm text-white whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(theme, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeEditorWithToggle;
