export type MinimalField = { id: number; name: string };
export type MinimalView = { id: number; name: string };

export type MinimalStep = { id: number; name: string } & Record<
  string,
  unknown
>;
export type MinimalProcess = { id: number; name: string; steps: MinimalStep[] };
export type MinimalStage = {
  id: number;
  name: string;
  processes: MinimalProcess[];
};
export type MinimalDecisionTable = { id: number; name: string };

type ComposeQuickChatMessageArgs = {
  quickChatText: string;
  selectedFieldIds: number[];
  selectedViewIds: number[];
  selectedStageIds: number[];
  selectedProcessIds: number[];
  selectedStepIds: number[];
  fields: MinimalField[];
  views: MinimalView[];
  stages: MinimalStage[];
  // When interacting with the Data Object fields view, include object id
  selectedObjectId?: number | null;
  isDataObjectView?: boolean;
  // Decision table quick tool selections
  decisionTables?: MinimalDecisionTable[];
  selectedDecisionTableId?: number | null;
  selectedDecisionTableFieldIds?: number[];
};

export function composeQuickChatMessage({
  quickChatText,
  selectedFieldIds,
  selectedViewIds,
  selectedStageIds,
  selectedProcessIds,
  selectedStepIds,
  fields,
  views,
  stages,
  selectedObjectId = null,
  isDataObjectView = false,
  decisionTables = [],
  selectedDecisionTableId = null,
  selectedDecisionTableFieldIds = [],
}: ComposeQuickChatMessageArgs): string {
  const chosenFields = fields.filter((f) => selectedFieldIds.includes(f.id));
  const fieldNames = chosenFields.map((f) => f.name);

  const chosenViews = views.filter((v) => selectedViewIds.includes(v.id));
  const viewNames = chosenViews.map((v) => v.name);

  const chosenStages = stages.filter((s) => selectedStageIds.includes(s.id));
  const stageNames = chosenStages.map((s) => s.name);

  const processMap: { ids: number[]; names: string[] } = { ids: [], names: [] };
  for (const stage of stages) {
    for (const process of stage.processes) {
      if (selectedProcessIds.includes(process.id)) {
        processMap.ids.push(process.id);
        processMap.names.push(process.name);
      }
    }
  }

  const stepMap: { ids: number[]; names: string[] } = { ids: [], names: [] };
  for (const stage of stages) {
    for (const process of stage.processes) {
      for (const step of process.steps) {
        if (selectedStepIds.includes(step.id)) {
          stepMap.ids.push(step.id);
          stepMap.names.push(step.name);
        }
      }
    }
  }

  const contextLines: string[] = ["Context:"];
  const addIfNonEmpty = (label: string, arr: unknown[]) => {
    if (Array.isArray(arr) && arr.length > 0) {
      contextLines.push(`${label}=${JSON.stringify(arr)}`);
    }
  };

  addIfNonEmpty("Selected fieldIds", selectedFieldIds);
  addIfNonEmpty("Selected fieldNames", fieldNames);
  if (!isDataObjectView) {
    addIfNonEmpty("Selected viewIds", selectedViewIds);
    addIfNonEmpty("Selected viewNames", viewNames);
  }
  if (selectedObjectId !== null) {
    contextLines.push(`Selected objectId=${JSON.stringify(selectedObjectId)}`);
  }
  addIfNonEmpty("Selected stageIds", selectedStageIds);
  addIfNonEmpty("Selected stageNames", stageNames);
  addIfNonEmpty("Selected processIds", processMap.ids);
  addIfNonEmpty("Selected processNames", processMap.names);
  addIfNonEmpty("Selected stepIds", stepMap.ids);
  addIfNonEmpty("Selected stepNames", stepMap.names);

  // Decision table context for quick tool
  if (typeof selectedDecisionTableId === "number") {
    contextLines.push(
      `Selected decisionTableId=${JSON.stringify(selectedDecisionTableId)}`,
    );
    const dt = decisionTables.find((d) => d.id === selectedDecisionTableId);
    if (dt) {
      contextLines.push(
        `Selected decisionTableName=${JSON.stringify(dt.name)}`,
      );
    }
  }
  if (
    Array.isArray(selectedDecisionTableFieldIds) &&
    selectedDecisionTableFieldIds.length > 0
  ) {
    const chosenDTFields = fields.filter((f) =>
      selectedDecisionTableFieldIds.includes(f.id),
    );
    const chosenDTFieldNames = chosenDTFields.map((f) => f.name);
    addIfNonEmpty(
      "Selected decisionTableFieldIds",
      selectedDecisionTableFieldIds,
    );
    addIfNonEmpty("Selected decisionTableFieldNames", chosenDTFieldNames);
  }

  const contextPrefix = contextLines.join("\n");

  const composedMessage = `${contextPrefix}\nInstruction: ${quickChatText.trim()}`;
  return composedMessage;
}
