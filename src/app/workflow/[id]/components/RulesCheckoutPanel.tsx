"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFolder,
  FaFolderOpen,
} from "react-icons/fa";

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
  categories: CategoryGroup[];
  totalChanges: number;
  totalCheckpoints: number;
}

type RulesCheckoutPanelProps = {
  caseId?: number;
  applicationId?: number;
};

export default function RulesCheckoutPanel({
  caseId,
  applicationId,
}: RulesCheckoutPanelProps) {
  const [data, setData] = useState<RuleCheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const fetchCheckoutData = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/checkpoint/checkout";
      const params = new URLSearchParams();

      if (applicationId) {
        params.append("applicationid", applicationId.toString());
      } else if (caseId) {
        params.append("caseid", caseId.toString());
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
  }, [caseId, applicationId]);

  useEffect(() => {
    fetchCheckoutData();
    // Expand all categories by default
    setExpandedCategories(new Set(["app", "workflow", "ui", "data"]));
  }, [fetchCheckoutData]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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

  const getCategoryIcon = (category: string, isExpanded: boolean) => {
    const iconClass = "w-4 h-4 text-gray-400";
    if (isExpanded) {
      return <FaFolderOpen className={iconClass} />;
    }
    return <FaFolder className={iconClass} />;
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Tree Navigation */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-white/70">Loading...</span>
          </div>
        ) : !data || data.categories.length === 0 ? (
          <div className="text-center py-8 text-white/70 text-sm">
            No rule changes found
          </div>
        ) : (
          <div className="p-3">
            {data.categories.map((category) => {
              const isExpanded = expandedCategories.has(category.category);
              const hasRules = category.rules.length > 0;

              return (
                <div key={category.category} className="mb-3">
                  {/* Category Header */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      hasRules
                        ? "hover:bg-white/10"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() =>
                      hasRules && toggleCategory(category.category)
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
                    <span className="font-medium text-sm text-white">
                      {category.categoryName}
                    </span>
                    <span className="ml-auto text-xs text-white/60">
                      {category.rules.length}
                    </span>
                  </div>

                  {/* Category Rules */}
                  {isExpanded && hasRules && (
                    <div className="ml-6 mt-1 space-y-1">
                      {category.rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center gap-2 p-2 rounded-md text-white/80"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getOperationIcon(rule.operation)}
                            <span className="font-medium truncate text-sm">
                              {rule.name}
                            </span>
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
    </div>
  );
}
