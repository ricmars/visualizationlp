"use client";

import React from "react";
import { ThemeDropdown } from "../../../components/ThemeDropdown";

type WorkflowItem = { id: number; name: string };
type DataObjectItem = {
  id: number;
  name: string;
  description?: string;
  objectid?: number;
  systemOfRecordId?: number;
};

type ApplicationMenuBarProps = {
  applicationName?: string;
  workflows?: WorkflowItem[];
  dataObjects?: DataObjectItem[];
  activeWorkflowId?: number;
  onChangeWorkflowAction?: (id: number) => void;
  onSelectDataObjectAction?: (id: number) => void;
  onSelectChannelAction?: (
    channel: import("../../../types/types").channel,
  ) => void;
  isPreviewMode: boolean;
  onTogglePreviewAction: () => void;
  onOpenCreateWorkflowAction?: () => void;
  onOpenCreateDataObjectAction?: () => void;
  onOpenCreateThemeAction?: () => void;
  applicationId?: number;
  selectedThemeId?: number | null;
  onThemeSelectAction?: (themeId: number | null) => void;
};

export default function ApplicationMenuBar({
  applicationName,
  workflows,
  dataObjects,
  activeWorkflowId,
  onChangeWorkflowAction,
  onSelectDataObjectAction,
  onSelectChannelAction,
  isPreviewMode,
  onTogglePreviewAction,
  onOpenCreateWorkflowAction,
  onOpenCreateDataObjectAction,
  onOpenCreateThemeAction,
  applicationId,
  selectedThemeId,
  onThemeSelectAction,
}: ApplicationMenuBarProps) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  return (
    <div className="flex items-center justify-between px-4 py-3 main-header-bg">
      <div className="flex items-center gap-6">
        <h1>{applicationName || "Application"}</h1>

        <nav className="flex items-center gap-2 text-white/90">
          <Menu
            id="channels"
            label="Channels"
            isOpen={openMenuId === "channels"}
            setOpenMenuId={setOpenMenuId}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800"
              onClick={() => {
                onSelectChannelAction && onSelectChannelAction("WorkPortal");
                setOpenMenuId(null);
              }}
            >
              WorkPortal
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800"
              onClick={() => {
                onSelectChannelAction && onSelectChannelAction("CSRPortal");
                setOpenMenuId(null);
              }}
            >
              CSRPortal
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-800"
              onClick={() => {
                onSelectChannelAction && onSelectChannelAction("SelfService");
                setOpenMenuId(null);
              }}
            >
              SelfService
            </button>
          </Menu>

          <Menu
            id="workflows"
            label="Workflows"
            isOpen={openMenuId === "workflows"}
            setOpenMenuId={setOpenMenuId}
          >
            {(workflows || []).length === 0 ? (
              <div className="px-4 py-2 text-sm text-white/70">
                No workflows
              </div>
            ) : (
              (workflows || []).map((wf) => (
                <button
                  key={wf.id}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-800 ${
                    activeWorkflowId === wf.id ? "bg-gray-800" : ""
                  }`}
                  onClick={() => {
                    onChangeWorkflowAction && onChangeWorkflowAction(wf.id);
                    setOpenMenuId(null);
                  }}
                >
                  {wf.name}
                </button>
              ))
            )}
          </Menu>

          <Menu
            id="data"
            label="Data"
            isOpen={openMenuId === "data"}
            setOpenMenuId={setOpenMenuId}
          >
            {(dataObjects || []).length === 0 ? (
              <div className="px-4 py-2 text-sm text-white/70">
                No data objects
              </div>
            ) : (
              (dataObjects || []).map((d) => (
                <button
                  key={d.id}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800"
                  onClick={() => {
                    onSelectDataObjectAction && onSelectDataObjectAction(d.id);
                    setOpenMenuId(null);
                  }}
                >
                  {d.name}
                </button>
              ))
            )}
          </Menu>

          {applicationId && (
            <ThemeDropdown
              applicationId={applicationId}
              selectedThemeId={selectedThemeId || null}
              onThemeSelect={onThemeSelectAction || (() => {})}
            />
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Menu
          id="create"
          label="+ Create"
          isOpen={openMenuId === "create"}
          setOpenMenuId={setOpenMenuId}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-800"
            onClick={() =>
              onOpenCreateWorkflowAction && onOpenCreateWorkflowAction()
            }
          >
            Workflow
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-800"
            onClick={() =>
              onOpenCreateDataObjectAction && onOpenCreateDataObjectAction()
            }
          >
            Data object
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-800"
            onClick={() => onOpenCreateThemeAction && onOpenCreateThemeAction()}
          >
            Theme
          </button>
        </Menu>

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
    </div>
  );
}

function Menu({
  id,
  label,
  children,
  isOpen,
  setOpenMenuId,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  setOpenMenuId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpenMenuId]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 cursor-pointer select-none bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5"
        onClick={() => setOpenMenuId(isOpen ? null : id)}
      >
        <span className="truncate max-w-[220px]">{label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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
      </button>
      {isOpen && (
        <div className="absolute mt-2 z-50 w-72 max-w-[80vw] bg-gray-900 text-white border border-gray-700 rounded-lg shadow-lg min-w-0">
          <div className="max-h-72 overflow-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

// Removed unused MenuItem after refactor to buttons
