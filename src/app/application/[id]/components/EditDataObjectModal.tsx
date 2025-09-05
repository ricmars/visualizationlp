"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ModalPortal from "@/app/components/ModalPortal";
import DeleteDataObjectModal from "@/app/components/DeleteDataObjectModal";

type SystemOfRecord = {
  id: number;
  name: string;
  icon?: string | null;
};

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  model?: any;
};

type EditDataObjectModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  systemsOfRecord: SystemOfRecord[];
  initialData: DataObject;
  onSaveAction: (updates: {
    id: number;
    name: string;
    description: string;
    systemOfRecordId: number;
  }) => Promise<void>;
  onDeleteAction?: (id: number) => Promise<void> | void;
};

export default function EditDataObjectModal({
  isOpen,
  onCloseAction,
  systemsOfRecord,
  initialData,
  onSaveAction,
  onDeleteAction,
}: EditDataObjectModalProps) {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [systemOfRecordId, setSystemOfRecordId] = useState<number>(
    initialData.systemOfRecordId,
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setSystemOfRecordId(initialData.systemOfRecordId);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialData]);

  const canSave = useMemo(() => {
    return (
      !!name.trim() &&
      !!description.trim() &&
      Number.isFinite(systemOfRecordId || undefined)
    );
  }, [name, description, systemOfRecordId]);

  const handleSave = async () => {
    if (!canSave) return;
    await onSaveAction({
      id: initialData.id,
      name: name.trim(),
      description: description.trim(),
      systemOfRecordId: systemOfRecordId as number,
    });
    onCloseAction();
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
                  Edit Data Object
                </h3>
                <div className="flex items-center gap-2">
                  {onDeleteAction && !isConfirmingDelete && (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="btn-secondary px-3"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={onCloseAction}
                    className="btn-secondary px-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="interactive-button px-3"
                    disabled={!canSave}
                  >
                    Save
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

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  System of Record
                </label>
                <select
                  value={systemOfRecordId ?? ""}
                  onChange={(e) =>
                    setSystemOfRecordId(
                      e.target.value
                        ? parseInt(e.target.value, 10)
                        : ("" as any),
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
            </div>
          </div>
        </div>
      </div>
      <DeleteDataObjectModal
        isOpen={isConfirmingDelete}
        objectid={initialData.id}
        objectName={initialData.name}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={async (id) => {
          if (!onDeleteAction) return;
          await onDeleteAction(id);
          setIsConfirmingDelete(false);
        }}
      />
    </ModalPortal>
  );
}
