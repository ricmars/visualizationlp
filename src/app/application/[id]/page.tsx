"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamic imports to prevent SSR issues with Pega components
const WorkflowLifecycleView = dynamic(
  () => import("../../components/WorkflowLifecycleView"),
  { ssr: false },
);
import { ChatMessage } from "../../components/ChatInterface";
import SystemOfRecordTag from "../../components/SystemOfRecordTag";
import FreeFormSelectionOverlay from "./components/FreeFormSelectionOverlay";
import QuickChatOverlay from "./components/QuickChatOverlay";
import ChatPanelContent from "./components/ChatPanelContent";
import usePersistentTab from "./hooks/usePersistentTab";
import { useFreeFormSelection } from "./hooks/useFreeFormSelection";
import usePreviewIframe from "./hooks/usePreviewIframe";
import type { channel, DecisionTable } from "../../types/types";
import useStepsUpdate from "./hooks/useStepsUpdate";
import useFieldMutations from "./hooks/useFieldMutations";
import useWorkflowMutations from "./hooks/useWorkflowMutations";
import useChatMessaging from "./hooks/useChatMessaging";
import { useQuickChat } from "./hooks/useQuickChat";
import { useViewMutations } from "./hooks/useViewMutations";
import {
  ACTIVE_TAB_STORAGE_KEY,
  CHECKPOINTS_STORAGE_KEY,
  MAX_CHECKPOINTS,
  MODEL_UPDATED_EVENT,
} from "./utils/constants";
import { Field, Stage, Process, Step, WorkflowModel } from "../../types/types";
// import { StepType } from "../../utils/stepTypes";
import { registerRuleTypes } from "../../types/ruleTypeDefinitions";
// validateModelIds handled inside useWorkflowData
import { useWorkflowData } from "./hooks/useWorkflowData";

// Initialize rule types on module load
registerRuleTypes();

// Local checkpoint interface for workflow change tracking
interface WorkflowCheckpoint {
  id: number;
  timestamp: string;
  description: string;
  model: WorkflowModel;
}
import { v4 as uuidv4 } from "uuid";
import ViewsPanel from "../../components/ViewsPanel";
import DecisionTablesPanel from "../../components/DecisionTablesPanel";
import FieldsList from "../../components/FieldsList";
//
import ApplicationMenuBar from "./components/ApplicationMenuBar";
import DataPanel from "./components/DataPanel";
import EditDataObjectModal from "./components/EditDataObjectModal";
import AddDataObjectModal from "./components/AddDataObjectModal";
import WorkflowTabs from "./components/WorkflowTabs";
import FieldsHeader from "./components/FieldsHeader";
import ViewsHeader from "./components/ViewsHeader";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import AddFieldModal from "../../components/AddFieldModal";
import EditFieldModal from "../../components/EditFieldModal";
import { DB_TABLES, DB_COLUMNS } from "../../types/database";
import { fetchWithBaseUrl } from "../../lib/fetchWithBaseUrl";
import AddStageModal from "../../components/AddStageModal";
import AddProcessModal from "../../components/AddProcessModal";
import EditWorkflowModal from "../../components/EditWorkflowModal";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { StepType } from "@/app/utils/stepTypes";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
import ChangesPanel from "../../components/ChangesPanel";
import RulesCheckoutPanel from "./components/RulesCheckoutPanel";
import FloatingChatModal from "./components/FloatingChatModal";
import FloatingLeftPanelModal from "./components/FloatingLeftPanelModal";
import FloatingChatIcon from "./components/FloatingChatIcon";
import { useResponsive } from "../../contexts/ResponsiveContext";
import useDataObjectMutations from "./hooks/useDataObjectMutations";
import { CreateThemeModal } from "../../components/CreateThemeModal";
import { ThemeModal } from "../../components/ThemeModal";
import { ThemeDetailView } from "../../components/ThemeDetailView";
const Icon = dynamic(() =>
  import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
);

// Add ToolResult type for tool result objects
export type ToolResult = {
  id?: number;
  name?: string;
};

// Add FieldWithType type for fields with a 'type' property
export type FieldWithType = {
  name: string;
  type: string;
};

// Field shape expected by live preview (distinct from app database Field)
type PreviewField = {
  name: string;
  label: string;
  type: string;
  refType?: string;
  source?: "" | "User input" | "Calculated";
  highlighted?: boolean;
  primary?: boolean;
  fillAvailableSpace?: boolean;
  value?: string | number | boolean | Array<string>;
  displayValue?: string | Array<string>;
  options?: string[];
};

// moved to ./utils/constants

// DatabaseCase type provided by useWorkflowData

interface WorkflowState {
  stages: Stage[];
}

interface ComposedModel {
  name: string;
  description?: string;
  stages: Stage[];
  decisionTables?: DecisionTable[];
}

export default function WorkflowPage() {
  // 1. Router and params hooks
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  // In the new route, path param is applicationId, query param is object id
  const applicationIdParam = params?.id as string;
  const objectIdQuery = searchParams?.get("object");
  const id = objectIdQuery || "";

  // 2. All useState hooks
  const {
    model,
    setModelAction: setModel,
    fields,
    setFields,
    dataObjectFields,
    setDataObjectFields,
    views,
    setViews,
    dataObjects,
    setDataObjects,
    systemsOfRecord,
    selectedCase,
    setSelectedCaseAction: setSelectedCase,
    loading,
    error,
    loadWorkflow: _loadWorkflow,
    refreshWorkflowData,
    fetchCaseData: _fetchCaseData,
  } = useWorkflowData(id);
  const [activeStage, setActiveStage] = useState<string>();
  const [activeProcess, setActiveProcess] = useState<string>();
  const [activeStep, setActiveStep] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<channel>("WorkPortal");
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [activeTab, setActiveTab] = usePersistentTab<
    | "workflow"
    | "fields"
    | "data"
    | "views"
    | "decisionTables"
    | "chat"
    | "history"
  >(ACTIVE_TAB_STORAGE_KEY, "workflow");

  // Custom tab change handler that auto-selects first view when switching to views tab
  const handleTabChange = (
    newTab:
      | "workflow"
      | "fields"
      | "data"
      | "views"
      | "decisionTables"
      | "chat"
      | "history",
  ) => {
    setActiveTab(newTab);

    // Auto-select first view when switching to views tab if no view is currently selected
    if (newTab === "views" && !selectedView && views && views.length > 0) {
      const firstView = views[0];
      if (firstView && firstView.id) {
        setSelectedView(`db-${firstView.id}`);
      }
    }
  };
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [checkpoints, setCheckpoints] = useState<WorkflowCheckpoint[]>([]);
  const [isAddDataObjectModalOpen, setIsAddDataObjectModalOpen] =
    useState(false);
  const [editingDataObjectId, setEditingDataObjectId] = useState<number | null>(
    null,
  );
  const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
  const [isAddProcessModalOpen, setIsAddProcessModalOpen] = useState(false);
  const [isEditWorkflowModalOpen, setIsEditWorkflowModalOpen] = useState(false);
  const [isCreateWorkflowModalOpen, setIsCreateWorkflowModalOpen] =
    useState(false);
  const [selectedStageForProcess, setSelectedStageForProcess] = useState<
    string | null
  >(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [applicationWorkflows, setApplicationWorkflows] = useState<
    Array<{ id: number; name: string; isEmbedded?: boolean }>
  >([]);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [applicationName, setApplicationName] = useState<string>("");
  const [newProcessName, setNewProcessName] = useState("");
  const [leftPanelView, setLeftPanelView] = useState<"history" | "checkout">(
    "history",
  );
  const [isDeleteAllCheckpointsModalOpen, setIsDeleteAllCheckpointsModalOpen] =
    useState(false);
  const [selectedDataObjectId, setSelectedDataObjectId] = useState<
    number | null
  >(null);
  const [isCreateThemeModalOpen, setIsCreateThemeModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [decisionTables, setDecisionTables] = useState<
    Array<{
      id: number;
      name: string;
      description?: string;
      fieldDefs: any[];
      rowData: any[];
      returnElse?: string;
    }>
  >([]);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2000);
  }, []);

  // Responsive state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Use responsive context
  const {
    isMobile,
    isTablet,
    isDesktop,
    isLeftPanelModalOpen,
    setIsLeftPanelModalOpen,
  } = useResponsive();

  // Free Form selection & quick chat state
  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [quickChatText, setQuickChatText] = useState("");
  // Workflow model memo used across UI
  const workflowModel: WorkflowState = useMemo(() => {
    if (!model) {
      return { stages: [] };
    }

    return {
      stages: model.stages || [],
    };
  }, [model]);

  // Function to generate the model data structure for preview
  const generateModelData = useCallback(
    async (currentFields: Field[], _currentStages: Stage[]) => {
      // Generate caseTypes array with all workflows, their stages, steps and fields
      const caseTypes = [];

      // Debug logging
      console.debug(
        "[generateModelData] applicationWorkflows:",
        applicationWorkflows,
      );
      console.debug("[generateModelData] selectedCase:", selectedCase);
      console.debug("[generateModelData] currentFields:", currentFields);

      // If applicationWorkflows is empty, include the current selected workflow
      const workflowsToProcess =
        applicationWorkflows.length > 0
          ? applicationWorkflows
          : selectedCase
          ? [{ id: selectedCase.id, name: selectedCase.name }]
          : [];

      // If we have no workflows to process, return early with empty caseTypes
      if (workflowsToProcess.length === 0) {
        console.warn(
          "[generateModelData] No workflows to process, returning empty caseTypes",
        );
      }

      for (const workflow of workflowsToProcess) {
        try {
          // Fetch the workflow data for this workflow
          const workflowResponse = await fetchWithBaseUrl(
            `/api/database?table=${DB_TABLES.OBJECTS}&id=${workflow.id}`,
          );
          if (!workflowResponse.ok) {
            console.error(`Failed to fetch workflow ${workflow.id}`);
            continue;
          }

          const workflowData = await workflowResponse.json();

          // The API response has structure {success: true, data: {...}}
          const actualWorkflowData = workflowData.data || workflowData;
          const workflowModel =
            typeof actualWorkflowData.model === "string"
              ? JSON.parse(actualWorkflowData.model)
              : actualWorkflowData.model;

          if (!workflowModel || !workflowModel.stages) {
            console.warn(
              `[generateModelData] Skipping workflow ${workflow.name} - no model or stages`,
            );
            continue;
          }

          // Fetch fields for this workflow
          const workflowFieldsResponse = await fetchWithBaseUrl(
            `/api/database?table=${DB_TABLES.FIELDS}&objectid=${workflow.id}`,
          );
          let workflowFields: Field[] = [];
          if (workflowFieldsResponse.ok) {
            const fieldsData = await workflowFieldsResponse.json();

            // Check if the response has a data property like other API calls
            workflowFields = Array.isArray(fieldsData)
              ? fieldsData
              : Array.isArray(fieldsData?.data)
              ? fieldsData.data
              : [];
          } else {
            console.warn(
              `[generateModelData] Failed to fetch fields for ${workflow.name}:`,
              workflowFieldsResponse.status,
            );
          }

          // Fetch views for this workflow
          const workflowViewsResponse = await fetchWithBaseUrl(
            `/api/database?table=${DB_TABLES.VIEWS}&objectid=${workflow.id}`,
          );
          let workflowViews: any[] = [];
          if (workflowViewsResponse.ok) {
            const viewsData = await workflowViewsResponse.json();

            // Check if the response has a data property like other API calls
            workflowViews = Array.isArray(viewsData)
              ? viewsData
              : Array.isArray(viewsData?.data)
              ? viewsData.data
              : [];
          } else {
            console.warn(
              `[generateModelData] Failed to fetch views for ${workflow.name}:`,
              workflowViewsResponse.status,
            );
          }

          const tmpStages = [] as any[];
          for (const stage of workflowModel.stages) {
            const tmpSteps = [] as any[];
            for (const process of stage.processes) {
              for (const step of process.steps) {
                if (step.type === "Collect information") {
                  // Only "Collect information" steps can have fields
                  if (typeof (step as any).viewId === "number") {
                    const view = workflowViews.find(
                      (v) => v.id === (step as any).viewId,
                    );
                    if (view) {
                      try {
                        const viewModel =
                          typeof view.model === "string"
                            ? JSON.parse(view.model)
                            : view.model;
                        if (Array.isArray(viewModel.fields)) {
                          const stepFields = viewModel.fields
                            .map(
                              (ref: {
                                fieldId: number;
                                required?: boolean;
                              }) => {
                                const field = workflowFields.find(
                                  (cf) => cf.id === ref.fieldId,
                                );
                                if (!field) {
                                  console.warn(
                                    `[generateModelData] Field not found for fieldId ${ref.fieldId} in workflow ${workflow.name}`,
                                  );
                                  return null;
                                }
                                return {
                                  name: field.id,
                                  required: Boolean(ref.required),
                                };
                              },
                            )
                            .filter((f: any) => f !== null);
                          tmpSteps.push({
                            id: step.viewId,
                            name: step.name,
                            fields: stepFields as Array<{
                              name: string;
                              required: boolean;
                            }>,
                          });
                          continue;
                        }
                      } catch {
                        // ignore JSON errors
                      }
                    }
                  }
                  // For "Collect information" steps without valid viewId, push without fields
                  tmpSteps.push({
                    id: step.id,
                    name: step.name,
                    type: step.type,
                    // No fields array for steps without valid viewId
                  });
                } else {
                  // For non-"Collect information" steps, push without fields array
                  tmpSteps.push({
                    id: step.id,
                    name: step.name,
                    type: step.type,
                    // No fields array for non-collect steps
                  });
                }
              }
            }
            // For live preview, omit processes and provide flattened steps directly under the stage
            tmpStages.push({
              id: stage.id,
              name: stage.name,
              steps: tmpSteps,
            });
          }

          const fieldsWithValues: PreviewField[] = workflowFields.map(
            (f: any) => {
              const dv = f?.sampleValue;
              let value: any = undefined;
              if (dv !== undefined && dv !== null) {
                if (typeof dv === "string") {
                  try {
                    value = JSON.parse(dv);
                  } catch {
                    value = dv;
                  }
                } else {
                  value = dv;
                }
              }
              // Normalize options: only include for Dropdown; ensure it's an array
              let normalizedOptions: string[] | undefined = undefined;
              if (f?.type === "Dropdown" || f?.type === "RadioButtons") {
                const rawOptions = (f as any)?.options;
                if (Array.isArray(rawOptions)) {
                  normalizedOptions = rawOptions as string[];
                } else if (typeof rawOptions === "string") {
                  try {
                    const parsed = JSON.parse(rawOptions);
                    if (Array.isArray(parsed)) {
                      normalizedOptions = parsed as string[];
                    }
                  } catch {
                    // ignore JSON errors
                  }
                }
              }

              const base: PreviewField = {
                name: f.id,
                label: f.label || f.name,
                type: f.type,
                primary: f.primary,
                highlighted: f.highlighted,
                value,
              };

              if (normalizedOptions !== undefined) {
                (base as any).options = normalizedOptions;
              }

              // Add refType for reference field types
              const referenceFieldTypes = [
                "EmbedDataSingle",
                "EmbedDataMulti",
                "DataReferenceSingle",
                "DataReferenceMulti",
                "CaseReferenceSingle",
                "CaseReferenceMulti",
              ];

              if (referenceFieldTypes.includes(f.type)) {
                if (f.refObjectId) {
                  (base as any).refType = f.refObjectId.toString();
                }
              }

              return base;
            },
          );

          caseTypes.push({
            name: workflow.name,
            fields: fieldsWithValues,
            creationFields: [],
            stages: tmpStages,
            data: [], // Add empty data array for caseTypes (workflows don't have sample data like data objects)
          });
        } catch (error) {
          console.error(`Error loading workflow ${workflow.name}:`, error);
          // Add empty case type if there's an error
          caseTypes.push({
            name: workflow.name,
            fields: [],
            creationFields: [],
            stages: [],
            data: [], // Add empty data array for caseTypes
          });
        }
      }

      // Generate dataTypes array with data objects, their fields, and sample records
      const dataTypes = [];
      for (const dataObject of dataObjects) {
        try {
          // Fetch records for this data object
          const recordsResponse = await fetchWithBaseUrl(
            `/api/database?table=${DB_TABLES.OBJECT_RECORDS}&objectid=${dataObject.id}`,
          );

          let records = [];
          if (recordsResponse.ok) {
            const recordsResult = await recordsResponse.json();
            records = recordsResult.data || [];
          }

          // Get fields for this data object
          const dataObjectFieldsForType = dataObjectFields.filter(
            (field) => field.objectid === dataObject.id,
          );

          // Format fields according to the required structure
          const formattedFields = dataObjectFieldsForType
            .filter((field) => field.id !== undefined && field.id !== null)
            .map((field) => ({
              name: field.id!.toString(), // Use field ID as name
              label: field.label,
              type: field.type,
              primary: field.primary,
            }));

          // Format records according to the required structure
          const formattedData = records.map((record: any) => {
            const recordData: Record<string, any> = {};

            // Add field values using field IDs as keys
            if (record.data && typeof record.data === "object") {
              for (const [fieldName, value] of Object.entries(record.data)) {
                // Find the field by name to get its ID
                const field = dataObjectFieldsForType.find(
                  (f) => f.name === fieldName,
                );
                if (field && field.id !== undefined && field.id !== null) {
                  recordData[field.id.toString()] = value;
                }
              }
            }

            // Add the record ID
            recordData.ID = record.id.toString();

            return recordData;
          });

          dataTypes.push({
            name: dataObject.name,
            id: dataObject.id.toString(),
            fields: formattedFields,
            data: formattedData,
            isEmbedded: dataObject.isEmbedded || false,
          });
        } catch (error) {
          console.error(
            `Error loading data for object ${dataObject.name}:`,
            error,
          );
          // Add empty data type if there's an error
          dataTypes.push({
            name: dataObject.name,
            id: dataObject.id.toString(),
            fields: [],
            data: [],
            isEmbedded: dataObject.isEmbedded || false,
          });
        }
      }

      return {
        fullUpdate: true,
        appName: selectedCase?.name || "Workflow",
        Channel: selectedChannel,
        industry: "Banking",
        userName: "John Smith",
        userLocale: "en-EN",
        caseName: selectedCase?.name || "Workflow",
        portals: [
          {
            pages: [
              {
                layout: "list-data",
                heading: "Records Manager",
                icon: "disc-stack-solid",
                isActive: false,
              },
            ],
            name: "Work Portal",
            channel: "WorkPortal",
          },
        ],
        caseTypes,
        dataTypes,
      };

      console.debug("[generateModelData] Final caseTypes:", caseTypes);
      console.debug(
        "[generateModelData] Final dataTypes length:",
        dataTypes.length,
      );
    },
    [
      selectedCase,
      selectedChannel,
      dataObjects,
      dataObjectFields,
      applicationWorkflows,
    ],
  );

  // Quick selection summary string for QuickChat overlay
  // quickInputRef already defined for QuickChatOverlay usage

  // Theme handlers
  const handleCreateTheme = async (
    name: string,
    description: string,
    applicationId: number,
    logoURL?: string,
  ) => {
    try {
      const response = await fetch("/api/dynamic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "saveTheme",
          params: {
            name,
            description,
            applicationid: applicationId,
            isSystemTheme: false,
            model: {},
            logoURL,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create theme");
      }

      const data = await response.json();
      const created = data?.data;
      setSelectedThemeId(created?.id ?? null);
      setSelectedTheme(created || null);
      setIsCreateThemeModalOpen(false);
      showToast("Theme created successfully");
      try {
        window.dispatchEvent(new CustomEvent("theme-updated"));
      } catch {}
    } catch (error) {
      console.error("Error creating theme:", error);
      throw error;
    }
  };

  const handleEditTheme = (theme: any) => {
    setEditingTheme(theme);
    setIsThemeModalOpen(true);
  };

  const handleSaveTheme = async (
    id: number,
    name: string,
    description: string,
    model: any,
    logoURL?: string,
  ) => {
    try {
      const response = await fetch("/api/dynamic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "saveTheme",
          params: {
            id,
            name,
            description,
            applicationid: applicationId,
            model,
            logoURL,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save theme");
      }

      const json = await response.json();
      const updated = json?.data;
      setIsThemeModalOpen(false);
      setEditingTheme(null);
      if (updated && selectedTheme && selectedTheme.id === updated.id) {
        setSelectedTheme(updated);
      }
      showToast("Theme saved successfully");
      try {
        window.dispatchEvent(new CustomEvent("theme-updated"));
      } catch {}
    } catch (error) {
      console.error("Error saving theme:", error);
      throw error;
    }
  };

  const handleDeleteTheme = async (themeId: number) => {
    try {
      const response = await fetch("/api/dynamic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteTheme",
          params: { id: themeId },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete theme");
      }

      if (selectedThemeId === themeId) {
        setSelectedThemeId(null);
      }
      if (selectedTheme && selectedTheme.id === themeId) {
        setSelectedTheme(null);
      }
      showToast("Theme deleted successfully");
      try {
        window.dispatchEvent(new CustomEvent("theme-updated"));
      } catch {}
    } catch (error) {
      console.error("Error deleting theme:", error);
      showToast("Failed to delete theme");
    }
  };

  const handleThemeSelect = useCallback(
    (themeId: number | null) => {
      setSelectedThemeId(themeId);
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (themeId) {
        params.set("theme", String(themeId));
        // Clear object parameter when selecting a theme
        params.delete("object");
      } else {
        params.delete("theme");
      }
      router.push(`/application/${applicationId}?${params.toString()}`);
    },
    [router, applicationId, searchParams],
  );

  // 3. All useRef hooks
  const addFieldButtonRef = useRef<HTMLButtonElement>(null);
  const generatePreviewModelAction = useCallback(
    async () => await generateModelData(fields, workflowModel.stages),
    [fields, workflowModel.stages, generateModelData],
  );

  // When channel changes, notify preview after state commit
  useEffect(() => {
    if (isPreviewVisible) {
      window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
    }
  }, [selectedChannel, isPreviewVisible]);

  const {
    containerRef: previewContainerRef,
    requestSelectedIdsInRect,
    sendWorkflowChangeMessage,
  } = usePreviewIframe({
    enabled: isPreviewVisible,
    selectedChannel,
    generateModelAction: generatePreviewModelAction,
    selectedTheme,
    selectedCaseName: selectedCase?.name,
  });

  const {
    isFreeFormSelecting,
    selectionRect,
    selectedFieldIds,
    selectedViewIds,
    selectedStageIds,
    selectedProcessIds,
    selectedStepIds,
    quickOverlayPosition,
    beginFreeFormSelection,
    onSelectionMouseDown,
    onSelectionMouseMove,
    onSelectionMouseUp,
  } = useFreeFormSelection({
    activeTab,
    selectedView,
    onOpenQuickChatAction: () => setIsQuickChatOpen(true),
    isDataObjectView: selectedDataObjectId !== null,
    resolveExternalIdsAction: requestSelectedIdsInRect,
  });

  // replaced by useQuickChat

  // Resizing mouse handlers are provided by useChatPanel

  // Load checkpoints from sessionStorage
  useEffect(() => {
    // Path provides application id; query provides workflow id
    const appIdNum = parseInt(applicationIdParam, 10);
    if (!Number.isNaN(appIdNum)) {
      setApplicationId(appIdNum);
      (async () => {
        try {
          const res = await fetch(
            `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${appIdNum}&hasWorkflow=true`,
          );
          if (res.ok) {
            const data = await res.json();
            const list =
              (data?.data as Array<{ id: number; name: string }>) || [];
            setApplicationWorkflows(
              list.map((w) => ({
                id: w.id,
                name: w.name,
                isEmbedded: (w as any).isEmbedded,
              })),
            );
          }
          // Fetch application info for header
          try {
            const appRes = await fetch(
              `/api/database?table=${DB_TABLES.APPLICATIONS}&id=${appIdNum}`,
            );
            if (appRes.ok) {
              const appJson = await appRes.json();
              setApplicationName(appJson?.data?.name || "");
            }
          } catch {}

          // Load default theme for this application
          try {
            const themesRes = await fetch(
              `/api/dynamic?ruleType=theme&applicationid=${appIdNum}`,
            );
            if (themesRes.ok) {
              const themesJson = await themesRes.json();
              const themes = themesJson.data || [];
              // Select the first theme (should be the default theme)
              if (themes.length > 0) {
                setSelectedThemeId(themes[0].id);
              }
            }
          } catch {}
        } catch {}
      })();
    }
  }, [applicationIdParam]);

  // Keep selected data object in sync with URL (supports back/forward navigation)
  useEffect(() => {
    const q = searchParams?.get("object");
    const objId = q ? parseInt(q, 10) : NaN;
    if (
      !Number.isNaN(objId) &&
      (dataObjects || []).some((d) => d.id === objId)
    ) {
      setSelectedDataObjectId(objId);
    } else if (!Number.isNaN(objId)) {
      // If the object id is not a data object (likely a workflow), clear selection
      setSelectedDataObjectId(null);
    }
  }, [searchParams, dataObjects]);

  // Keep selected theme in sync with URL (supports back/forward navigation)
  useEffect(() => {
    const t = searchParams?.get("theme");
    const themeId = t ? parseInt(t, 10) : NaN;
    if (!Number.isNaN(themeId)) {
      setSelectedThemeId(themeId);
      // Only fetch theme data if we don't already have it or if it's a different theme
      if (!selectedTheme || selectedTheme.id !== themeId) {
        (async () => {
          try {
            const response = await fetch("/api/dynamic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "getTheme",
                params: { id: themeId },
              }),
            });
            if (response.ok) {
              const json = await response.json();
              setSelectedTheme(json?.data || null);
            } else {
              setSelectedTheme(null);
            }
          } catch {
            setSelectedTheme(null);
          }
        })();
      }
    } else {
      setSelectedTheme(null);
    }
  }, [searchParams, selectedTheme]);

  // Listen for theme refresh requests from LLM
  useEffect(() => {
    const handleThemeRefresh = async () => {
      // Get current values from the URL and state
      const currentThemeId = selectedThemeId;
      console.log("🎨 Theme refresh event received", { currentThemeId });

      if (currentThemeId) {
        try {
          console.log("🎨 Refreshing theme after saveTheme tool execution...");
          const response = await fetch("/api/dynamic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "getTheme",
              params: { id: currentThemeId },
            }),
          });
          if (response.ok) {
            const json = await response.json();
            const updatedTheme = json?.data || null;
            if (updatedTheme) {
              setSelectedTheme(updatedTheme);
              console.log(
                "🎨 Theme refreshed successfully:",
                updatedTheme.name,
              );
            }
          }
        } catch (error) {
          console.error("Failed to refresh theme:", error);
        }
      } else {
        console.log("🎨 Theme refresh skipped - no selected theme", {
          currentThemeId,
        });
      }
    };

    console.log("🎨 Setting up theme refresh event listener");
    window.addEventListener("theme-refresh-requested", handleThemeRefresh);
    return () => {
      console.log("🎨 Cleaning up theme refresh event listener");
      window.removeEventListener("theme-refresh-requested", handleThemeRefresh);
    };
  }, [selectedThemeId]);

  // If not in application context, load a global list of cases for picker
  // No global list needed anymore since application context is required by path

  const handleChangeWorkflow = useCallback(
    async (nextId: number) => {
      // Clear any selected data object when switching workflow
      setSelectedDataObjectId(null);
      // Clear any selected theme when switching workflow
      setSelectedThemeId(null);
      setSelectedTheme(null);
      // Update just the object query param on the same path
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("object", String(nextId));
      // Clear theme parameter when selecting a workflow
      params.delete("theme");
      router.push(`/application/${applicationId}?${params.toString()}`);

      // Manually refresh the workflow data for the new ID
      // This will update the main area without refreshing the entire page
      try {
        // Update the local ID state first
        const newId = nextId.toString();

        // Fetch and update the workflow data for the new ID
        const caseResponse = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.OBJECTS}&id=${newId}`,
        );
        let caseData: any = null;
        if (caseResponse.ok) {
          caseData = await caseResponse.json();
          setSelectedCase(caseData.data);
        }

        // Fetch the new model without resetting the whole page
        const newModel = await _fetchCaseData(newId);
        setModel(() => newModel);

        // Fetch new fields
        const fieldsResponse = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.FIELDS}&${DB_COLUMNS.CASE_ID}=${newId}`,
        );
        if (fieldsResponse.ok) {
          const fieldsResult = await fieldsResponse.json();
          setFields(fieldsResult.data);
        }

        // Fetch new views
        const viewsResponse = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.VIEWS}&${DB_COLUMNS.CASE_ID}=${newId}`,
        );
        if (viewsResponse.ok) {
          const viewsData = await viewsResponse.json();
          setViews(viewsData.data);
        }

        // Reset workflow-specific state
        setActiveStage(undefined);
        setActiveProcess(undefined);
        setActiveStep(undefined);
        setSelectedView(null);

        // Keep chat messages and left panel state intact; history/checkout persists per application

        // Send workflow change message to preview if visible (no need for full model update)
        if (isPreviewVisible && caseData.data?.name) {
          sendWorkflowChangeMessage(caseData.data.name);
        }
      } catch (error) {
        console.error("Error switching workflow:", error);
        // If there's an error, fall back to full navigation
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("object", String(nextId));
        params.delete("theme");
        router.push(`/application/${applicationId}?${params.toString()}`);
      }
    },
    [
      router,
      applicationId,
      setSelectedCase,
      setModel,
      setFields,
      setViews,
      _fetchCaseData,
      searchParams,
      isPreviewVisible,
      sendWorkflowChangeMessage,
    ],
  );

  const handleSelectDataObject = useCallback(
    (dataObjectId: number) => {
      setSelectedDataObjectId(dataObjectId);
      // Clear any selected theme when selecting a data object
      setSelectedThemeId(null);
      setSelectedTheme(null);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("object", String(dataObjectId));
      // Clear theme parameter when selecting a data object
      params.delete("theme");
      router.push(`/application/${applicationId}?${params.toString()}`);
    },
    [router, applicationId, searchParams],
  );

  // Reference links now push URLs directly inside FieldsList; no separate handler needed here

  const selectedDataObject = useMemo(
    () =>
      (dataObjects || []).find((d) => d.id === selectedDataObjectId) || null,
    [dataObjects, selectedDataObjectId],
  );

  // Function to refresh application workflows list
  const refreshApplicationWorkflows = useCallback(async () => {
    const appIdParam = applicationIdParam;
    if (appIdParam) {
      const appIdNum = parseInt(appIdParam, 10);
      if (!Number.isNaN(appIdNum)) {
        try {
          const res = await fetchWithBaseUrl(
            `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${appIdNum}&hasWorkflow=true`,
          );
          if (res.ok) {
            const data = await res.json();
            const list =
              (data?.data as Array<{ id: number; name: string }>) || [];
            setApplicationWorkflows(
              list.map((w) => ({
                id: w.id,
                name: w.name,
                isEmbedded: (w as any).isEmbedded,
              })),
            );
          }
        } catch {}
      }
    }
  }, [applicationIdParam]);

  // Load checkpoints from sessionStorage
  useEffect(() => {
    const savedCheckpoints = sessionStorage.getItem(
      CHECKPOINTS_STORAGE_KEY + id,
    );
    if (savedCheckpoints) {
      setCheckpoints(JSON.parse(savedCheckpoints));
    }
  }, [id]);

  // Save checkpoints to sessionStorage
  useEffect(() => {
    if (checkpoints.length > 0) {
      sessionStorage.setItem(
        CHECKPOINTS_STORAGE_KEY + id,
        JSON.stringify(checkpoints),
      );
    }
  }, [checkpoints, id]);

  // Checkpoint helper must be defined before hooks that depend on it
  const addCheckpoint = (description: string, model: WorkflowModel) => {
    const newCheckpoint: WorkflowCheckpoint = {
      id: parseInt(uuidv4().replace(/-/g, ""), 16),
      timestamp: new Date().toISOString(),
      description,
      model,
    };

    setCheckpoints((prev) => {
      const updated = [newCheckpoint, ...prev].slice(0, MAX_CHECKPOINTS);
      return updated;
    });
  };

  // Hooks that must always run every render (before any early returns)
  const { handleStepsUpdate } = useStepsUpdate({
    selectedCase,
    setSelectedCaseAction: (next) => setSelectedCase(next as any),
    setModelAction: setModel,
    eventName: MODEL_UPDATED_EVENT,
  });

  const { handleAddField, handleUpdateField, handleDeleteField } =
    useFieldMutations({
      selectedCase,
      fields: [...fields, ...dataObjectFields],
      setFields,
      setModel,
      setSelectedCase: (next) => setSelectedCase(next as any),
      objectid: id,
      eventName: MODEL_UPDATED_EVENT,
      fetchCaseData: _fetchCaseData,
    });

  const {
    handleAddNewFieldAndAttach,
    handleRemoveFieldFromDataObject,
    handleReorderFieldsInDataObject,
  } = useDataObjectMutations({
    selectedCase,
    fields: [...fields, ...dataObjectFields],
    setDataObjectFieldsAction: setDataObjectFields,
    setDataObjectsAction: setDataObjects,
    refreshWorkflowDataAction: refreshWorkflowData,
  });

  const {
    handleAddStep,
    handleAddProcess,
    handleDeleteStep,
    handleDeleteProcess,
    handleDeleteStage,
  } = useWorkflowMutations({
    selectedCase,
    workflowStages: workflowModel.stages,
    setSelectedCaseAction: (next) => setSelectedCase(next as any),
    setModelAction: setModel,
    setViewsAction: setViews,
    addCheckpointAction: addCheckpoint,
    objectid: id,
    eventName: MODEL_UPDATED_EVENT,
  });

  const {
    handleAddFieldsToView,
    handleRemoveFieldFromView,
    handleAddFieldsToStep,
    handleUpdateFieldInView,
  } = useViewMutations({
    selectedCase,
    fields,
    views,
    setViewsAction: setViews,
    setModelAction: setModel,
    setSelectedCaseAction: (next) => setSelectedCase(next as any),
    eventName: MODEL_UPDATED_EVENT,
  });

  const { handleSendMessage, handleAbort } = useChatMessaging({
    messages,
    setMessagesAction: setMessages,
    setIsProcessingAction: setIsProcessing,
    selectedCase,
    applicationId,
    stages: workflowModel.stages,
    refreshWorkflowDataAction: refreshWorkflowData,
    refreshApplicationWorkflowsAction: refreshApplicationWorkflows,
    setSelectedViewAction: setSelectedView,
    setActiveStageAction: setActiveStage,
    setActiveProcessAction: setActiveProcess,
    setActiveStepAction: setActiveStep,
  });

  // Load decision tables for the current workflow from DB
  const loadDecisionTables = useCallback(async (objectId: number) => {
    try {
      const res = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.DECISION_TABLES}&objectid=${objectId}`,
      );
      if (!res.ok) throw new Error("Failed to load decision tables");
      const json = await res.json();
      const rows = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      const list = rows.map((row: any) => {
        const modelObj =
          typeof row.model === "string"
            ? JSON.parse(row.model)
            : row.model || {};
        return {
          id: Number(row.id),
          name: row.name,
          description: row.description ?? undefined,
          fieldDefs: Array.isArray(modelObj.fieldDefs)
            ? modelObj.fieldDefs
            : [],
          rowData: Array.isArray(modelObj.rowData) ? modelObj.rowData : [],
          returnElse: modelObj.returnElse ?? undefined,
        } as any;
      });
      setDecisionTables(list);
    } catch (e) {
      console.error("Error loading decision tables:", e);
      setDecisionTables([]);
    }
  }, []);

  useEffect(() => {
    const objectId = selectedCase?.id;
    if (typeof objectId === "number") {
      void loadDecisionTables(objectId);
    } else {
      setDecisionTables([]);
    }
  }, [selectedCase, loadDecisionTables]);

  // Auto-refresh decision tables when the overall model updates (e.g., via chat/tools)
  useEffect(() => {
    const handler = () => {
      const objectId = selectedCase?.id;
      if (typeof objectId === "number") {
        void loadDecisionTables(objectId);
      }
    };
    window.addEventListener(MODEL_UPDATED_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(MODEL_UPDATED_EVENT, handler as EventListener);
  }, [selectedCase, loadDecisionTables]);

  // Decision table save handler (DB via dynamic tools)
  const handleSaveDecisionTable = useCallback(
    async (decisionTable: {
      id?: number | string;
      name: string;
      description?: string;
      fieldDefs: any[];
      rowData: any[];
      returnElse?: string;
    }) => {
      if (!selectedCase) return;
      try {
        const numericId =
          typeof decisionTable.id === "number"
            ? decisionTable.id
            : Number.isFinite(parseInt(String(decisionTable.id), 10))
            ? parseInt(String(decisionTable.id), 10)
            : undefined;
        const resp = await fetchWithBaseUrl("/api/dynamic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveDecisionTable",
            params: {
              ...(numericId ? { id: numericId } : {}),
              name: decisionTable.name,
              description: decisionTable.description,
              objectid: selectedCase.id,
              model: {
                fieldDefs: decisionTable.fieldDefs,
                rowData: decisionTable.rowData,
                returnElse: decisionTable.returnElse,
              },
            },
          }),
        });
        if (!resp.ok) throw new Error("Failed to save decision table");
        await loadDecisionTables(selectedCase.id);
        window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
        showToast("Decision table saved successfully");
      } catch (error) {
        console.error("Error saving decision table:", error);
        showToast("Failed to save decision table");
      }
    },
    [selectedCase, showToast, loadDecisionTables],
  );

  const handleDeleteDecisionTable = useCallback(
    async (decisionTableId: number) => {
      if (!selectedCase) return;
      try {
        const resp = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.DECISION_TABLES}&id=${decisionTableId}`,
          {
            method: "DELETE",
          },
        );
        if (!resp.ok) throw new Error("Failed to delete decision table");
        await loadDecisionTables(selectedCase.id);
        window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
        showToast("Decision table deleted");
      } catch (e) {
        console.error("Error deleting decision table:", e);
        showToast("Failed to delete decision table");
      }
    },
    [selectedCase, showToast, loadDecisionTables],
  );

  const quickInputRef = useRef<HTMLInputElement>(null);
  // Decision table quick tool state (for QuickChatOverlay)
  const [selectedQuickDecisionTableId, setSelectedQuickDecisionTableId] =
    useState<number | null>(null);
  const [
    selectedQuickDecisionTableFieldIds,
    setSelectedQuickDecisionTableFieldIds,
  ] = useState<number[]>([]);

  const { quickSelectionSummary, sendQuickChat } = useQuickChat({
    stages: workflowModel.stages,
    // In Data Object view, use dataObjectFields; otherwise use workflow fields
    fields: selectedDataObjectId !== null ? dataObjectFields : fields,
    views,
    selectedFieldIds: (selectedFieldIds as number[]) || [],
    selectedViewIds: (selectedViewIds as number[]) || [],
    selectedStageIds: (selectedStageIds as number[]) || [],
    selectedProcessIds: (selectedProcessIds as number[]) || [],
    selectedStepIds: (selectedStepIds as number[]) || [],
    messages,
    setMessagesAction: setMessages,
    setIsProcessingAction: setIsProcessing,
    selectedCase,
    applicationId,
    refreshWorkflowDataAction: refreshWorkflowData,
    refreshApplicationWorkflowsAction: refreshApplicationWorkflows,
    setSelectedViewAction: setSelectedView,
    setActiveStageAction: setActiveStage,
    setActiveProcessAction: setActiveProcess,
    setActiveStepAction: setActiveStep,
    isDataObjectView: selectedDataObjectId !== null,
    selectedObjectId: selectedDataObjectId,
    decisionTables: (decisionTables || []).map((d) => ({
      id: d.id,
      name: d.name,
    })),
    selectedDecisionTableId: selectedQuickDecisionTableId,
    selectedDecisionTableFieldIds: selectedQuickDecisionTableFieldIds,
  });

  useEffect(() => {
    if (!loading) {
      setHasLoadedOnce(true);
    }
  }, [loading]);

  // Wire DataPanel edit-field events to open EditFieldModal
  useEffect(() => {
    const handler = (e: any) => {
      const field = e?.detail?.field;
      if (field) setEditingField(field);
    };
    window.addEventListener("edit-field", handler as EventListener);
    return () =>
      window.removeEventListener("edit-field", handler as EventListener);
  }, []);

  if (loading && !hasLoadedOnce) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!model) {
    return null;
  }

  const handleEditField = (field: Field) => {
    setEditingField(field);
  };

  const handleStepSelect = (
    stageId: string,
    processId: string,
    stepId: string,
  ) => {
    setActiveStage(stageId);
    setActiveProcess(processId);
    setActiveStep(stepId);
  };

  const handleAddStage = async (stageData: { name: string }) => {
    if (!selectedCase) return;

    const newStage: Stage = {
      id: Date.now(),
      name: stageData.name,
      processes: [],
    };

    const updatedStages = [...workflowModel.stages, newStage];
    const updatedModel: ComposedModel = {
      ...(selectedCase.model || {}),
      name: selectedCase.name,
      description: selectedCase.description,
      stages: updatedStages,
      // Preserve decisionTables if they exist
      ...(selectedCase.model?.decisionTables && {
        decisionTables: selectedCase.model.decisionTables,
      }),
    };

    try {
      // Direct database call - database layer will handle checkpoints
      const requestUrl = `/api/database?table=${DB_TABLES.OBJECTS}&id=${selectedCase.id}`;
      const requestBody = {
        name: selectedCase.name,
        description: selectedCase.description,
        model: updatedModel,
      };

      const response = await fetch(requestUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add stage: ${response.status} ${errorText}`);
      }

      const _responseData = await response.json();
      setSelectedCase({
        ...selectedCase,
        model: updatedModel,
      });
      setModel((prev) =>
        prev
          ? {
              ...prev,
              stages: updatedModel.stages,
            }
          : null,
      );
      setIsAddStageModalOpen(false);

      // Dispatch model updated event for preview
      window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
    } catch (error) {
      console.error("Error adding stage:", error);
      throw new Error("Failed to add stage");
    }
  };

  const handleCreateWorkflow = async (data: {
    name: string;
    description: string;
  }) => {
    if (!applicationId) return;
    try {
      const payload = {
        name: data.name,
        description: data.description,
        hasWorkflow: true,
        applicationid: applicationId,
        model: { name: data.name, stages: [] },
      } as any;
      const res = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.OBJECTS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to create workflow: ${res.status} ${t}`);
      }
      const json = await res.json();
      const newId: number | undefined = json?.data?.id;
      await refreshWorkflowData();
      showToast("Workflow created.");
      if (newId) {
        await handleChangeWorkflow(newId);
      }
    } catch (e) {
      console.error("Error creating workflow:", e);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const _handleClearCheckpoints = () => {
    if (
      confirm(
        "Are you sure you want to clear all changes history? This cannot be undone.",
      )
    ) {
      setCheckpoints([]);
      sessionStorage.removeItem(CHECKPOINTS_STORAGE_KEY + id);
    }
  };

  // workflow mutation handlers provided by hook called earlier

  const handleEditWorkflow = async (data: {
    name: string;
    description: string;
  }) => {
    if (!selectedCase) return;

    // Parse the model string into an object
    const model = selectedCase.model;

    const requestBody = {
      name: data.name,
      description: data.description,
      model,
    };

    try {
      console.log("[DEBUG] Sending request to /api/database:", requestBody);

      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECTS}&id=${selectedCase.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      console.log("[DEBUG] Response status:", response.status);
      console.log(
        "[DEBUG] Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log("[DEBUG] Response body:", errorText);
        throw new Error(
          `Failed to update workflow: ${response.status} ${errorText}`,
        );
      }

      const responseData = await response.json();
      console.log("[DEBUG] Response data:", responseData);

      // Update the workflow in the list
      setSelectedCase(responseData.data);

      // Close the modal
      setIsEditWorkflowModalOpen(false);

      // Dispatch model updated event for preview
      window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
    } catch (error) {
      console.error("[ERROR] Failed to update workflow. Full details:", {
        status: error instanceof Error ? error.message : "Unknown error",
        requestBody,
        headers: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!selectedCase) return;
    try {
      // Delete checkpoints for this case (if any)
      try {
        await fetch(`/api/checkpoint?action=deleteAll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectid: selectedCase.id }),
        });
      } catch {}

      // Delete the case with cascading cleanup
      const delRes = await fetch(
        `/api/dynamic?ruleType=object&id=${selectedCase.id}`,
        { method: "DELETE" },
      );
      if (!delRes.ok) {
        const errorText = await delRes.text();
        throw new Error(`Failed to delete case: ${delRes.status} ${errorText}`);
      }

      // After deletion, try to navigate to the first remaining case
      let nextobjectid: number | null = null;
      if (applicationId) {
        try {
          const listRes = await fetch(
            `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${applicationId}`,
          );
          if (listRes.ok) {
            const data = await listRes.json();
            const list =
              (data?.data as Array<{ id: number }> | undefined) || [];
            nextobjectid = list[0]?.id ?? null;
          }
        } catch {}
      } else {
        try {
          const listRes = await fetch(
            `/api/database?table=${DB_TABLES.OBJECTS}`,
          );
          if (listRes.ok) {
            const data = await listRes.json();
            const list =
              (data?.data as Array<{ id: number }> | undefined) || [];
            nextobjectid = list[0]?.id ?? null;
          }
        } catch {}
      }

      if (nextobjectid) {
        const params = new URLSearchParams();
        params.set("object", String(nextobjectid));
        params.delete("theme");
        // Refresh header lists before navigating to ensure consistency
        try {
          await refreshApplicationWorkflows();
        } catch {}
        showToast("Workflow deleted. Navigated to next workflow.");
        router.push(`/application/${applicationId}?${params.toString()}`);
      } else {
        // No cases available; navigate to home (empty pattern)
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete workflow. Please try again.",
      );
    }
  };

  const handleDeleteAllCheckpoints = async () => {
    if (!applicationId) {
      throw new Error("No application ID available");
    }

    try {
      const response = await fetch(`/api/checkpoint?action=deleteAll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationid: applicationId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete checkpoints: ${response.status} ${errorText}`,
        );
      }

      // Refresh the left panel data
      if (leftPanelView === "history") {
        // Trigger a refresh of the changes panel
        window.dispatchEvent(new CustomEvent("refresh-changes-panel"));
      } else {
        // Trigger a refresh of the checkout panel
        window.dispatchEvent(new CustomEvent("refresh-checkout-panel"));
      }

      showToast("All checkpoints deleted successfully");
    } catch (error) {
      console.error("Error deleting all checkpoints:", error);
      throw error;
    }
  };

  const handleFieldsReorder = async (
    selectedViewId: string,
    fieldIds: number[],
  ) => {
    if (!selectedCase) return;

    try {
      // If this is a database view (format: "db-<id>"), only update the view model
      if (selectedViewId.startsWith("db-")) {
        const viewId = parseInt(selectedViewId.substring(3), 10);
        if (!viewId || isNaN(viewId)) {
          throw new Error("Invalid database view ID");
        }

        const view = views.find((v) => v.id === viewId);
        if (!view) {
          throw new Error("View not found");
        }

        // Parse existing view model
        let viewModel: {
          fields?: Array<{
            fieldId: number;
            required?: boolean;
            order?: number;
          }>;
          layout?: any;
        } = {};
        try {
          viewModel = JSON.parse(view.model || "{}");
        } catch (_err) {
          viewModel = { fields: [] };
        }

        const existingFieldRefs: Array<{
          fieldId: number;
          required?: boolean;
          order?: number;
        }> = Array.isArray(viewModel.fields) ? viewModel.fields : [];
        const fieldRefById = new Map(
          existingFieldRefs.map((ref) => [ref.fieldId, { ...ref }]),
        );

        // Reorder: apply provided sequence and preserve properties; set new order index
        const reorderedRefs: Array<{
          fieldId: number;
          required?: boolean;
          order?: number;
        }> = [];
        fieldIds.forEach((fid, index) => {
          const existing = fieldRefById.get(fid) || { fieldId: fid };
          reorderedRefs.push({ ...existing, order: index + 1 });
          fieldRefById.delete(fid);
        });
        // Append any refs that weren't included (safety), preserving relative order
        existingFieldRefs
          .filter((ref) => fieldRefById.has(ref.fieldId))
          .forEach((ref) => {
            reorderedRefs.push({ ...ref, order: reorderedRefs.length + 1 });
          });

        const updatedViewModel = {
          ...viewModel,
          fields: reorderedRefs,
          layout: viewModel.layout || { type: "form", columns: 1 },
        };

        const response = await fetch(
          `/api/database?table=${DB_TABLES.VIEWS}&id=${viewId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: view.name,
              objectid: selectedCase.id,
              model: {
                fields: updatedViewModel.fields,
                layout: updatedViewModel.layout,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update view order");
        }

        const { data: updatedView } = await response.json();
        setViews((prev) =>
          prev.map((v) => (v.id === viewId ? updatedView : v)),
        );

        // Dispatch for preview
        window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
        return;
      }

      // Otherwise, treat as workflow step reorder (update case model only)
      const stepId = selectedViewId;
      // First, update the workflow model to reflect the new field order
      const updatedStages = workflowModel.stages.map((stage: Stage) => ({
        ...stage,
        processes: stage.processes.map((process: Process) => ({
          ...process,
          steps: process.steps.map((step: Step) => {
            // Extract step name from unique ID format: "StageName-StepName" or "db-{id}"
            let stepName = stepId;
            if (stepId.includes("-") && !stepId.startsWith("db-")) {
              // For step IDs like "StageName-StepName", extract the step name
              stepName = stepId.split("-").slice(1).join("-");
            }

            // Convert stepId to number for proper comparison with step.id
            const stepIdNum = parseInt(stepId, 10);
            const stepMatches =
              step.id === stepIdNum ||
              step.name === stepId ||
              step.name === stepName;

            if (stepMatches && step.type === "Collect information") {
              // Ensure unique field references and preserve existing properties
              const uniqueFieldIds = Array.from(new Set(fieldIds));
              return {
                ...step,
                fields: uniqueFieldIds.map((fieldId) => ({
                  fieldId,
                })),
              };
            }
            return step;
          }),
        })),
      }));

      // Update the workflow model in the case (no field table updates here)
      handleStepsUpdate(updatedStages);

      // Dispatch model updated event for preview
      window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
    } catch (error) {
      console.error("Error reordering fields:", error);
      alert("Failed to reorder fields. Please try again.");
    }
  };

  const handleFieldsListReorder = async (
    startIndex: number,
    endIndex: number,
  ) => {
    if (!selectedCase) return;

    // Build a map of original orders based on current rendered order
    const originalOrderById = new Map<number, number>();
    fields.forEach((f, idx) => {
      if (typeof f.id === "number") originalOrderById.set(f.id, idx + 1);
    });

    // Create a copy of the fields array and reorder it
    const reorderedFields = Array.from(fields);
    const [removed] = reorderedFields.splice(startIndex, 1);
    reorderedFields.splice(endIndex, 0, removed);

    // Optimistically update local state immediately so the item stays where dropped
    // Also update the order property on affected items for consistency
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    for (let i = minIndex; i <= maxIndex; i += 1) {
      const field = reorderedFields[i];
      if (field) (field as any).order = i + 1;
    }
    setFields(reorderedFields);

    try {
      // Only update the fields whose order actually changed, bounded to the affected range
      const updates = [] as Promise<Response>[];
      for (let i = minIndex; i <= maxIndex; i += 1) {
        const field = reorderedFields[i];
        if (!field || typeof field.id !== "number") continue;
        const previousOrder = originalOrderById.get(field.id);
        const nextOrder = i + 1;
        if (previousOrder === nextOrder) continue; // skip unchanged

        updates.push(
          fetch(`/api/database?table=${DB_TABLES.FIELDS}&id=${field.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table: DB_TABLES.FIELDS,
              data: {
                id: field.id,
                name: field.name,
                label: field.label,
                type: field.type,
                primary: field.primary,
                objectid: selectedCase.id,
                options: field.options,
                order: nextOrder,
                description: field.description,
              },
            }),
          }),
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      // Notify preview that model changed
      window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
    } catch (error) {
      console.error("Error reordering fields:", error);
      alert("Failed to reorder fields. Please try again.");
      // Optional: revert to original order on failure
      // setFields(fields);
    }
  };

  return (
    <div
      className={`flex h-app-screen relative overflow-hidden min-w-0 app-panels ${
        isMobile ? "px-2" : ""
      }`}
    >
      {/* Left Panel - Hidden on mobile, shown on tablet/desktop */}
      {!isMobile && (
        <aside className="flex flex-col h-app-screen text-sm left-panel">
          {/* Header with toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 text-white">
            <h2>
              {leftPanelView === "checkout"
                ? "Rules checkout"
                : "Rules updates"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeleteAllCheckpointsModalOpen(true)}
                className="btn-secondary w-8"
                title="Delete all checkpoints"
              >
                <FaTrash className="w-4 h-4" />
              </button>
              <button
                aria-label="Show rules updates"
                className={`p-1 rounded hover:bg-white/10 ${
                  leftPanelView === "history" ? "bg-white/10" : ""
                }`}
                onClick={() => setLeftPanelView("history")}
              >
                <Icon name="clock" aria-hidden />
              </button>
              <button
                aria-label="Show checkout"
                className={`p-1 rounded hover:bg-white/10 ${
                  leftPanelView === "checkout" ? "bg-white/10" : ""
                }`}
                onClick={() => setLeftPanelView("checkout")}
              >
                <Icon name="folder-nested" aria-hidden />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-2 overflow-y-auto flex-1 text-white">
            {leftPanelView === "history" ? (
              <div className="h-full">
                <ChangesPanel
                  objectid={selectedCase?.id}
                  applicationid={applicationId || undefined}
                  onRefresh={() =>
                    window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT))
                  }
                />
              </div>
            ) : (
              <div className="h-full">
                <RulesCheckoutPanel
                  objectid={selectedCase?.id}
                  applicationId={applicationId || undefined}
                  stages={workflowModel.stages}
                  fields={fields}
                />
              </div>
            )}
          </div>
        </aside>
      )}
      {/* Main Content */}
      <div
        className={`flex flex-col h-app-screen main-panel ${
          isMobile ? "ml-0 rounded-lg" : ""
        }`}
      >
        {/* Application Menu Bar */}
        <ApplicationMenuBar
          applicationName={applicationName || selectedCase?.name}
          workflows={applicationWorkflows}
          dataObjects={dataObjects || []}
          activeWorkflowId={parseInt(id)}
          onChangeWorkflowAction={handleChangeWorkflow}
          onSelectDataObjectAction={handleSelectDataObject}
          onOpenCreateWorkflowAction={() => setIsCreateWorkflowModalOpen(true)}
          onOpenCreateDataObjectAction={() => setIsAddDataObjectModalOpen(true)}
          onOpenCreateThemeAction={() => setIsCreateThemeModalOpen(true)}
          applicationId={applicationId || undefined}
          selectedThemeId={selectedThemeId}
          onThemeSelectAction={handleThemeSelect}
          isPreviewMode={isPreviewVisible}
          onTogglePreviewAction={() => setIsPreviewVisible((v) => !v)}
          onSelectChannelAction={(c) => {
            setSelectedChannel(c);
            setIsPreviewVisible(true);
          }}
        />

        {/* Page heading (hidden while preview is visible or theme is selected) */}
        {!isPreviewVisible && !selectedTheme && (
          <div className="px-4 py-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2>
                  {selectedDataObjectId !== null
                    ? selectedDataObject?.name
                    : selectedCase?.name}
                </h2>
                {selectedDataObjectId !== null &&
                  (() => {
                    if (selectedDataObject?.isEmbedded) {
                      return <span className="tag-secondary">Embedded</span>;
                    } else if (selectedDataObject?.systemOfRecordId) {
                      const systemOfRecord = systemsOfRecord?.find(
                        (sor) => sor.id === selectedDataObject.systemOfRecordId,
                      );
                      return systemOfRecord ? (
                        <SystemOfRecordTag
                          name={systemOfRecord.name}
                          icon={systemOfRecord.icon}
                        />
                      ) : null;
                    }
                    return null;
                  })()}
                <button
                  className="btn-secondary w-8"
                  aria-label={
                    selectedDataObjectId !== null
                      ? "Edit data object"
                      : "Edit workflow"
                  }
                  onClick={() => {
                    if (selectedDataObjectId !== null) {
                      if (selectedDataObject?.id)
                        setEditingDataObjectId(selectedDataObject.id);
                    } else {
                      setIsEditWorkflowModalOpen(true);
                    }
                  }}
                >
                  <FaPencilAlt className="w-4 h-4" />
                </button>
              </div>
              {selectedDataObjectId !== null ? (
                selectedDataObject?.description ? (
                  <p className="text-white/80 text-sm">
                    {selectedDataObject.description}
                  </p>
                ) : null
              ) : selectedCase?.description ? (
                <p className="text-white/80 text-sm">
                  {selectedCase.description}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Tabs - hidden while preview is visible or theme is selected */}
        {!isPreviewVisible &&
          !selectedTheme &&
          selectedDataObjectId === null && (
            <WorkflowTabs
              active={activeTab as any}
              onChange={handleTabChange as any}
            />
          )}

        {/* Main Content Area */}
        <main
          id="main-content-area"
          className="flex-1 overflow-auto h-full"
          data-main-content="true"
        >
          <>
            {isPreviewVisible && (
              <div
                className="w-full h-full bg-[rgb(14,10,42)] text-white"
                ref={previewContainerRef}
              />
            )}
            {!isPreviewVisible && selectedTheme ? (
              <ThemeDetailView
                theme={selectedTheme}
                onEdit={handleEditTheme}
                onDelete={handleDeleteTheme}
                onClose={() => {
                  setSelectedTheme(null);
                  setSelectedThemeId(null);
                  try {
                    const params = new URLSearchParams(
                      searchParams?.toString() || "",
                    );
                    params.delete("theme");
                    const appId =
                      applicationId ??
                      parseInt(applicationIdParam as string, 10);
                    router.push(`/application/${appId}?${params.toString()}`);
                  } catch {}
                }}
                onSave={async (updatedTheme) => {
                  await handleSaveTheme(
                    updatedTheme.id,
                    updatedTheme.name,
                    updatedTheme.description,
                    updatedTheme.model,
                  );
                  // Update the selected theme with the new data
                  setSelectedTheme(updatedTheme);
                }}
              />
            ) : !isPreviewVisible && selectedDataObjectId !== null ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <DataPanel
                    selectedId={selectedDataObjectId}
                    dataObjects={dataObjects || []}
                    fields={dataObjectFields}
                    workflowObjects={applicationWorkflows}
                    onAddNewFieldAndAttachAction={async (
                      dataObjectId,
                      field,
                    ) => {
                      await handleAddNewFieldAndAttach(dataObjectId, field);
                    }}
                    onRemoveFieldFromDataObjectAction={(dataObjectId, field) =>
                      handleRemoveFieldFromDataObject(dataObjectId, field)
                    }
                    onReorderFieldsInDataObjectAction={(
                      dataObjectId,
                      fieldIds,
                    ) =>
                      handleReorderFieldsInDataObject(dataObjectId, fieldIds)
                    }
                  />
                </div>
              </div>
            ) : !isPreviewVisible && activeTab === "workflow" ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-white">
                    Lifecycle
                  </h2>
                  <button
                    onClick={() => setIsAddStageModalOpen(true)}
                    className="interactive-button px-4 py-2"
                  >
                    Add Stage
                  </button>
                </div>
                <div className="flex-1 overflow-auto relative">
                  <WorkflowLifecycleView
                    stages={workflowModel.stages}
                    onStepSelect={(stageId, processId, stepId) =>
                      handleStepSelect(stageId, processId, stepId)
                    }
                    activeStage={activeStage}
                    activeProcess={activeProcess}
                    activeStep={activeStep}
                    onEditStep={(stageId, processId, stepId) => {
                      // For lifecycle view editing, just select the step to show configuration
                      handleStepSelect(
                        stageId.toString(),
                        processId.toString(),
                        stepId.toString(),
                      );
                    }}
                    onDeleteStep={handleDeleteStep}
                    fields={fields}
                    readOnly={false}
                    onAddField={handleAddField}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onAddExistingField={(stepId, fieldIds) => {
                      // Convert field IDs to field names for the existing handler
                      const fieldNames = fieldIds
                        .map((id) => fields.find((f) => f.id === id)?.name)
                        .filter((name): name is string => !!name);
                      void handleAddFieldsToStep(
                        stepId,
                        fieldNames,
                        workflowModel.stages,
                      );
                    }}
                    onFieldChange={(fieldId, value) => {
                      // For now, this is read-only in lifecycle view
                      console.log(
                        "Field change in lifecycle view:",
                        fieldId,
                        value,
                      );
                    }}
                    views={views}
                    onAddFieldsToView={handleAddFieldsToView}
                    onStepsUpdate={handleStepsUpdate}
                    onAddProcess={(stageId, processName) =>
                      handleAddProcess(Number(stageId), processName)
                    }
                    onAddStep={(
                      stageId,
                      processId,
                      stepName,
                      stepType,
                      fields,
                    ) =>
                      handleAddStep(
                        Number(stageId),
                        Number(processId),
                        stepName,
                        stepType as StepType,
                        fields?.map((f) => ({
                          id: f.id!,
                        })),
                      )
                    }
                    onDeleteProcess={(stageId, processId) =>
                      handleDeleteProcess(Number(stageId), Number(processId))
                    }
                    onDeleteStage={(stageId) =>
                      handleDeleteStage(Number(stageId))
                    }
                    decisionTables={decisionTables}
                    onSaveDecisionTable={handleSaveDecisionTable}
                    applicationId={applicationId || undefined}
                  />
                </div>
              </div>
            ) : null}
            {!isPreviewVisible &&
              selectedDataObjectId === null &&
              activeTab === "fields" && (
                <div className="p-6">
                  <FieldsHeader
                    count={fields.length}
                    onAddField={() => setIsAddFieldModalOpen(true)}
                    buttonRef={
                      addFieldButtonRef as React.RefObject<HTMLButtonElement>
                    }
                  />
                  <FieldsList
                    fields={fields}
                    onReorderFields={handleFieldsListReorder}
                    onDeleteField={handleDeleteField}
                    onEditField={handleEditField}
                  />
                </div>
              )}
            {!isPreviewVisible &&
              selectedDataObjectId === null &&
              activeTab === "views" && (
                <>
                  <ViewsHeader />
                  <ViewsPanel
                    stages={workflowModel.stages}
                    fields={fields}
                    views={views}
                    workflowObjects={applicationWorkflows}
                    dataObjects={
                      dataObjects?.map((d) => ({
                        id: d.id,
                        name: d.name,
                        isEmbedded: d.isEmbedded,
                      })) || []
                    }
                    onAddField={handleAddField}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onRemoveFieldFromView={(field) =>
                      void handleRemoveFieldFromView(field, selectedView)
                    }
                    onAddFieldsToView={(viewId, fieldNames) =>
                      void handleAddFieldsToView(viewId, fieldNames)
                    }
                    onAddFieldsToStep={(stepId, fieldNames) =>
                      void handleAddFieldsToStep(
                        stepId,
                        fieldNames,
                        workflowModel.stages,
                      )
                    }
                    onFieldsReorder={(
                      selectedViewId: string,
                      fieldIds: number[],
                    ) => {
                      handleFieldsReorder(selectedViewId, fieldIds);
                    }}
                    onUpdateFieldInView={(viewId, fieldId, updates) =>
                      void handleUpdateFieldInView(viewId, fieldId, updates)
                    }
                    onViewSelect={setSelectedView}
                    selectedView={selectedView}
                  />
                </>
              )}
            {!isPreviewVisible &&
              selectedDataObjectId === null &&
              activeTab === "decisionTables" && (
                <DecisionTablesPanel
                  stages={workflowModel.stages}
                  fields={fields}
                  decisionTables={decisionTables as any}
                  onSaveDecisionTable={async (dt) => {
                    await handleSaveDecisionTable(dt as any);
                  }}
                  onDeleteDecisionTable={async (id) => {
                    await handleDeleteDecisionTable(id);
                  }}
                />
              )}
          </>
        </main>

        {/* Modals - rendered in portal to isolate from main content */}
        <AddFieldModal
          isOpen={isAddFieldModalOpen}
          onClose={() => setIsAddFieldModalOpen(false)}
          onAddField={async (field) => {
            await handleAddField(field);
          }}
          buttonRef={addFieldButtonRef as React.RefObject<HTMLButtonElement>}
          allowExistingFields={false}
          workflowObjects={applicationWorkflows}
          dataObjects={
            dataObjects?.map((d) => ({
              id: d.id,
              name: d.name,
              isEmbedded: d.isEmbedded,
            })) || []
          }
        />

        <AddDataObjectModal
          isOpen={isAddDataObjectModalOpen}
          onCloseAction={() => setIsAddDataObjectModalOpen(false)}
          objectid={parseInt(id)}
          systemsOfRecord={systemsOfRecord || []}
          onCreateSorAction={async (name: string, icon?: string) => {
            const res = await fetchWithBaseUrl(
              `/api/database?table=${DB_TABLES.SYSTEMS_OF_RECORD}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, icon }),
              },
            );
            const data = await res.json();
            await refreshWorkflowData();
            return data.data;
          }}
          onSaveAction={async (data) => {
            const payload = {
              name: data.name,
              description: data.description,
              hasWorkflow: false,
              applicationid: selectedCase?.applicationid ?? applicationId,
              systemOfRecordId: data.systemOfRecordId,
              isEmbedded: data.isEmbedded || false,
              model: {},
            };
            const res = await fetchWithBaseUrl(
              `/api/database?table=${DB_TABLES.OBJECTS}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              },
            );
            if (!res.ok) {
              const t = await res.text();
              throw new Error(
                `Failed to create data object: ${res.status} ${t}`,
              );
            }
            await refreshWorkflowData();
            showToast("Data object created.");
          }}
        />

        {editingField && (
          <EditFieldModal
            isOpen={!!editingField}
            onClose={() => setEditingField(null)}
            onSubmit={async (updates) => {
              await handleUpdateField({ ...updates, id: editingField.id });
              await refreshWorkflowData();
            }}
            field={editingField}
            workflowObjects={applicationWorkflows}
            dataObjects={
              dataObjects?.map((d) => ({
                id: d.id,
                name: d.name,
                isEmbedded: d.isEmbedded,
              })) || []
            }
          />
        )}

        <AddStageModal
          isOpen={isAddStageModalOpen}
          onClose={() => setIsAddStageModalOpen(false)}
          onAddStage={handleAddStage}
        />

        <AddProcessModal
          isOpen={isAddProcessModalOpen}
          onClose={() => {
            setIsAddProcessModalOpen(false);
            setSelectedStageForProcess(null);
          }}
          onAddProcess={(processData: { name: string }) => {
            if (selectedStageForProcess) {
              handleAddProcess(
                Number(selectedStageForProcess),
                processData.name,
              );
            }
          }}
        >
          <input
            type="text"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
            placeholder="Enter process name"
            className="w-full px-3 py-2 border rounded-lg"
            data-testid="process-name-input"
          />
        </AddProcessModal>

        <EditWorkflowModal
          isOpen={isEditWorkflowModalOpen}
          onClose={() => setIsEditWorkflowModalOpen(false)}
          onSubmit={handleEditWorkflow}
          onDelete={handleDeleteWorkflow}
          initialData={{
            name: selectedCase?.name || "",
            description: selectedCase?.description || "",
          }}
        />
        <EditWorkflowModal
          isOpen={isCreateWorkflowModalOpen}
          onClose={() => setIsCreateWorkflowModalOpen(false)}
          onSubmit={async (data) => {
            await handleCreateWorkflow(data);
            setIsCreateWorkflowModalOpen(false);
          }}
          initialData={{ name: "", description: "" }}
        />
        {editingDataObjectId && (
          <EditDataObjectModal
            isOpen={!!editingDataObjectId}
            onCloseAction={() => setEditingDataObjectId(null)}
            systemsOfRecord={systemsOfRecord || []}
            initialData={
              (dataObjects || []).find((d) => d.id === editingDataObjectId)!
            }
            onSaveAction={async (updates) => {
              const current = (dataObjects || []).find(
                (d) => d.id === updates.id,
              );
              if (!current) return;
              const res = await fetchWithBaseUrl(
                `/api/database?table=${DB_TABLES.OBJECTS}&id=${updates.id}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: updates.name,
                    description: updates.description,
                    systemOfRecordId: updates.systemOfRecordId,
                    hasWorkflow: false,
                    isEmbedded: updates.isEmbedded || false,
                    model: current.model ?? {},
                  }),
                },
              );
              if (!res.ok) {
                const t = await res.text();
                throw new Error(
                  `Failed to update data object: ${res.status} ${t}`,
                );
              }
              await refreshWorkflowData();
            }}
            onDeleteAction={async (did: number) => {
              try {
                const res = await fetchWithBaseUrl(
                  `/api/database?table=${DB_TABLES.OBJECTS}&id=${did}`,
                  { method: "DELETE" },
                );
                if (!res.ok) {
                  const t = await res.text();
                  throw new Error(
                    `Failed to delete data object: ${res.status} ${t}`,
                  );
                }
              } catch (e) {
                console.error("Error deleting data object:", e);
              } finally {
                try {
                  // Find first remaining data object in this application
                  const appId = applicationId || selectedCase?.applicationid;
                  if (appId) {
                    const listRes = await fetchWithBaseUrl(
                      `/api/database?table=${DB_TABLES.OBJECTS}&applicationid=${appId}&hasWorkflow=false`,
                    );
                    if (listRes.ok) {
                      const data = await listRes.json();
                      const list =
                        (data?.data as Array<{ id: number }> | undefined) || [];
                      // Update header immediately
                      setDataObjects(list as any);
                      const nextDataObjectId = list[0]?.id ?? null;
                      if (nextDataObjectId) {
                        // Navigate to the first remaining data object
                        handleSelectDataObject(nextDataObjectId);
                        showToast(
                          "Data object deleted. Navigated to next data object.",
                        );
                      } else {
                        // No data objects left; return to workflow view (if exists)
                        setSelectedDataObjectId(null);
                        const params = new URLSearchParams();
                        if (selectedCase?.id) {
                          params.set("object", String(selectedCase.id));
                          params.delete("theme");
                          router.push(
                            `/application/${appId}?${params.toString()}`,
                          );
                          showToast("Data object deleted.");
                        }
                      }
                    } else {
                      setSelectedDataObjectId(null);
                    }
                  } else {
                    setSelectedDataObjectId(null);
                  }
                } catch {}
                setEditingDataObjectId(null);
              }
            }}
          />
        )}

        {/* Delete All Checkpoints Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={isDeleteAllCheckpointsModalOpen}
          title="Delete Checkpoints"
          message="Are you sure you want to delete all checkpoints for this application? This action cannot be undone and will permanently remove all checkpoint history."
          confirmLabel="Delete"
          onCancel={() => setIsDeleteAllCheckpointsModalOpen(false)}
          onConfirm={async () => {
            await handleDeleteAllCheckpoints();
            setIsDeleteAllCheckpointsModalOpen(false);
          }}
        />

        {/* Theme Modals */}
        <CreateThemeModal
          isOpen={isCreateThemeModalOpen}
          onClose={() => setIsCreateThemeModalOpen(false)}
          onCreate={handleCreateTheme}
          isCreating={false}
          applicationId={applicationId || 0}
        />

        <ThemeModal
          isOpen={isThemeModalOpen}
          onClose={() => {
            setIsThemeModalOpen(false);
            setEditingTheme(null);
          }}
          theme={editingTheme}
          onSave={handleSaveTheme}
          onDelete={handleDeleteTheme}
          isSaving={false}
          showThemeEditor={false} // Hide theme editor in main theme region context since it's already visible
        />
      </div>

      {/* Chat Panel - fixed width - Hidden on tablet/mobile */}
      {isDesktop && applicationId && (
        <aside className="flex flex-col h-app-screen text-sm right-panel">
          <ChatPanelContent
            messages={messages}
            onSendMessage={(message, mode, attachedFile, modelId) =>
              void handleSendMessage(message, mode, attachedFile, modelId)
            }
            onAbort={() => handleAbort()}
            isProcessing={isProcessing}
            objectid={parseInt(id)}
            onQuickAction={beginFreeFormSelection}
            onClearChat={handleClearChat}
            applicationId={applicationId}
          />
        </aside>
      )}

      {/* Free Form selection overlay */}
      {isFreeFormSelecting && (
        <FreeFormSelectionOverlay
          selectionRect={selectionRect}
          onMouseDown={onSelectionMouseDown}
          onMouseMove={onSelectionMouseMove}
          onMouseUp={onSelectionMouseUp}
        />
      )}

      {/* Quick Chat floating overlay (non-blocking) */}
      {isQuickChatOpen && quickOverlayPosition && (
        <QuickChatOverlay
          position={quickOverlayPosition}
          selectionSummary={quickSelectionSummary}
          inputRef={quickInputRef as React.RefObject<HTMLInputElement | null>}
          value={quickChatText}
          onChange={setQuickChatText}
          decisionTables={(decisionTables || []).map((d) => ({
            id: d.id,
            name: d.name,
          }))}
          selectedDecisionTableId={selectedQuickDecisionTableId}
          onChangeDecisionTableId={setSelectedQuickDecisionTableId}
          fields={(selectedDataObjectId !== null
            ? dataObjectFields
            : fields
          ).map((f) => ({ id: f.id as number, name: f.name }))}
          selectedDecisionTableFieldIds={selectedQuickDecisionTableFieldIds}
          onChangeDecisionTableFieldIds={setSelectedQuickDecisionTableFieldIds}
          onEnter={() => {
            void sendQuickChat(quickChatText);
            setIsQuickChatOpen(false);
            setQuickChatText("");
            setSelectedQuickDecisionTableId(null);
            setSelectedQuickDecisionTableFieldIds([]);
          }}
          onEscape={() => {
            setIsQuickChatOpen(false);
            setQuickChatText("");
            setSelectedQuickDecisionTableId(null);
            setSelectedQuickDecisionTableFieldIds([]);
          }}
        />
      )}

      {/* Responsive floating components */}

      {/* Floating Chat Icon - Show on tablet/mobile */}
      {(isTablet || isMobile) && (
        <FloatingChatIcon
          onClick={() => setIsChatModalOpen(true)}
          hasUnreadMessages={messages.length > 0}
        />
      )}

      {/* Floating Chat Modal */}
      {applicationId && (
        <FloatingChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          messages={messages}
          onSendMessage={(message, mode, attachedFiles) =>
            void handleSendMessage(message, mode, attachedFiles)
          }
          onAbort={() => handleAbort()}
          isProcessing={isProcessing}
          objectid={parseInt(id)}
          onQuickAction={beginFreeFormSelection}
          onClearChat={handleClearChat}
          applicationId={applicationId}
        />
      )}

      {/* Floating Left Panel Modal */}
      <FloatingLeftPanelModal
        isOpen={isLeftPanelModalOpen}
        onClose={() => setIsLeftPanelModalOpen(false)}
        leftPanelView={leftPanelView}
        onViewChange={setLeftPanelView}
        objectid={selectedCase?.id}
        applicationId={applicationId || undefined}
        stages={workflowModel.stages}
        fields={fields}
      />
      {toastMessage && (
        <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-[110]">
          <div className="px-4 py-2 rounded shadow-lg border border-white/20 bg-[rgb(20,16,60)] text-white">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
