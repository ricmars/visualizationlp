import React, { useState, useEffect } from "react";
import { MODEL_UPDATED_EVENT } from "@/app/workflow/[id]/utils/constants";
import { FaUndo } from "react-icons/fa";

interface CheckpointHistoryItem {
  id: string;
  description: string;
  user_command: string;
  status: string;
  source: string;
  created_at: string;
  finished_at: string;
  tools_executed: string[];
  changes_count: number;
  updated_rules?: Array<{ name: string; type: string; operation: string }>;
}

interface ChangesPanelProps {
  caseid?: number;
  applicationid?: number;
  onRefresh?: () => void; // Callback when restoration happens
}

export default function ChangesPanel({
  caseid,
  applicationid,
  onRefresh,
}: ChangesPanelProps) {
  const [history, setHistory] = useState<CheckpointHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    const handler = () => fetchHistory();
    try {
      window.addEventListener(MODEL_UPDATED_EVENT, handler as EventListener);
    } catch {}
    return () => {
      try {
        window.removeEventListener(
          MODEL_UPDATED_EVENT,
          handler as EventListener,
        );
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let url = "/api/checkpoint/history";
      const params = new URLSearchParams();

      if (applicationid) {
        params.append("applicationid", applicationid.toString());
      } else if (caseid) {
        params.append("caseid", caseid.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch checkpoint history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (checkpointId: string) => {
    if (
      !confirm(
        "Are you sure you want to restore to this checkpoint? This will undo all changes made after this point.",
      )
    ) {
      return;
    }

    setIsRestoring(checkpointId);
    try {
      const response = await fetch("/api/checkpoint?action=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId }),
      });

      if (response.ok) {
        if (onRefresh) {
          onRefresh();
        }
        window.location.reload();
      } else {
        console.error("Failed to restore checkpoint");
      }
    } catch (error) {
      console.error("Error restoring checkpoint:", error);
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading rules updates...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-interactive">
            No rules updates available
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((checkpoint, index) => (
              <div key={checkpoint.id}>
                {/* Checkpoint Header: date/time with restore icon */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg text-interactive">
                    {new Date(checkpoint.created_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                  {checkpoint.status === "historical" && (
                    <button
                      onClick={() => handleRestore(checkpoint.id)}
                      disabled={isRestoring === checkpoint.id}
                      aria-label="Restore checkpoint"
                      title="Restore"
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 disabled:opacity-50"
                    >
                      {isRestoring === checkpoint.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                      ) : (
                        <FaUndo className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* Updated rules list */}
                {/* Actions (tools executed), excluding getXXX */}
                {Array.isArray(checkpoint.tools_executed) &&
                  checkpoint.tools_executed.filter((t) => !/^get/i.test(t))
                    .length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs uppercase opacity-60 mb-1">
                        Actions
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {checkpoint.tools_executed
                          .filter((t) => !/^get/i.test(t))
                          .map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-interactive"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Updated rules list */}
                {checkpoint.updated_rules &&
                  checkpoint.updated_rules.length > 0 && (
                    <div className="mt-3">
                      <ul className="text-sm space-y-2">
                        {checkpoint.updated_rules.map((r, idx) => (
                          <li key={idx}>
                            <div className="font-medium text-interactive">
                              {r.name}
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">
                              {r.type} <span className="mx-1">•</span>{" "}
                              {r.operation}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Timeline Connection */}
                {index < history.length - 1 && (
                  <div className="flex justify-center mt-4">
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
