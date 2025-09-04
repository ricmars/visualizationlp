"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ModalPortal from "@/app/components/ModalPortal";

type SystemOfRecord = {
  id: number;
  name: string;
  icon?: string | null;
};

type AddDataObjectModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  caseId: number;
  systemsOfRecord: SystemOfRecord[];
  onCreateSorAction?: (name: string, icon?: string) => Promise<SystemOfRecord>;
  onSaveAction: (data: {
    name: string;
    description: string;
    caseid: number;
    systemOfRecordId: number;
    model?: any;
  }) => Promise<void>;
};

export default function AddDataObjectModal({
  isOpen,
  onCloseAction,
  caseId,
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
      Number.isFinite(systemOfRecordId || undefined)
    );
  }, [name, description, systemOfRecordId]);

  const handleCreate = async () => {
    if (!canSave) return;
    await onSaveAction({
      name: name.trim(),
      description: description.trim(),
      caseid: caseId,
      systemOfRecordId: systemOfRecordId as number,
      model: { fields: [] },
    });
    setName("");
    setDescription("");
    setSystemOfRecordId(null);
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

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="absolute inset-0 z-40">
        <div
          className="absolute inset-0 modal-backdrop modal-overlay"
          onClick={onCloseAction}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="modal-surface rounded-lg shadow-xl border overflow-hidden border-gray-700 w-[560px]">
            <div className="p-4">
              <div className="lp-modal-header">
                <h3 className="text-lg font-semibold text-white">
                  Add Data Object
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCloseAction}
                    className="btn-secondary px-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    className="interactive-button px-3"
                    disabled={!canSave}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
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
            </div>

            {/* Actions moved to header; footer removed */}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
