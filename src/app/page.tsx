"use client";

import { useState, useEffect } from "react";
import { CreateApplicationModal } from "./components/CreateApplicationModal";
import DeleteApplicationModal from "./components/DeleteApplicationModal";
import EditApplicationModal from "./components/EditApplicationModal";
import { useRouter } from "next/navigation";
import { FaTrash, FaPencilAlt } from "react-icons/fa";
import { fetchWithBaseUrl } from "./lib/fetchWithBaseUrl";
import { Service } from "./services/service";
import { buildDatabaseSystemPrompt } from "./lib/databasePrompt";
import { registerRuleTypes } from "./types/ruleTypeDefinitions";

// Initialize rule types on module load
registerRuleTypes();

/**
 * Main page component for the workflow application
 * Handles workflow listing, creation, and deletion
 */
export default function Home() {
  const [applications, setApplications] = useState<
    Array<{
      id: number;
      name: string;
      description: string;
      icon?: string | null;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingId, setIsNavigatingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);
  const router = useRouter();

  const refreshApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithBaseUrl(
        `/api/dynamic?ruleType=application`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.status}`);
      }
      const data = await response.json();
      setApplications(data.data);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch applications",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshApplications();
  }, []);

  const handleCreateWorkflow = async (name: string, description: string) => {
    try {
      setIsCreatingWorkflow(true);
      setError(null);
      setCreationProgress("Initializing application creation...");

      console.log("=== Creating New Application ===");
      console.log("Input:", { name, description });

      // Use the AI service to create the workflow
      const response = await Service.generateResponse(
        `Create a new application named "${name}" with description "${description}". First call saveApplication with the metadata to get the application id. Then create at least two distinct workflows for this application, using createCase with applicationid set to the new application id, followed by saveFields, saveView, and saveCase to complete each workflow. Do not finish until at least two workflows have been created and saved. If any case was created without applicationid, finalize by calling saveApplication with workflowIds to ensure associations.`,
        buildDatabaseSystemPrompt(),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Failed to create workflow: ${response.status} ${errorText}`,
        );
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body available");
      }

      const decoder = new TextDecoder();
      let isComplete = false;

      setCreationProgress("Creating application and workflows...");

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.text) {
                  setCreationProgress((prev) => prev + "\n" + data.text);
                }

                // Tool results are now sent as text messages, not as toolResult objects
                // The case creation success is handled in the text messages above

                if (data.done) {
                  isComplete = true;
                  setCreationProgress(
                    (prev) => prev + "\n✅ Application creation completed!",
                  );
                }

                // Check for timeout or other errors in the text content
                if (data.text && data.text.includes("timeout")) {
                  throw new Error(
                    "Application creation timed out. Please try again.",
                  );
                }

                // Check for incomplete workflow warnings
                if (
                  data.text &&
                  data.text.includes("WARNING: Application creation incomplete")
                ) {
                  throw new Error(
                    "Application creation was incomplete. Please try again.",
                  );
                }

                if (data.error) {
                  console.error("Streaming error received:", data.error);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!isComplete) {
        throw new Error("Application creation did not complete properly");
      }

      // Refresh applications to get the latest data
      await refreshApplications();
      setSuccessMessage("Application created successfully!");
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating application:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create application";
      setError(errorMessage);
      setCreationProgress((prev) => prev + "\n❌ " + errorMessage);
      // Don't close modal on error - let the user see the error in the modal
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const handleCardClick = async (applicationId: number) => {
    try {
      setIsNavigatingId(applicationId);
      // Fetch workflows for this application and open the first one
      const res = await fetchWithBaseUrl(
        `/api/database?table=Cases&applicationid=${applicationId}`,
      );
      const data = await res.json();
      const workflows = (data?.data as Array<{ id: number }> | undefined) || [];
      const first = workflows[0];
      if (first?.id) {
        router.push(`/workflow/${first.id}?applicationId=${applicationId}`);
      } else {
        // No workflows yet; stay on home for now
        setIsNavigatingId(null);
      }
    } catch (_e) {
      setIsNavigatingId(null);
    }
  };

  const handleEditApplication = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editTarget) return;

    try {
      const response = await fetchWithBaseUrl(
        `/api/database?table=Applications&id=${editTarget.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update application: ${response.status} ${errorText}`,
        );
      }

      // Update the application in the local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === editTarget.id
            ? { ...app, name: data.name, description: data.description }
            : app,
        ),
      );

      setEditTarget(null);
    } catch (error) {
      console.error("Error updating application:", error);
      alert("Failed to update application. Please try again.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Applications</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="interactive-button text-black hover:opacity-90"
        >
          New application
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 text-interactive">
          <p className="text-lg font-medium">No application available.</p>
          <p>Click "New application" to create a new one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => void handleCardClick(app.id)}
              role="button"
              tabIndex={0}
              aria-label={`Open application ${app.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleCardClick(app.id);
                }
              }}
              className="border border-white/30 rounded p-4 transition-all cursor-pointer relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 hover:border-white active:border-white/80"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-white">
                    {app.name}
                  </h2>
                  <p className="text-white mb-2 line-clamp-2">
                    {app.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditTarget({
                        id: app.id,
                        name: app.name,
                        description: app.description,
                      });
                    }}
                    className="btn-secondary w-8"
                    aria-label="Edit application"
                    title="Edit application"
                  >
                    <FaPencilAlt className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget({ id: app.id, name: app.name });
                    }}
                    className="btn-secondary w-8"
                    aria-label="Delete application"
                    title="Delete application"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {isNavigatingId === app.id && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <CreateApplicationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null); // Clear error when modal is closed
          setCreationProgress(""); // Clear progress when modal is closed
        }}
        onCreate={handleCreateWorkflow}
        isCreating={isCreatingWorkflow}
        creationProgress={creationProgress}
        creationError={error}
        title="Create new application"
      />
      <DeleteApplicationModal
        isOpen={!!deleteTarget}
        applicationId={deleteTarget?.id}
        applicationName={deleteTarget?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async (id) => {
          setApplications((prev) => prev.filter((a) => a.id !== id));
          setDeleteTarget(null);
        }}
      />
      <EditApplicationModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditApplication}
        initialData={
          editTarget
            ? { name: editTarget.name, description: editTarget.description }
            : { name: "", description: "" }
        }
      />
    </div>
  );
}
