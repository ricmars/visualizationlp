"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createRoot } from "react-dom/client";

import { Stage, Field } from "../types/types";
import type { StepType } from "../utils/stepTypes";
import { getStepTypeData } from "../utils/stepTypes";
import StepConfigurationModal from "./StepConfigurationModal";
import { DB_TABLES } from "../types/database";

// Dynamic imports for Pega components to avoid SSR issues
import dynamic from "next/dynamic";
import { StyleSheetManager } from "styled-components";

const PegaLifeCycle = dynamic(
  () =>
    import("@pega/cosmos-react-build").then((mod) => ({
      default: mod.LifeCycle,
    })),
  { ssr: false },
);

const PegaConfiguration = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.Configuration,
    })),
  { ssr: false },
);

const PegaLiveLog = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.LiveLog })),
  { ssr: false },
);

const PegaPopoverManager = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.PopoverManager,
    })),
  { ssr: false },
);

const PegaToaster = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Toaster })),
  { ssr: false },
);

const PegaModalManager = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({
      default: mod.ModalManager,
    })),
  { ssr: false },
);

const PegaIcon = dynamic(
  () =>
    import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
  { ssr: false },
);

// Import types separately since they don't need dynamic loading
import type { IconTileProps, StageItemProps } from "@pega/cosmos-react-build";
import EditModal from "./EditModal";
import AddProcessModal from "./AddProcessModal";

interface WorkflowLifecycleViewProps {
  stages: Stage[];
  onStepSelect: (stageId: string, processId: string, stepId: string) => void;
  activeStage?: string;
  activeProcess?: string;
  activeStep?: string;
  // Step action handlers
  onEditStep?: (stageId: number, processId: number, stepId: number) => void;
  onDeleteStep?: (stageId: number, processId: number, stepId: number) => void;
  fields?: Field[];
  readOnly?: boolean;
  // Field handlers for modal functionality
  onAddField?: (field: {
    label: string;
    type: Field["type"];
    options?: string[];
    required?: boolean;
    primary?: boolean;
  }) => Promise<string>;
  onUpdateField?: (updates: Partial<Field>) => void;
  onDeleteField?: (field: Field) => void;
  onAddExistingField?: (stepId: number, fieldIds: number[]) => void;
  onFieldChange?: (fieldId: number, value: string | number | boolean) => void;
  views?: Array<{ id: number; model: any }>;
  onAddFieldsToView?: (viewId: number, fieldNames: string[]) => void;
  onStepsUpdate?: (updatedStages: Stage[]) => void;
  onAddProcess?: (stageId: number, processName: string) => void;
  onAddStep?: (
    stageId: number,
    processId: number,
    stepName: string,
    stepType: StepType,
    initialFields?: Array<{ id: number }>,
  ) => void;
  onDeleteProcess?: (stageId: number, processId: number) => void;
}

// Stable error boundary to avoid remounting the subtree on each render
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 LifeCycle component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", backgroundColor: "lightcoral" }}>
          <h3>LifeCycle Component Error</h3>
          <p>Error: {this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Stable provider composition to prevent duplicate style tags on re-renders
const PegaProviders = React.memo(
  ({
    container,
    children,
  }: {
    container: HTMLElement;
    children: React.ReactNode;
  }) => {
    const [theme, setTheme] = React.useState<any>(null);

    React.useEffect(() => {
      // Dynamically import the theme to avoid SSR issues
      import("@pega/cosmos-react-core").then(({ Bootes2025DarkTheme }) => {
        const importedTheme = Bootes2025DarkTheme;
        importedTheme.base["font-family"] = "Montserrat, Helvetica, sans-serif";
        setTheme(importedTheme);
      });
    }, []);

    if (!theme) {
      return <div>Loading...</div>;
    }

    return (
      <StyleSheetManager target={container}>
        <PegaConfiguration
          theme={theme}
          disableDefaultFontLoading
          styleSheetTarget={container}
          portalTarget={container}
        >
          <PegaLiveLog maxLength={50}>
            <PegaPopoverManager>
              <PegaToaster dismissAfter={5000}>
                <PegaModalManager>
                  {children as unknown as any}
                </PegaModalManager>
              </PegaToaster>
            </PegaPopoverManager>
          </PegaLiveLog>
        </PegaConfiguration>
      </StyleSheetManager>
    );
  },
);

const WorkflowLifecycleViewImpl: React.FC<WorkflowLifecycleViewProps> = ({
  stages,
  onStepSelect,
  activeStage,
  activeProcess,
  activeStep,
  onEditStep: _onEditStep,
  onDeleteStep,
  fields = [],
  readOnly: _readOnly = false,
  onAddField,
  onUpdateField,
  onDeleteField,
  onAddExistingField,
  onFieldChange,
  views = [],
  onAddFieldsToView,
  onStepsUpdate,
  onAddProcess,
  onAddStep,
  onDeleteProcess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const reactRootRef = useRef<any>(null);
  const fieldsRef = useRef<Field[]>(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const [editingStep, setEditingStep] = useState<{
    id: number;
    stageId: number;
    processId: number;
    stepId: number;
    name: string;
    fields: any[];
    type: string;
    viewId?: number;
  } | null>(null);

  const [stageEdit, setStageEdit] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [processModal, setProcessModal] = useState<{
    stageId: number | null;
    isOpen: boolean;
  }>({ stageId: null, isOpen: false });

  const [processEdit, setProcessEdit] = useState<{
    stageId: number;
    id: number;
    name: string;
  } | null>(null);

  const [addingStep, setAddingStep] = useState<{
    stageId: number | null;
    processId: number | null;
    isOpen: boolean;
  }>({ stageId: null, processId: null, isOpen: false });

  // Common function to handle adding a step
  const handleAddStep = useCallback((stageId: number, processId: number) => {
    console.log("[LifeCycle] opening StepConfigurationModal for adding step", {
      stageId,
      processId,
    });
    setAddingStep({
      stageId,
      processId,
      isOpen: true,
    });
  }, []);

  const [stepEdit, setStepEdit] = useState<{
    stageId: number;
    processId: number;
    id: number;
    name: string;
    stepType: StepType;
  } | null>(null);

  // Removed auto-sync from in-memory views to avoid stale overwrites of fresh modal state

  // Function to handle edit step - no iframe needed
  const handleEditStep = useCallback(
    async (stepData: any) => {
      console.log("🔍 Edit button clicked!", stepData);
      console.log("🔍 Looking for step with ID:", stepData.step.id);
      // Find the stage, process and step based on step data
      for (const stage of stages) {
        for (const process of stage.processes) {
          const candidateId = stepData?.step?.id || stepData?.id;
          const step = process.steps.find(
            (s) =>
              String(s.id) === String(candidateId) || s.name === candidateId,
          );
          if (step) {
            console.log("🔍 Found step:", step);
            let stepFields: any[] = [];
            if (step.type === "Collect information") {
              // Prefer pulling fresh from linked view model if available; fallback to local model
              if (typeof (step as any).viewId === "number") {
                const viewId = (step as any).viewId as number;
                try {
                  const resp = await fetch(
                    `/api/database?table=${DB_TABLES.VIEWS}&id=${viewId}`,
                  );
                  if (resp.ok) {
                    const json = await resp.json();
                    const view = json?.data || null;
                    const model = (() => {
                      try {
                        const raw = view?.model;
                        return typeof raw === "string"
                          ? JSON.parse(raw)
                          : raw || {};
                      } catch {
                        return {};
                      }
                    })();
                    if (Array.isArray(model.fields)) {
                      stepFields = model.fields
                        .map((f: { fieldId: number; required?: boolean }) => ({
                          fieldId: Number(f.fieldId),
                        }))
                        .filter(
                          (f: { fieldId: number }) =>
                            typeof f.fieldId === "number" && !isNaN(f.fieldId),
                        );
                    } else {
                      stepFields = step.fields || [];
                    }
                  } else {
                    stepFields = step.fields || [];
                  }
                } catch {
                  stepFields = step.fields || [];
                }
              } else {
                stepFields = step.fields || [];
              }
              console.log("🔍 Step fields (resolved):", stepFields);
            }
            setEditingStep({
              id: step.id,
              stageId: stage.id,
              processId: process.id,
              stepId: step.id,
              name: step.name,
              fields: stepFields,
              type: step.type,
              viewId:
                typeof (step as any).viewId === "number"
                  ? (step as any).viewId
                  : undefined,
            });
            console.log("🔍 Set editing step with fields:", stepFields);
            return;
          }
        }
      }
      console.log("🔍 No step found for:", stepData.step.id);
    },
    [stages],
  );

  // Function to handle delete step
  const handleDeleteStep = useCallback(
    (stepData: any) => {
      console.log("🗑️ Delete button clicked!", stepData);
      // Find the stage, process and step based on step data
      for (const stage of stages) {
        for (const process of stage.processes) {
          const candidateId = stepData?.step?.id || stepData?.id;
          const step = process.steps.find(
            (s) =>
              String(s.id) === String(candidateId) || s.name === candidateId,
          );
          if (step && onDeleteStep) {
            onDeleteStep(stage.id, process.id, step.id);
            return;
          }
        }
      }
    },
    [stages, onDeleteStep],
  );

  const containerStyle: React.CSSProperties = {
    background: "transparent",
    position: "relative",
  };

  // Memoize the stages mapping to prevent unnecessary recalculations
  const mappedStages = useMemo(
    () =>
      stages.map(
        (stage: Stage): StageItemProps => ({
          id: String(stage.id),
          label: stage.name,
          type: "default",
          error: "",
          categories: [
            {
              id: String(stage.id),
              categoryId: String(stage.id),
              tasks: stage.processes.map((process) => ({
                id: String(process.id),
                label: process.name,
                visual: { imgSrc: "" },
                steps: process.steps.map((step) => {
                  const stepTypeData = getStepTypeData(step.type);
                  return {
                    status: {
                      type: "",
                      label: step.name,
                    },
                    id: String(step.id),
                    label: step.name,
                    visual: {
                      imgSrc: "",
                      name: stepTypeData.name,
                      label: stepTypeData.label,
                      category:
                        stepTypeData.category as IconTileProps["category"],
                      inverted: stepTypeData.inverted,
                    },
                  };
                }),
              })),
            },
          ],
        }),
      ),
    [stages],
  );

  // Set up Shadow DOM and render LifeCycle component inside it
  useEffect(() => {
    console.log(
      "🔧 useEffect triggered, containerRef.current:",
      containerRef.current,
    );
    if (!containerRef.current) return;

    let shadowRoot: ShadowRoot;
    let shadowContainer: HTMLDivElement;

    // Create shadow root if it doesn't exist
    if (!shadowRootRef.current) {
      try {
        shadowRoot = containerRef.current.attachShadow({ mode: "open" });
        shadowRootRef.current = shadowRoot;
        console.log("🔧 Created new shadow root:", shadowRoot);
      } catch (_error) {
        // Shadow root already exists, use the existing one
        shadowRoot = containerRef.current.shadowRoot as ShadowRoot;
        shadowRootRef.current = shadowRoot;
        console.log("🔧 Reusing existing shadow root:", shadowRoot);
      }
    } else {
      shadowRoot = shadowRootRef.current;
      console.log("🔧 Using cached shadow root:", shadowRoot);
    }

    // Create or reuse container div inside shadow DOM
    shadowContainer = shadowRoot.querySelector(
      "div.shadow-container",
    ) as HTMLDivElement;
    if (!shadowContainer) {
      shadowContainer = document.createElement("div");
      shadowContainer.className = "shadow-container";
      shadowRoot.appendChild(shadowContainer);
      console.log("🔧 Created new shadow container:", shadowContainer);
    } else {
      console.log("🔧 Reusing existing shadow container:", shadowContainer);
    }

    // Simple CSS reset - much less aggressive
    if (!shadowRoot.querySelector("style[data-shadow-reset]")) {
      const globalStyle = document.createElement("style");
      globalStyle.setAttribute("data-shadow-reset", "true");
      globalStyle.textContent = `
        /* Simple CSS reset for Shadow DOM */
        :host {
          display: block;
        }

        /* Basic reset */
        * {
          box-sizing: border-box;
        }

        /* Make the lifecycle layout left-aligned and horizontally scrollable */
        .shadow-container {
          overflow-x: auto;
          overflow-y: hidden;
          width: 100%;
        }

        .shadow-container > div > div:first-child {
          position: static;
          padding; 0;
          margin:0;
          background: transparent;
        }

        /* Ensure inner content can extend horizontally */
        .shadow-container > div {
          min-width: max-content;
        }

        .shadow-container article {
          border: 1px solid rgba(0, 0, 0, .2);
        }

        .shadow-container button {
          color: #FFF;
        }

        .shadow-container div[data-testid="intake:stage:"]:before {
          background: transparent;
        }
      `;

      shadowRoot.insertBefore(globalStyle, shadowRoot.firstChild);
      console.log("🔧 Added simple CSS reset to shadow root");
    }

    // Create React root inside shadow DOM if it doesn't exist
    if (!reactRootRef.current) {
      reactRootRef.current = createRoot(shadowContainer);
      console.log("🔧 Created new React root:", reactRootRef.current);
    } else {
      console.log("🔧 Reusing existing React root:", reactRootRef.current);
    }

    // Render the LifeCycle component inside shadow DOM
    if (shadowRootRef.current && reactRootRef.current) {
      let content = null;
      if (shadowRootRef.current) {
        // Render content
        content = (
          <ErrorBoundary>
            <PegaProviders container={shadowContainer}>
              <PegaLifeCycle
                items={mappedStages}
                stages={stages}
                onStepSelect={onStepSelect}
                activeStage={activeStage}
                activeProcess={activeProcess}
                activeStep={activeStep}
                readOnly={_readOnly}
                stage={{
                  label: "Primary Stages",
                  actions: [
                    {
                      id: "add-process",
                      text: "Add process",
                      visual: <PegaIcon name="nodes-down" />,
                      onClick: (data: any) => {
                        const stageKey = data?.id || data?.stage?.id;
                        const stage = stages.find(
                          (s) =>
                            String(s.id) === String(stageKey) ||
                            s.name === stageKey,
                        );
                        if (stage) {
                          setProcessModal({
                            stageId: stage.id,
                            isOpen: true,
                          });
                        }
                      },
                    },
                    {
                      id: "edit-stage",
                      text: "Edit",
                      visual: <PegaIcon name="pencil" />,
                      onClick: (data: any) => {
                        const stageKey = data?.id || data?.stage?.id;
                        const stage = stages.find(
                          (s) =>
                            String(s.id) === String(stageKey) ||
                            s.name === stageKey,
                        );
                        if (stage)
                          setStageEdit({
                            id: stage.id,
                            name: stage.name,
                          });
                      },
                    },
                  ],
                  onClick: (data: any) => {
                    const stageKey = data?.id || data?.stage?.id;
                    const stage = stages.find(
                      (s) =>
                        String(s.id) === String(stageKey) ||
                        s.name === stageKey,
                    );
                    if (stage)
                      setStageEdit({
                        id: stage.id,
                        name: stage.name,
                      });
                  },
                }}
                task={[
                  {
                    addStepTitle: "Step",
                    onAddCustomStep: (data: any) => {
                      console.log("[LifeCycle] onAddCustomStep", data);
                      const stageKey =
                        data?.category?.id ||
                        data?.categoryId ||
                        data?.category?.name ||
                        data?.stage?.id;
                      const processKey =
                        data?.task?.id || data?.id || data?.name;
                      const stage = stages.find(
                        (s) =>
                          String(s.id) === String(stageKey) ||
                          s.name === stageKey,
                      );
                      const process = stage?.processes.find(
                        (p) =>
                          String(p.id) === String(processKey) ||
                          p.name === processKey,
                      );
                      if (stage && process) {
                        handleAddStep(stage.id, process.id);
                      }
                    },
                    actions: [
                      {
                        id: "add-step",
                        text: "Add step",
                        visual: <PegaIcon name="plus" />,
                        onClick: (data: any) => {
                          console.log("[LifeCycle] add-step action", data);
                          const stageKey =
                            data?.category?.id ||
                            data?.categoryId ||
                            data?.category?.name ||
                            data?.stage?.id;
                          const processKey =
                            data?.task?.id || data?.id || data?.name;
                          const stage = stages.find(
                            (s) =>
                              String(s.id) === String(stageKey) ||
                              s.name === stageKey,
                          );
                          const process = stage?.processes.find(
                            (p) =>
                              String(p.id) === String(processKey) ||
                              p.name === processKey,
                          );
                          if (stage && process) {
                            handleAddStep(stage.id, process.id);
                          }
                        },
                      },
                      {
                        id: "edit-process",
                        text: "Edit",
                        visual: <PegaIcon name="pencil" />,
                        onClick: (data: any) => {
                          console.log("[LifeCycle] edit-process action", data);
                          const stageKey =
                            data?.category?.id ||
                            data?.categoryId ||
                            data?.category?.name ||
                            data?.stage?.id;
                          const processKey =
                            data?.task?.id || data?.id || data?.name;
                          const stage = stages.find(
                            (s) =>
                              String(s.id) === String(stageKey) ||
                              s.name === stageKey,
                          );
                          const process = stage?.processes.find(
                            (p) =>
                              String(p.id) === String(processKey) ||
                              p.name === processKey,
                          );
                          if (stage && process) {
                            setProcessEdit({
                              stageId: stage.id,
                              id: process.id,
                              name: process.name,
                            });
                          }
                        },
                      },
                      {
                        id: "delete-process",
                        text: "Delete",
                        visual: <PegaIcon name="trash" />,
                        onClick: (data: any) => {
                          console.log(
                            "[LifeCycle] delete-process action",
                            data,
                          );
                          const stageKey =
                            data?.category?.id ||
                            data?.categoryId ||
                            data?.category?.name ||
                            data?.stage?.id;
                          const processKey =
                            data?.task?.id || data?.id || data?.name;
                          const stage = stages.find(
                            (s) =>
                              String(s.id) === String(stageKey) ||
                              s.name === stageKey,
                          );
                          const process = stage?.processes.find(
                            (p) =>
                              String(p.id) === String(processKey) ||
                              p.name === processKey,
                          );
                          if (stage && process && onDeleteProcess) {
                            onDeleteProcess(stage.id, process.id);
                          }
                        },
                      },
                    ],
                    onClick: (data: any) => {
                      console.log("[LifeCycle] process onClick", data);
                      const stageKey =
                        data?.category?.id ||
                        data?.categoryId ||
                        data?.category?.name ||
                        data?.stage?.id;
                      const processKey =
                        data?.task?.id || data?.id || data?.name;
                      const stage = stages.find(
                        (s) =>
                          String(s.id) === String(stageKey) ||
                          s.name === stageKey,
                      );
                      const process = stage?.processes.find(
                        (p) =>
                          String(p.id) === String(processKey) ||
                          p.name === processKey,
                      );
                      if (stage && process) {
                        setProcessEdit({
                          stageId: stage.id,
                          id: process.id,
                          name: process.name,
                        });
                      }
                    },
                  },
                ]}
                step={[
                  {
                    wrap: true,
                    actions: [
                      {
                        id: "edit",
                        text: "Edit",
                        visual: <PegaIcon name="pencil" />,
                        onClick: handleEditStep,
                      },
                      {
                        id: "delete",
                        text: "Delete",
                        visual: <PegaIcon name="trash" />,
                        onClick: handleDeleteStep,
                      },
                    ],
                    onClick: (stepData: any) => {
                      for (const stage of stages) {
                        for (const process of stage.processes) {
                          const stepKey = stepData?.step?.id || stepData?.id;
                          const step = process.steps.find(
                            (s) =>
                              String(s.id) === String(stepKey) ||
                              s.name === stepKey,
                          );
                          if (step) {
                            onStepSelect(
                              String(stage.id),
                              String(process.id),
                              String(step.id),
                            );
                            return;
                          }
                        }
                      }
                    },
                  },
                ]}
              />
            </PegaProviders>
          </ErrorBoundary>
        );
      }

      reactRootRef.current.render(content);
      console.log("🔧 Pega LifeCycle rendered in Shadow DOM");
    } else {
      console.log("🔧 Cannot render - missing reactRoot or shadowRoot");
    }

    // Cleanup: do not unmount to avoid dev StrictMode double-invoke clearing
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mappedStages,
    onStepSelect,
    activeStage,
    activeProcess,
    activeStep,
    handleEditStep,
    handleDeleteStep,
    handleAddStep,
    _readOnly,
    onDeleteProcess,
  ]);

  return (
    <>
      <div ref={containerRef} style={containerStyle}></div>

      {/* Modal is rendered in the main document */}
      {editingStep &&
        (() => {
          console.log("🔍 Rendering modal with editingStep:", editingStep);
          console.log("🔍 Available fields:", fields);
          const modalStep = {
            ...editingStep,
            fields: editingStep.fields.map((field: any) => ({
              fieldId: field.fieldId || field.id,
              required: field.required || false,
            })),
          };
          console.log("🔍 Modal step:", modalStep);
          const handleUpdateMeta = (
            name: string,
            type: StepType,
            fields?: Field[],
          ) => {
            setEditingStep((prev) => (prev ? { ...prev, name, type } : prev));

            const inferObjectId = (): number | undefined => {
              try {
                const firstView: any = Array.isArray(views)
                  ? (views as any)[0]
                  : undefined;
                if (firstView && typeof firstView.objectid === "number") {
                  return firstView.objectid as number;
                }
              } catch {}
              try {
                const path =
                  typeof window !== "undefined" ? window.location.pathname : "";
                const match = path.match(/\/application\/(\d+)/);
                if (match && match[1]) return Number(match[1]);
              } catch {}
              return undefined;
            };

            (async () => {
              if (!onStepsUpdate) return;
              const wasCollectInfo = editingStep.type === "Collect information";
              const nowCollectInfo = type === "Collect information";
              const prevViewId =
                typeof (editingStep as any)?.viewId === "number"
                  ? ((editingStep as any).viewId as number)
                  : undefined;

              let createdViewId: number | undefined;
              if (nowCollectInfo && !wasCollectInfo) {
                const objectId = inferObjectId();
                try {
                  if (typeof objectId === "number") {
                    const createViewResponse = await fetch(
                      `/api/database?table=${DB_TABLES.VIEWS}`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name,
                          objectid: objectId,
                          model: {
                            fields: [],
                            layout: { type: "form", columns: 1 },
                          },
                        }),
                      },
                    );
                    if (createViewResponse.ok) {
                      const { data } = await createViewResponse.json();
                      createdViewId = (data && data.id) as number | undefined;
                      // If fields are provided from the modal, persist them to the view model immediately
                      if (
                        typeof createdViewId === "number" &&
                        Array.isArray(fields) &&
                        fields.length > 0
                      ) {
                        try {
                          const fieldRefs = fields.map((f) => ({
                            fieldId: f.id,
                          }));
                          const putResp = await fetch(
                            `/api/database?table=${DB_TABLES.VIEWS}&id=${createdViewId}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name,
                                objectid: objectId,
                                model: {
                                  fields: fieldRefs,
                                  layout: { type: "form", columns: 1 },
                                },
                              }),
                            },
                          );
                          if (!putResp.ok) {
                            const t = await putResp.text();
                            console.warn(
                              `Failed to set fields on new view ${createdViewId}: ${putResp.status} ${t}`,
                            );
                          }
                        } catch (e) {
                          console.warn(
                            "Error applying fields to newly created view:",
                            e,
                          );
                        }
                      }
                    } else {
                      console.warn(
                        "Failed to create view for step",
                        createViewResponse.status,
                      );
                    }
                  } else {
                    console.warn("Cannot infer objectid to create view");
                  }
                } catch (e) {
                  console.warn("Error creating view for step:", e);
                }
              } else if (wasCollectInfo && !nowCollectInfo) {
                // Delete the previously linked view if present
                try {
                  if (typeof prevViewId === "number") {
                    const delResp = await fetch(
                      `/api/database?table=${DB_TABLES.VIEWS}&id=${prevViewId}`,
                      { method: "DELETE" },
                    );
                    if (!delResp.ok) {
                      const errText = await delResp.text();
                      console.warn(
                        `Failed to delete linked view ${prevViewId}: ${delResp.status} ${errText}`,
                      );
                    }
                  }
                } catch (e) {
                  console.warn("Error deleting linked view for step:", e);
                }
              } else if (nowCollectInfo && wasCollectInfo) {
                // Update the existing view's fields to match the modal's fields when staying in Collect information
                try {
                  const objectId = inferObjectId();
                  const targetViewId = prevViewId;
                  if (
                    typeof targetViewId === "number" &&
                    Array.isArray(fields)
                  ) {
                    const fieldRefs = fields.map((f) => ({
                      fieldId: f.id,
                    }));
                    const putResp = await fetch(
                      `/api/database?table=${DB_TABLES.VIEWS}&id=${targetViewId}`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name,
                          objectid: objectId,
                          model: {
                            fields: fieldRefs,
                            layout: { type: "form", columns: 1 },
                          },
                        }),
                      },
                    );
                    if (!putResp.ok) {
                      const t = await putResp.text();
                      console.warn(
                        `Failed to update existing view ${targetViewId}: ${putResp.status} ${t}`,
                      );
                    }
                  }
                } catch (e) {
                  console.warn("Error updating existing view fields:", e);
                }
              }

              const updatedStages = stages.map((s) =>
                s.id === editingStep.stageId
                  ? {
                      ...s,
                      processes: s.processes.map((p) =>
                        p.id === editingStep.processId
                          ? {
                              ...p,
                              steps: p.steps.map((st) => {
                                if (st.id !== editingStep.id) return st;
                                const next: any = { ...st, name, type };
                                if (wasCollectInfo && !nowCollectInfo) {
                                  delete next.viewId;
                                  next.fields = [] as never[];
                                }
                                if (nowCollectInfo && !wasCollectInfo) {
                                  if (typeof createdViewId === "number") {
                                    next.viewId = createdViewId;
                                  }
                                  next.fields = [] as never[];
                                }
                                // Handle field changes for existing collect info steps
                                if (
                                  nowCollectInfo &&
                                  wasCollectInfo &&
                                  fields
                                ) {
                                  next.fields = fields.map((field) => ({
                                    fieldId: field.id,
                                  }));
                                }
                                // If switching to collect info and fields provided, set step fields as well (for model parity)
                                if (
                                  nowCollectInfo &&
                                  !wasCollectInfo &&
                                  fields
                                ) {
                                  next.fields = fields.map((field) => ({
                                    fieldId: field.id,
                                  }));
                                }
                                return next;
                              }),
                            }
                          : p,
                      ),
                    }
                  : s,
              );
              onStepsUpdate(updatedStages);
            })();
          };
          return (
            <StepConfigurationModal
              isOpen={!!editingStep}
              onClose={() => setEditingStep(null)}
              mode="edit"
              step={modalStep}
              fields={fields}
              onFieldChange={onFieldChange || (() => {})}
              onUpdateMeta={handleUpdateMeta}
              onAddField={async (field) => {
                if (!onAddField) return "";
                console.log("🟦 AddField start", { field });
                const createdFieldName = await onAddField(field);
                console.log("🟩 AddField created", { createdFieldName });
                // If step has a linked viewId, add the created field to the view
                const stepViewId = (editingStep as any)?.viewId as
                  | number
                  | undefined;
                const viewExists =
                  typeof stepViewId === "number" &&
                  Array.isArray(views) &&
                  views.some((v: any) => v && v.id === stepViewId);
                if (onAddFieldsToView && viewExists) {
                  console.log("🟪 Attaching to view", { stepViewId });
                  await onAddFieldsToView(stepViewId, [createdFieldName]);
                  console.log("🟪 Attached to view done");
                }
                // Optimistically add to the modal's local state with retries while fields refresh
                const tryUpdateEditingStep = () => {
                  const createdField = fieldsRef.current.find(
                    (f) => f.name === createdFieldName,
                  );
                  if (!createdField || typeof createdField.id !== "number") {
                    console.log("🟨 Created field not yet in fields list");
                    return false;
                  }
                  setEditingStep((prev) => {
                    if (!prev) return prev;
                    const alreadyPresent = (prev.fields || []).some(
                      (fr: any) =>
                        (fr.fieldId ?? fr.id) === (createdField as any).id,
                    );
                    if (alreadyPresent) return prev;
                    const nextFields = [
                      ...((prev.fields as any[]) || []),
                      { fieldId: createdField.id, required: false },
                    ];
                    console.log("🟢 Optimistically appended field to modal", {
                      id: createdField.id,
                    });
                    return { ...prev, fields: nextFields } as any;
                  });
                  return true;
                };
                let attempts = 0;
                const maxAttempts = 25;
                const intervalMs = 150;
                if (!tryUpdateEditingStep()) {
                  const timer = setInterval(() => {
                    attempts += 1;
                    if (tryUpdateEditingStep() || attempts >= maxAttempts) {
                      console.log("🟥 Stopping retry loop", { attempts });
                      clearInterval(timer);
                      // If no view to attach to, attach to step directly when field becomes available
                      if (
                        (!viewExists || typeof stepViewId !== "number") &&
                        onAddExistingField
                      ) {
                        const created = fieldsRef.current.find(
                          (f) => f.name === createdFieldName,
                        );
                        if (created && typeof created.id === "number") {
                          console.log("🟧 Attaching to step as fallback", {
                            stepId: (editingStep as any).stepId,
                            id: created.id,
                          });
                          onAddExistingField((editingStep as any).stepId, [
                            created.id,
                          ]);
                        }
                      }
                    }
                  }, intervalMs);
                }
                return createdFieldName;
              }}
              onAddExistingField={(
                stepId: number,
                numericFieldIds: number[],
              ) => {
                const stepViewId = (editingStep as any)?.viewId as
                  | number
                  | undefined;
                const addMissingLocally = (ids: number[]) => {
                  setEditingStep((prev) => {
                    if (!prev) return prev as any;
                    const existing = new Set(
                      (prev.fields || []).map((fr: any) => fr.fieldId ?? fr.id),
                    );
                    const additions = ids
                      .filter((id) => !existing.has(id))
                      .map((id) => ({ fieldId: id, required: false }));
                    if (additions.length === 0) return prev as any;
                    return {
                      ...(prev as any),
                      fields: [...(prev.fields as any[]), ...additions],
                    } as any;
                  });
                };

                const viewExists =
                  typeof stepViewId === "number" &&
                  Array.isArray(views) &&
                  views.some((v: any) => v && v.id === stepViewId);
                if (onAddFieldsToView && viewExists) {
                  const fieldNames = numericFieldIds
                    .map(
                      (id) =>
                        fieldsRef.current.find((f) => f.id === id)?.name ||
                        null,
                    )
                    .filter((n): n is string => !!n);
                  try {
                    onAddFieldsToView(stepViewId, fieldNames);
                  } finally {
                    addMissingLocally(numericFieldIds);
                  }
                } else if (onAddExistingField) {
                  try {
                    onAddExistingField(stepId, numericFieldIds);
                  } finally {
                    addMissingLocally(numericFieldIds);
                  }
                }
              }}
              onUpdateField={onUpdateField || (() => {})}
              onDeleteField={onDeleteField || (() => {})}
            />
          );
        })()}

      {/* Edit Stage Modal */}
      {stageEdit && (
        <EditModal
          isOpen={!!stageEdit}
          onClose={() => setStageEdit(null)}
          type="stage"
          name={stageEdit.name}
          onSubmit={(data: { name: string }) => {
            if (!onStepsUpdate) return;
            const updatedStages = stages.map((s) =>
              s.id === stageEdit.id ? { ...s, name: data.name } : s,
            );
            onStepsUpdate(updatedStages);
          }}
        />
      )}

      {/* Add Process Modal */}
      {processModal.isOpen && processModal.stageId !== null && (
        <AddProcessModal
          isOpen={processModal.isOpen}
          onClose={() => setProcessModal({ stageId: null, isOpen: false })}
          onAddProcess={({ name }) => {
            if (onAddProcess && processModal.stageId !== null) {
              onAddProcess(processModal.stageId, name);
            }
            setProcessModal({ stageId: null, isOpen: false });
          }}
        />
      )}

      {/* Edit Process Modal */}
      {processEdit && (
        <EditModal
          isOpen={!!processEdit}
          onClose={() => setProcessEdit(null)}
          type="process"
          name={processEdit.name}
          onSubmit={(data: { name: string }) => {
            if (!onStepsUpdate) return;
            const updatedStages = stages.map((s) =>
              s.id === processEdit.stageId
                ? {
                    ...s,
                    processes: s.processes.map((p) =>
                      p.id === processEdit.id ? { ...p, name: data.name } : p,
                    ),
                  }
                : s,
            );
            onStepsUpdate(updatedStages);
          }}
        />
      )}

      {stepEdit && (
        <EditModal
          isOpen={!!stepEdit}
          onClose={() => setStepEdit(null)}
          type="step"
          name={stepEdit.name}
          stepType={stepEdit.stepType}
          onSubmit={(data: {
            name: string;
            type?: StepType;
            fields?: never[];
          }) => {
            if (!onStepsUpdate) return;
            const updatedStages = stages.map((s) =>
              s.id === stepEdit.stageId
                ? {
                    ...s,
                    processes: s.processes.map((p) =>
                      p.id === stepEdit.processId
                        ? {
                            ...p,
                            steps: p.steps.map((st) =>
                              st.id === stepEdit.id
                                ? {
                                    ...st,
                                    name: data.name,
                                    type: (data.type || st.type) as StepType,
                                    ...(data.fields ? { fields: [] } : {}),
                                  }
                                : st,
                            ),
                          }
                        : p,
                    ),
                  }
                : s,
            );
            onStepsUpdate(updatedStages);
          }}
        />
      )}

      {/* Add Step Modal */}
      {addingStep.isOpen &&
        addingStep.stageId !== null &&
        addingStep.processId !== null && (
          <StepConfigurationModal
            isOpen={addingStep.isOpen}
            onClose={() =>
              setAddingStep({
                stageId: null,
                processId: null,
                isOpen: false,
              })
            }
            mode="add"
            stageId={addingStep.stageId}
            processId={addingStep.processId}
            fields={fields}
            onFieldChange={onFieldChange || (() => {})}
            onAddField={async (field) => {
              if (!onAddField) return "";
              console.log("🟦 AddField start (add step mode)", { field });
              const createdFieldName = await onAddField(field);
              console.log("🟩 AddField created (add step mode)", {
                createdFieldName,
              });
              return createdFieldName;
            }}
            onAddExistingField={(stepId: number, fieldIds: number[]) => {
              if (onAddExistingField) {
                onAddExistingField(stepId, fieldIds);
              }
            }}
            onUpdateField={onUpdateField || (() => {})}
            onDeleteField={onDeleteField || (() => {})}
            workflowObjects={[]}
            dataObjects={[]}
            onAddStep={(stageId, processId, stepName, stepType, fields) => {
              if (onAddStep) {
                onAddStep(
                  stageId,
                  processId,
                  stepName,
                  stepType,
                  fields?.map((f) => ({
                    id: f.id!,
                  })),
                );
              }
              setAddingStep({
                stageId: null,
                processId: null,
                isOpen: false,
              });
            }}
          />
        )}
    </>
  );
};

export default WorkflowLifecycleViewImpl;
