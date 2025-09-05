"use client";

import React, { MutableRefObject, RefObject } from "react";
import { FaMagic } from "react-icons/fa";

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
};

export default function QuickChatOverlay({
  position,
  selectionSummary,
  inputRef,
  value,
  onChange,
  onEnter,
  onEscape,
}: QuickChatOverlayProps) {
  return (
    <div
      className="fixed z-[110]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="w-[360px] min-w-[450px] rounded-xl shadow-2xl border border-[rgb(172,117,240)] bg-[rgb(14,10,42)] text-white p-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-600 text-white shadow">
            <FaMagic className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm font-semibold text-white">
            {selectionSummary}
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-300">
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
