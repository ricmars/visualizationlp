"use client";

import React from "react";

type StandardModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  width?: string;
  zIndex?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

export default function StandardModal({
  isOpen,
  onCloseAction,
  title,
  children,
  actions,
  width = "",
  zIndex = "z-50",
  onKeyDown,
}: StandardModalProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCloseAction();
    }
    onKeyDown?.(e);
  };

  return (
    <div
      className="absolute inset-0 modal-backdrop modal-overlay"
      onClick={onCloseAction}
    >
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${zIndex}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={`modal-surface ${width}`}>
          <div className="lp-modal-header p-4">
            <h3 id="modal-title">{title}</h3>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
          <div className="p-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
