"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import StandardModal from "@/app/components/StandardModal";

type SystemOfRecord = {
  id: number;
  name: string;
  icon?: string | null;
};

type AddDataObjectModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  objectid: number;
  systemsOfRecord: SystemOfRecord[];
  onCreateSorAction?: (name: string, icon?: string) => Promise<SystemOfRecord>;
  onSaveAction: (data: {
    name: string;
    description: string;
    objectid: number;
    systemOfRecordId: number;
    isEmbedded?: boolean;
    model?: any;
  }) => Promise<void>;
};

export default function AddDataObjectModal({
  isOpen,
  onCloseAction,
  objectid,
  systemsOfRecord,
  onCreateSorAction,
  onSaveAction,
}: AddDataObjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"select" | "createSor">("select");
  const [systemOfRecordId, setSystemOfRecordId] = useState<number | null>(null);
  const [newSorName, setNewSorName] = useState("");
  const [newSorIcon, setNewSorIcon] = useState("");
  const [isEmbedded, setIsEmbedded] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const canSave = useMemo(() => {
    return (
      !!name.trim() &&
      !!description.trim() &&
      (isEmbedded || Number.isFinite(systemOfRecordId || undefined))
    );
  }, [name, description, systemOfRecordId, isEmbedded]);

  const handleCreate = async () => {
    if (!canSave) return;
    await onSaveAction({
      name: name.trim(),
      description: description.trim(),
      objectid: objectid,
      systemOfRecordId: systemOfRecordId as number,
      isEmbedded,
    });
    setName("");
    setDescription("");
    setSystemOfRecordId(null);
    setIsEmbedded(false);
    onCloseAction();
  };

  const handleCreateSor = async () => {
    if (!onCreateSorAction) return;
    const sor = await onCreateSorAction(
      newSorName.trim(),
      newSorIcon.trim() || undefined,
    );
    setMode("select");
    setSystemOfRecordId(sor.id);
  };

  const actions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onCloseAction,
    },
    {
      id: "create",
      label: "Create",
      type: "primary" as const,
      onClick: handleCreate,
      disabled: !canSave,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onCloseAction}
      title="Add Data Object"
      actions={actions}
      width="w-[560px]"
    >
      <div>
        <label className="block text-sm font-medium text-white mb-1">
          Name
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[rgb(20,16,60)] text-white"
          placeholder="Customer, Order, Account..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[rgb(20,16,60)] text-white"
          placeholder="Describe how this object is used"
        />
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isEmbedded}
            onChange={(e) => {
              setIsEmbedded(e.target.checked);
              if (e.target.checked) {
                setSystemOfRecordId(null);
                setMode("select");
              }
            }}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Embedded Object</span>
        </label>
        <p className="text-xs text-white/70 mt-1">
          When enabled, data is stored directly rather than referenced
        </p>
      </div>

      {!isEmbedded && (
        <>
          <div className="flex gap-2 p-1 rounded-lg bg-[rgb(20,16,60)]">
            <button
              onClick={() => setMode("select")}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "select"
                  ? "bg-modal text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Select System of Record
            </button>
            <button
              onClick={() => setMode("createSor")}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "createSor"
                  ? "bg-modal text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Create System of Record
            </button>
          </div>
        </>
      )}

      {!isEmbedded && (
        <>
          {mode === "select" ? (
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                System of Record
              </label>
              <select
                value={systemOfRecordId ?? ""}
                onChange={(e) =>
                  setSystemOfRecordId(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[rgb(20,16,60)] text-white"
              >
                <option value="">Select...</option>
                {systemsOfRecord.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  System Name
                </label>
                <input
                  type="text"
                  value={newSorName}
                  onChange={(e) => setNewSorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[rgb(20,16,60)] text-white"
                  placeholder="Pega, Salesforce, Custom..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Icon (optional)
                </label>
                <input
                  type="text"
                  value={newSorIcon}
                  onChange={(e) => setNewSorIcon(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[rgb(20,16,60)] text-white"
                  placeholder="icon name or URL"
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="interactive-button"
                  onClick={handleCreateSor}
                  disabled={!newSorName.trim()}
                >
                  Create System
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </StandardModal>
  );
}
