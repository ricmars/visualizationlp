"use client";

import { useState, useEffect } from "react";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import EditApplicationModal from "./components/EditApplicationModal";
import { useRouter } from "next/navigation";
import { FaTrash, FaPencilAlt, FaTimes } from "react-icons/fa";
import { fetchWithBaseUrl } from "./lib/fetchWithBaseUrl";

/**
 * Deletes an application and all its associated workflows, fields, views, and checkpoints
 */
async function deleteApplication(applicationId: number): Promise<void> {
  // 1) Load all cases/workflows for this application
  const casesRes = await fetchWithBaseUrl(
    `/api/database?table=Objects&applicationid=${applicationId}`,
  );
  if (!casesRes.ok) {
    const err = await casesRes.text();
    throw new Error(`Failed to load workflows: ${err}`);
  }
  const casesJson = await casesRes.json();
  const workflows: Array<{ id: number; name?: string }> =
    (casesJson?.data as any[]) || [];

  // 2) For each workflow, delete checkpoints then delete the case (cascades fields/views)
  for (const wf of workflows) {
    await fetchWithBaseUrl(`/api/checkpoint?action=deleteAll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectid: wf.id }),
    });

    const delCaseRes = await fetchWithBaseUrl(
      `/api/dynamic?ruleType=case&id=${wf.id}`,
      { method: "DELETE" },
    );
    if (!delCaseRes.ok) {
      const err = await delCaseRes.text();
      throw new Error(`Failed to delete workflow ${wf.id}: ${err}`);
    }
  }

  // 3) Delete the application itself
  const delAppRes = await fetchWithBaseUrl(
    `/api/dynamic?ruleType=application&id=${applicationId}`,
    { method: "DELETE" },
  );
  if (!delAppRes.ok) {
    const err = await delAppRes.text();
    throw new Error(`Failed to delete application: ${err}`);
  }
}

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshApplications();
  }, []);

  const handleCardClick = async (applicationId: number) => {
    try {
      setIsNavigatingId(applicationId);
      // Fetch workflows for this application and open the first one
      const res = await fetchWithBaseUrl(
        `/api/database?table=Objects&applicationid=${applicationId}`,
      );
      const data = await res.json();
      const workflows = (data?.data as Array<{ id: number }> | undefined) || [];
      const first = workflows[0];
      if (first?.id) {
        router.push(`/application/${applicationId}?object=${first.id}`);
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
        <div className="success-banner">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="success-banner-close"
            aria-label="Dismiss success message"
            title="Dismiss"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h1>Applications</h1>
        <button
          onClick={() => router.push("/application/create")}
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
                  <h2 className="mb-1">{app.name}</h2>
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
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete application"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently remove the application, all of its workflows, fields, views, and checkpoints.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteApplication(deleteTarget.id);
          setApplications((prev) =>
            prev.filter((a) => a.id !== deleteTarget.id),
          );
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
