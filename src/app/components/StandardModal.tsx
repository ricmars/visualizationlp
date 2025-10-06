"use client";

import React, { useEffect, useRef } from "react";
import ModalPortal from "./ModalPortal";

type ModalAction = {
  id: string;
  label: string;
  type: "primary" | "secondary";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  form?: string;
  buttonType?: "button" | "submit";
};

type StandardModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  actions?: ModalAction[];
  width?: string;
  zIndex?: string;
  onKeyDownAction?: (e: React.KeyboardEvent) => void;
  description?: string; // For aria-describedby
  closeOnOverlayClick?: boolean; // Allow disabling overlay close
  closeOnEscape?: boolean; // Allow disabling escape close
};

export default function StandardModal({
  isOpen,
  onCloseAction,
  title,
  children,
  actions = [],
  width = "",
  zIndex = "z-50",
  onKeyDownAction,
  description,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: StandardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the modal after a brief delay to ensure it's rendered
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 0);

      return () => clearTimeout(timer);
    } else {
      // Return focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Focus trap implementation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && closeOnEscape) {
      onCloseAction();
    } else if (e.key === "Tab") {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as NodeListOf<HTMLElement>;

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
    onKeyDownAction?.(e);
  };

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onCloseAction();
    }
  };

  if (!isOpen) return null;

  const renderAction = (action: ModalAction): React.ReactNode => {
    const baseClasses =
      action.type === "primary"
        ? "interactive-button px-3"
        : "btn-secondary px-3";

    const disabledClasses =
      action.disabled || action.loading ? "opacity-60 cursor-not-allowed" : "";

    return (
      <button
        key={action.id}
        type={action.buttonType || "button"}
        onClick={action.onClick}
        disabled={action.disabled || action.loading}
        className={`${baseClasses} ${disabledClasses}`}
        form={action.form}
        aria-describedby={action.loading ? `${action.id}-loading` : undefined}
      >
        {action.loading ? (
          <>
            <span aria-hidden="true">Loading...</span>
            <span id={`${action.id}-loading`} className="sr-only">
              {action.label} is loading
            </span>
          </>
        ) : (
          action.label
        )}
      </button>
    );
  };

  // Separate actions by type: secondary first, then primary
  const secondaryActions = actions.filter(
    (action) => action.type === "secondary",
  );
  const primaryActions = actions.filter((action) => action.type === "primary");

  const modalInner = (
    <>
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isOpen
          ? `Modal opened: ${
              typeof title === "string" ? title : "Theme Editor"
            }`
          : ""}
      </div>

      <div
        ref={modalRef}
        className="absolute inset-0 modal-backdrop modal-overlay"
        onClick={handleOverlayClick}
        tabIndex={-1}
      >
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${zIndex}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby={description ? "modal-description" : undefined}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className={`modal-surface ${width}`}>
            <div className="lp-modal-header p-4 sticky top-0 z-10 bg-modal border-b border-gray-200 dark:border-gray-700">
              <h3 id="modal-title">{title}</h3>
              <div className="flex items-center gap-2">
                {/* Render secondary actions first */}
                {secondaryActions.map(renderAction)}
                {/* Then render primary actions */}
                {primaryActions.map(renderAction)}
              </div>
            </div>
            <div
              id={description ? "modal-description" : undefined}
              className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]"
            >
              {description && <p className="sr-only">{description}</p>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return <ModalPortal isOpen={isOpen}>{modalInner}</ModalPortal>;
}
