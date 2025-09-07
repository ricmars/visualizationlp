"use client";

import { useCallback, useRef, useState } from "react";
import { Field, Stage } from "../../../types/types";
import { composeQuickChatMessage } from "../utils/composeQuickChatMessage";
import useQuickSelectionSummary from "./useQuickSelectionSummary";
import useChatMessaging from "./useChatMessaging";

type UseQuickChatArgs = {
  stages: Stage[];
  fields: Field[];
  views: { id: number; name: string }[];
  selectedFieldIds: number[];
  selectedViewIds: number[];
  selectedStageIds: number[];
  selectedProcessIds: number[];
  selectedStepIds: number[];
  messages: any[];
  setMessagesAction: (updater: (prev: any[]) => any[]) => void;
  setIsProcessingAction: (next: boolean) => void;
  selectedCase: { id: number; name: string } | null;
  applicationId?: number | null;
  refreshWorkflowDataAction: () => Promise<void>;
  refreshApplicationWorkflowsAction?: () => Promise<void>;
  setSelectedViewAction: (next: string | null) => void;
  setActiveStageAction: (next: string | undefined) => void;
  setActiveProcessAction: (next: string | undefined) => void;
  setActiveStepAction: (next: string | undefined) => void;
  isDataObjectView?: boolean;
  selectedObjectId?: number | null;
};

export function useQuickChat({
  stages,
  fields,
  views,
  selectedFieldIds,
  selectedViewIds,
  selectedStageIds,
  selectedProcessIds,
  selectedStepIds,
  messages,
  setMessagesAction,
  setIsProcessingAction,
  selectedCase,
  applicationId,
  refreshWorkflowDataAction,
  refreshApplicationWorkflowsAction,
  setSelectedViewAction,
  setActiveStageAction,
  setActiveProcessAction,
  setActiveStepAction,
  isDataObjectView = false,
  selectedObjectId = null,
}: UseQuickChatArgs) {
  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [quickChatText, setQuickChatText] = useState("");
  const quickInputRef = useRef<HTMLInputElement>(null);
  const selectedCaseId = selectedCase?.id ?? null;

  const quickSelectionSummary = useQuickSelectionSummary({
    stages,
    selectedStageIds,
    selectedProcessIds,
    selectedStepIds,
    selectedFieldIds,
    selectedViewIds,
    isDataObjectView,
    selectedObjectId,
  });

  const { handleSendMessage } = useChatMessaging({
    messages,
    setMessagesAction,
    setIsProcessingAction,
    selectedCase,
    applicationId,
    stages,
    refreshWorkflowDataAction,
    refreshApplicationWorkflowsAction,
    setSelectedViewAction,
    setActiveStageAction,
    setActiveProcessAction,
    setActiveStepAction,
  });

  const sendQuickChat = useCallback(
    async (textArg?: string) => {
      const text = (textArg ?? quickChatText).trim();
      if (!text) return;
      const composedMessage = composeQuickChatMessage({
        quickChatText: text,
        selectedFieldIds,
        selectedViewIds: isDataObjectView ? [] : selectedViewIds,
        selectedStageIds,
        selectedProcessIds,
        selectedStepIds,
        fields: fields.map((f) => ({ id: f.id as number, name: f.name })),
        views: views.map((v) => ({ id: v.id as number, name: v.name })),
        stages: stages as any,
        selectedObjectId: selectedObjectId ?? selectedCaseId ?? null,
        isDataObjectView,
      });
      // Leave closing/clearing to caller (so UI can control timing)
      void handleSendMessage(composedMessage);
    },
    [
      quickChatText,
      selectedFieldIds,
      selectedViewIds,
      selectedStageIds,
      selectedProcessIds,
      selectedStepIds,
      fields,
      views,
      stages,
      handleSendMessage,
      isDataObjectView,
      selectedObjectId,
      selectedCaseId,
    ],
  );

  return {
    isQuickChatOpen,
    setIsQuickChatOpen,
    quickChatText,
    setQuickChatText,
    quickInputRef,
    quickSelectionSummary,
    sendQuickChat,
  } as const;
}
