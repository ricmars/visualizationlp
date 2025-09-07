"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import StandardModal from "@/app/components/StandardModal";
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
  isEmbedded?: boolean;
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
    systemOfRecordId: number | null;
    isEmbedded?: boolean;
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
  const [systemOfRecordId, setSystemOfRecordId] = useState<number | null>(
    initialData.systemOfRecordId,
  );
  const [isEmbedded, setIsEmbedded] = useState<boolean>(
    initialData.isEmbedded || false,
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setSystemOfRecordId(initialData.systemOfRecordId);
      setIsEmbedded(initialData.isEmbedded || false);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialData]);

  const canSave = useMemo(() => {
    return (
      !!name.trim() &&
      !!description.trim() &&
      (isEmbedded || Number.isFinite(systemOfRecordId || undefined))
    );
  }, [name, description, systemOfRecordId, isEmbedded]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await onSaveAction({
      id: initialData.id,
      name: name.trim(),
      description: description.trim(),
      systemOfRecordId: isEmbedded ? null : (systemOfRecordId as number),
      isEmbedded,
    });
    onCloseAction();
  }, [
    canSave,
    onSaveAction,
    initialData.id,
    name,
    description,
    systemOfRecordId,
    isEmbedded,
    onCloseAction,
  ]);

  const actions = useMemo(() => {
    const modalActions = [
      {
        id: "cancel",
        label: "Cancel",
        type: "secondary" as const,
        onClick: onCloseAction,
      },
      {
        id: "save",
        label: "Save",
        type: "primary" as const,
        onClick: handleSave,
        disabled: !canSave,
      },
    ];

    if (onDeleteAction && !isConfirmingDelete) {
      modalActions.unshift({
        id: "delete",
        label: "Delete",
        type: "secondary" as const,
        onClick: () => setIsConfirmingDelete(true),
      });
    }

    return modalActions;
  }, [onCloseAction, handleSave, canSave, onDeleteAction, isConfirmingDelete]);

  return (
    <>
      <StandardModal
        isOpen={isOpen}
        onCloseAction={onCloseAction}
        title="Edit Data Object"
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
                  setSystemOfRecordId(null as any);
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
        )}
      </StandardModal>

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
    </>
  );
}
