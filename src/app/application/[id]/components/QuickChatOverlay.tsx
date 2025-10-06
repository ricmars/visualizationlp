"use client";

import React, { MutableRefObject, RefObject } from "react";
import { FaMagic } from "react-icons/fa";
import { FaTimes } from "react-icons/fa";

type Point = { x: number; y: number };

type QuickChatOverlayProps = {
  position: Point;
  selectionSummary: string;
  inputRef:
    | RefObject<HTMLInputElement | null>
    | MutableRefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  onEscape: () => void;
  // Decision table quick tool (optional)
  decisionTables?: Array<{ id: number; name: string }>;
  selectedDecisionTableId?: number | null;
  onChangeDecisionTableId?: (id: number | null) => void;
  fields?: Array<{ id: number; name: string }>;
  selectedDecisionTableFieldIds?: number[];
  onChangeDecisionTableFieldIds?: (ids: number[]) => void;
};

export default function QuickChatOverlay({
  position,
  selectionSummary,
  inputRef,
  value,
  onChange,
  onEnter,
  onEscape,
  decisionTables = [],
  selectedDecisionTableId = null,
  onChangeDecisionTableId,
  fields = [],
  selectedDecisionTableFieldIds = [],
  onChangeDecisionTableFieldIds,
}: QuickChatOverlayProps) {
  return (
    <div
      className="fixed z-[110]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-[360px] min-w-[450px] rounded-xl shadow-2xl border border-[rgb(172,117,240)] bg-[rgb(14,10,42)] text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-600 text-white shadow">
              <FaMagic className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-white">
              {selectionSummary}
            </div>
          </div>
          <button
            onClick={onEscape}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            aria-label="Close overlay"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Decision table selectors */}
        {decisionTables.length > 0 && (
          <div className="mt-3 space-y-2">
            <div>
              <label className="block text-xs font-medium text-white mb-1">
                Decision Table
              </label>
              <select
                className="w-full px-2 py-1 rounded-md border border-gray-600 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={selectedDecisionTableId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v ? parseInt(v, 10) : NaN;
                  onChangeDecisionTableId?.(Number.isFinite(n) ? n : null);
                }}
              >
                <option value="">Select a decision table</option>
                {decisionTables.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1">
                Columns (fields)
              </label>
              <div className="max-h-32 overflow-auto rounded-md border border-gray-600 bg-gray-800">
                {fields.map((f) => {
                  const checked = selectedDecisionTableFieldIds?.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer select-none hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-purple-500"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedDecisionTableFieldIds);
                          if (e.target.checked) {
                            next.add(f.id);
                          } else {
                            next.delete(f.id);
                          }
                          onChangeDecisionTableFieldIds?.(Array.from(next));
                        }}
                      />
                      <span>{f.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-300">
          AI quick action — type and press Enter. Esc to close.
        </div>
        <input
          ref={inputRef}
          className="mt-2 w-full rounded-md border border-gray-600 bg-gray-800 text-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Quick edit..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
            if (e.key === "Escape") {
              onEscape();
            }
          }}
          autoFocus
        />
      </div>
    </div>
  );
}
