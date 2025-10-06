import React, { useEffect, useMemo, useRef, useState } from "react";
import DecisionTableAuthoring, {
  DecisionTableAuthoringRef,
} from "./DecisionTableAuthoring";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { Field, DecisionTable, Stage } from "../types/types";

interface DecisionTablesPanelProps {
  stages: Stage[];
  fields: Field[];
  decisionTables: DecisionTable[];
  onSaveDecisionTable: (decisionTable: DecisionTable) => Promise<void> | void;
  onDeleteDecisionTable: (id: number) => Promise<void> | void;
}

export default function DecisionTablesPanel({
  stages,
  fields,
  decisionTables,
  onSaveDecisionTable,
  onDeleteDecisionTable,
}: DecisionTablesPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    typeof decisionTables[0]?.id === "number"
      ? (decisionTables[0]?.id as number)
      : null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const authorRef = useRef<DecisionTableAuthoringRef>(null);
  // Ensure selection stays valid when the list updates
  useEffect(() => {
    const exists = decisionTables.some((d) => d.id === selectedId);
    if (!exists) {
      const firstId =
        typeof decisionTables[0]?.id === "number"
          ? (decisionTables[0]?.id as number)
          : null;
      setSelectedId(firstId);
    }
  }, [decisionTables, selectedId]);

  const steps = useMemo(() => {
    const all: Array<{ id: number; name: string }> = [];
    stages.forEach((stage) => {
      stage.processes.forEach((process) => {
        process.steps.forEach((step) => {
          all.push({ id: step.id, name: step.name });
        });
      });
    });
    return all;
  }, [stages]);

  const selected = decisionTables.find((d) => d.id === selectedId) || null;

  // Inline edit removed; name/description are edited in the right panel

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center">
              Decision Tables{" "}
              <span className="ml-2 font-normal text-white">
                ({decisionTables.length})
              </span>
            </h2>
            <button
              className="interactive-button"
              onClick={() => {
                const empty: DecisionTable = {
                  name: "New decision table",
                  description: "",
                  fieldDefs: [],
                  rowData: [],
                } as DecisionTable;
                void Promise.resolve(onSaveDecisionTable(empty));
              }}
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {decisionTables.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/20 rounded-lg">
                <p className="text-white/80 mb-3">No decision tables yet.</p>
              </div>
            ) : (
              decisionTables.map((dt) => (
                <div
                  key={dt.id ?? `dt-${Math.random()}`}
                  className="flex items-center gap-2"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(dt.id as number)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(dt.id as number);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors border ${
                      selectedId === dt.id
                        ? "border-white bg-[rgb(20,16,60)] text-white"
                        : "border-transparent hover:bg-[rgb(20,16,60)] hover:text-white"
                    }`}
                  >
                    <div>
                      <div className="font-medium flex items-center justify-between">
                        <span>{dt.name}</span>
                      </div>
                      {dt.description ? (
                        <div className="text-sm opacity-80">
                          {dt.description}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="btn-secondary w-8"
                    title="Delete decision table"
                    aria-label="Delete decision table"
                    onClick={() => setPendingDeleteId(dt.id as number)}
                  >
                    {/* trash icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="mx-auto"
                      aria-hidden="true"
                    >
                      <path d="M9 3h6a1 1 0 0 1 1 1v2h4v2h-1v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8H3V6h4V4a1 1 0 0 1 1-1zm1 3h4V5h-4v1zM6 8v11h12V8H6zm4 2h2v7h-2v-7zm4 0h2v7h-2v-7z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">
                  Edit Decision Table
                </h3>
                <p className="text-sm text-white/70">
                  Update name, description, rules, and default behavior.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="interactive-button"
                  onClick={() => authorRef.current?.save()}
                >
                  Save
                </button>
              </div>
            </div>
            <DecisionTableAuthoring
              ref={authorRef}
              decisionTable={selected}
              fields={fields}
              steps={steps}
              onSave={(dt) => void onSaveDecisionTable(dt)}
              onCancel={() => {}}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-white/70">
            Select a decision table to edit or create a new one.
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={pendingDeleteId !== null}
        title="Delete Decision Table"
        message="Are you sure you want to delete this decision table? This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId;
          setPendingDeleteId(null);
          if (typeof id === "number") {
            void Promise.resolve(onDeleteDecisionTable(id)).then(() => {
              if (selectedId === id) {
                const remaining = decisionTables.filter((d) => d.id !== id);
                setSelectedId((remaining[0]?.id as number | undefined) ?? null);
              }
            });
          }
        }}
      />
    </div>
  );
}
