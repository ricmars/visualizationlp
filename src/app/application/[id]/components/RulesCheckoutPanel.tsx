"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import {
  MdAccountTree,
  MdApps,
  MdStorage,
  MdTableView,
  MdTextFields,
} from "react-icons/md";
import EditFieldModal from "../../../components/EditFieldModal";
import EditWorkflowModal from "../../../components/EditWorkflowModal";
import StepConfigurationModal from "../../../components/StepConfigurationModal";
import { Field, Stage } from "../../../types/types";
import { DB_TABLES } from "../../../types/database";
import { MODEL_UPDATED_EVENT } from "../utils/constants";

interface RuleChange {
  id: string;
  name: string;
  type: string;
  category: string;
  operation: string;
  checkpointId: string;
  checkpointDescription: string;
  checkpointCreatedAt: string;
  checkpointSource: string;
}

interface CategoryGroup {
  category: string;
  categoryName: string;
  rules: RuleChange[];
}

interface RuleCheckoutData {
  objectGroups: Array<{
    objectId: number;
    objectName: string;
    hasWorkflow: boolean;
    categories: CategoryGroup[];
    totalChanges: number;
  }>;
  applicationCategory?: CategoryGroup | null;
  totalChanges: number;
  totalCheckpoints: number;
}

type RulesCheckoutPanelProps = {
  objectid?: number;
  applicationId?: number;
  stages?: Stage[];
  fields?: Field[];
};

export default function RulesCheckoutPanel({
  objectid,
  applicationId,
  fields = [],
}: RulesCheckoutPanelProps) {
  const [data, setData] = useState<RuleCheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Set<number>>(
    new Set(),
  );
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<Set<string>>(
    new Set(),
  );
  const [isAppExpanded, setIsAppExpanded] = useState<boolean>(true);

  // Modal state management
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [editingView, setEditingView] = useState<{
    id: number;
    name: string;
    model: any;
    objectid: number;
  } | null>(null);
  const [editingApplication, setEditingApplication] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);

  const fetchCheckoutData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/checkpoint/checkout";
      const params = new URLSearchParams();

      if (applicationId) {
        params.append("applicationid", applicationId.toString());
      } else if (objectid) {
        params.append("objectid", objectid.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        console.error("Failed to fetch rule checkout data:", result.error);
      }
    } catch (error) {
      console.error("Error fetching rule checkout data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [objectid, applicationId]);

  useEffect(() => {
    fetchCheckoutData();
    // Defaults will be set after first data load

    // Listen for model updates to refresh checkout data
    const handler = () => fetchCheckoutData();
    const refreshHandler = () => fetchCheckoutData();
    try {
      window.addEventListener(MODEL_UPDATED_EVENT, handler as EventListener);
      window.addEventListener(
        "refresh-checkout-panel",
        refreshHandler as EventListener,
      );
    } catch {}
    return () => {
      try {
        window.removeEventListener(
          MODEL_UPDATED_EVENT,
          handler as EventListener,
        );
        window.removeEventListener(
          "refresh-checkout-panel",
          refreshHandler as EventListener,
        );
      } catch {}
    };
  }, [fetchCheckoutData]);

  // Expand helpers
  const toggleObject = (objectId: number) => {
    const next = new Set(expandedObjects);
    if (next.has(objectId)) next.delete(objectId);
    else next.add(objectId);
    setExpandedObjects(next);
  };

  const makeCategoryKey = (objectId: number, category: string): string =>
    `${objectId}:${category}`;

  const toggleObjectCategory = (objectId: number, category: string) => {
    const key = makeCategoryKey(objectId, category);
    const next = new Set(expandedCategoryKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedCategoryKeys(next);
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case "Create":
        return <FaPlus className="w-3 h-3 text-green-500" />;
      case "Update":
        return <FaEdit className="w-3 h-3 text-blue-500" />;
      case "Delete":
        return <FaTrash className="w-3 h-3 text-red-500" />;
      default:
        return <FaEdit className="w-3 h-3 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string, _isExpanded: boolean) => {
    const iconClass = "w-4 h-4 text-gray-400";
    switch (category) {
      case "workflow":
        return <MdAccountTree className={iconClass} />;
      case "ui":
        return <MdTableView className={iconClass} />;
      case "data":
        return <MdTextFields className={iconClass} />;
      case "app":
        return <MdApps className={iconClass} />;
      default:
        return <MdAccountTree className={iconClass} />;
    }
  };

  const getObjectIcon = (hasWorkflow: boolean) => {
    const iconClass = "w-4 h-4 text-gray-400";
    return hasWorkflow ? (
      <MdAccountTree className={iconClass} />
    ) : (
      <MdStorage className={iconClass} />
    );
  };

  // Extract table name from rule ID
  const getTableFromRuleId = (ruleId: string): string | null => {
    // Rule ID format: ${checkpoint.id}-${table}-${id}
    // Checkpoint ID is a UUID with hyphens, so we need to handle this carefully
    const lastDashIndex = ruleId.lastIndexOf("-");
    if (lastDashIndex === -1) return null;

    const beforeLastDash = ruleId.substring(0, lastDashIndex);
    const secondLastDashIndex = beforeLastDash.lastIndexOf("-");
    if (secondLastDashIndex === -1) return null;

    // Extract the table name between the second-to-last and last dash
    const table = ruleId.substring(secondLastDashIndex + 1, lastDashIndex);
    return table;
  };

  // Resolve a pseudo-step from a view record for the StepConfigurationModal
  const makePseudoStepFromView = (view: {
    id: number;
    name: string;
    model: any;
  }) => {
    let parsedModel: any = view.model;
    try {
      parsedModel =
        typeof view.model === "string" ? JSON.parse(view.model) : view.model;
    } catch {}
    const modelFields = Array.isArray(parsedModel?.fields)
      ? parsedModel.fields
      : [];
    return {
      id: view.id,
      stageId: 0,
      processId: 0,
      stepId: view.id,
      name: view.name,
      fields: modelFields.map((f: any) => ({
        fieldId: Number(f.fieldId),
        required: !!f.required,
      })),
      type: "Collect information",
    };
  };

  // View model adapters for StepConfigurationModal handlers
  const updateViewModel = async (
    view: { id: number; name: string; model: any },
    nextFields: Array<{ fieldId: number; required?: boolean }>,
  ) => {
    const nextModel = {
      ...((typeof view.model === "string"
        ? (() => {
            try {
              return JSON.parse(view.model);
            } catch {
              return {};
            }
          })()
        : view.model) || {}),
      fields: nextFields,
    };

    const response = await fetch(
      `/api/database?table=${DB_TABLES.VIEWS}&id=${view.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: DB_TABLES.VIEWS,
          data: { name: view.name, model: JSON.stringify(nextModel) },
        }),
      },
    );
    if (!response.ok) {
      console.error("Failed to update view model");
      return false;
    }
    await fetchCheckoutData();
    return true;
  };

  // Handle rule click
  const handleRuleClick = async (rule: RuleChange) => {
    const table = getTableFromRuleId(rule.id);
    if (!table) {
      console.error("Could not extract table from rule ID:", rule.id);
      return;
    }

    try {
      const response = await fetch(
        `/api/checkpoint/rule?ruleId=${encodeURIComponent(
          rule.id,
        )}&table=${encodeURIComponent(table)}`,
      );

      if (!response.ok) {
        console.error("Failed to fetch rule data:", response.statusText);
        return;
      }

      const result = await response.json();
      if (!result.success) {
        console.error("Failed to fetch rule data:", result.error);
        return;
      }

      const ruleData = result.data;

      // Open appropriate modal based on rule type
      switch (table) {
        case "Fields":
          setEditingField(ruleData as Field);
          break;
        case "Objects":
          setEditingWorkflow({
            name: ruleData.name,
            description: ruleData.description,
          });
          break;
        case "Views":
          setEditingView(ruleData);
          break;
        case "Applications":
          setEditingApplication(ruleData);
          break;
        default:
          console.error("Unsupported table type:", table);
      }
    } catch (error) {
      console.error("Error fetching rule data:", error);
    }
  };

  // Handle field update
  const handleFieldUpdate = async (updates: Partial<Field>) => {
    if (!editingField) return;

    const requestData = {
      table: DB_TABLES.FIELDS,
      data: {
        name: editingField.name, // Keep the original name
        objectid: editingField.objectid, // Keep the original objectid
        label: updates.label,
        type: updates.type,
        primary:
          updates.primary !== undefined
            ? updates.primary
            : editingField.primary,
        required:
          updates.required !== undefined
            ? updates.required
            : editingField.required,
        options: updates.options || editingField.options || [],
        sampleValue:
          updates.sampleValue !== undefined
            ? updates.sampleValue
            : editingField.sampleValue,
        description: updates.description || editingField.description || "",
        order: updates.order || editingField.order || 0,
      },
    };

    console.log("Sending field update data:", requestData);
    console.log("Editing field:", editingField);

    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.FIELDS}&id=${editingField.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        },
      );

      if (response.ok) {
        // Refresh the checkout data
        await fetchCheckoutData();
        setEditingField(null);
      } else {
        const errorText = await response.text();
        console.error("Failed to update field:", response.statusText);
        console.error("Error response:", errorText);
      }
    } catch (error) {
      console.error("Error updating field:", error);
    }
  };

  // Handle workflow update
  const handleWorkflowUpdate = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editingWorkflow) return;

    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table: DB_TABLES.OBJECTS,
            data: {
              name: data.name,
              description: data.description,
            },
          }),
        },
      );

      if (response.ok) {
        // Refresh the checkout data
        await fetchCheckoutData();
        setEditingWorkflow(null);
      } else {
        console.error("Failed to update workflow:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
    }
  };

  // Handle application update
  const handleApplicationUpdate = async (data: {
    name: string;
    description: string;
  }) => {
    if (!editingApplication) return;

    try {
      const response = await fetch(
        `/api/database?table=${DB_TABLES.APPLICATIONS}&id=${editingApplication.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table: DB_TABLES.APPLICATIONS,
            data: {
              name: data.name,
              description: data.description,
            },
          }),
        },
      );

      if (response.ok) {
        // Refresh the checkout data
        await fetchCheckoutData();
        setEditingApplication(null);
      } else {
        console.error("Failed to update application:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  // View model field adapters for StepConfigurationModal when editing a View
  const onViewAddField = async (field: {
    label: string;
    type: Field["type"];
    options?: string[];
    required?: boolean;
    primary?: boolean;
  }): Promise<string> => {
    // Create the Field in DB first (reuse existing endpoint expectations)
    const request = await fetch(`/api/database?table=${DB_TABLES.FIELDS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: DB_TABLES.FIELDS,
        data: {
          objectid: editingView?.objectid,
          name: field.label.replace(/\s+/g, "_").toLowerCase(),
          label: field.label,
          type: field.type,
          primary: field.primary ?? false,
          description: "",
          order: 0,
          options: field.options || [],
          required: field.required ?? false,
        },
      }),
    });
    const resp = await request.json();
    // We return the field name since upstream handlers expect it, though ViewsPanel uses names→ids mapping
    return (resp?.data?.name as string) || field.label;
  };

  const onViewAddExistingField = async (stepId: number, fieldIds: number[]) => {
    if (!editingView) return;
    const current = makePseudoStepFromView(editingView);
    const existingIds = new Set(
      current.fields.map((f: { fieldId: any }) => f.fieldId),
    );
    const nextFields = [
      ...current.fields,
      ...fieldIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ fieldId: id, required: false })),
    ];
    await updateViewModel(editingView, nextFields);
  };

  const onViewUpdateField = async (updates: Partial<Field>) => {
    // Update the Field itself in DB (label/type/etc.)
    if (!updates.id) return;
    await fetch(`/api/database?table=${DB_TABLES.FIELDS}&id=${updates.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: DB_TABLES.FIELDS, data: updates }),
    });
    await fetchCheckoutData();
  };

  const onViewDeleteField = async (field: Field) => {
    if (!editingView) return;
    const current = makePseudoStepFromView(editingView);
    const nextFields = current.fields.filter(
      (f: { fieldId: number | undefined }) => f.fieldId !== field.id,
    );
    await updateViewModel(editingView, nextFields);
  };

  const onViewFieldChange = (
    _fieldId: number,
    _value: string | number | boolean,
  ) => {
    // No-op for view editing preview in checkout panel
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Tree Navigation */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-white/70">Loading...</span>
          </div>
        ) : (() => {
            const hasObjectChanges = (data?.objectGroups?.length || 0) > 0;
            const hasAppChanges =
              !!data?.applicationCategory &&
              data.applicationCategory.rules.length > 0;
            return !data || (!hasObjectChanges && !hasAppChanges);
          })() ? (
          <div className="text-center py-8 text-white/70 text-sm">
            No rule changes found
          </div>
        ) : (
          <div className="px-2">
            {/* Object Groups */}
            {data?.objectGroups?.map((group) => {
              const isObjExpanded = expandedObjects.has(group.objectId);
              return (
                <div key={group.objectId} className="mb-2">
                  {/* Object Header */}
                  <div
                    className="flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => toggleObject(group.objectId)}
                  >
                    {isObjExpanded ? (
                      <FaChevronDown className="w-3 h-3 text-white/60" />
                    ) : (
                      <FaChevronRight className="w-3 h-3 text-white/60" />
                    )}
                    {getObjectIcon(group.hasWorkflow)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[13px] leading-4 truncate text-white">
                        {group.objectName}
                      </div>
                    </div>
                    <span className="ml-2 text-[11px] text-white/60">
                      {group.totalChanges}
                    </span>
                  </div>

                  {/* Categories under object */}
                  {isObjExpanded && group.categories.length > 0 && (
                    <div className="ml-4 mt-0.5">
                      {group.categories.map((category) => {
                        const key = makeCategoryKey(
                          group.objectId,
                          category.category,
                        );
                        const isExpanded = expandedCategoryKeys.has(key);
                        const hasRules = category.rules.length > 0;
                        return (
                          <div key={category.category} className="mb-0.5">
                            <div
                              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                hasRules
                                  ? "hover:bg-white/10"
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              onClick={() =>
                                hasRules &&
                                toggleObjectCategory(
                                  group.objectId,
                                  category.category,
                                )
                              }
                            >
                              {hasRules ? (
                                isExpanded ? (
                                  <FaChevronDown className="w-3 h-3 text-white/60" />
                                ) : (
                                  <FaChevronRight className="w-3 h-3 text-white/60" />
                                )
                              ) : (
                                <div className="w-3 h-3" />
                              )}
                              {getCategoryIcon(category.category, isExpanded)}
                              <span className="font-medium text-[12px] text-white">
                                {category.categoryName}
                              </span>
                              <span className="ml-auto text-[11px] text-white/60">
                                {category.rules.length}
                              </span>
                            </div>

                            {isExpanded && hasRules && (
                              <div className="ml-3 mt-0.5 space-y-0.5">
                                {category.rules.map((rule) => (
                                  <div
                                    key={rule.id}
                                    className="flex items-start gap-2 p-1.5 rounded text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
                                    onClick={() => handleRuleClick(rule)}
                                  >
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                      {getOperationIcon(rule.operation)}
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium truncate text-[12px] leading-4">
                                          {rule.name}
                                        </div>
                                        {category.category === "data" && (
                                          <div className="text-[11px] text-white/60 leading-4 truncate">
                                            {rule.type}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Application Category (global) */}
            {data?.applicationCategory &&
              data.applicationCategory.rules.length > 0 && (
                <div className="mt-2">
                  <div
                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-white/10`}
                    onClick={() => setIsAppExpanded((v) => !v)}
                  >
                    {isAppExpanded ? (
                      <FaChevronDown className="w-3 h-3 text-white/60" />
                    ) : (
                      <FaChevronRight className="w-3 h-3 text-white/60" />
                    )}
                    {getCategoryIcon("app", isAppExpanded)}
                    <span className="font-medium text-[12px] text-white">
                      {data.applicationCategory.categoryName}
                    </span>
                    <span className="ml-auto text-[11px] text-white/60">
                      {data.applicationCategory.rules.length}
                    </span>
                  </div>
                  {isAppExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5">
                      {data.applicationCategory.rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-start gap-2 p-1.5 rounded text-white/80 hover:bg-white/10 cursor-pointer transition-colors"
                          onClick={() => handleRuleClick(rule)}
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {getOperationIcon(rule.operation)}
                            <span className="font-medium truncate text-[12px] leading-4">
                              {rule.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Modals */}
      {editingField && (
        <EditFieldModal
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onSubmit={handleFieldUpdate}
          field={editingField}
          workflowObjects={[]}
          dataObjects={[]}
        />
      )}

      {editingWorkflow && (
        <EditWorkflowModal
          isOpen={!!editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          onSubmit={handleWorkflowUpdate}
          initialData={editingWorkflow}
        />
      )}

      {/* View Edit uses StepConfigurationModal for consistent styles */}
      {editingView && (
        <StepConfigurationModal
          isOpen={!!editingView}
          onClose={() => setEditingView(null)}
          mode="edit"
          step={makePseudoStepFromView(editingView)}
          fields={fields}
          onFieldChange={onViewFieldChange}
          onAddField={onViewAddField}
          onAddExistingField={onViewAddExistingField}
          onUpdateField={onViewUpdateField}
          onDeleteField={onViewDeleteField}
        />
      )}

      {/* Application Edit Modal */}
      {editingApplication && (
        <EditWorkflowModal
          isOpen={!!editingApplication}
          onClose={() => setEditingApplication(null)}
          onSubmit={handleApplicationUpdate}
          initialData={{
            name: editingApplication.name,
            description: editingApplication.description,
          }}
        />
      )}
    </div>
  );
}
