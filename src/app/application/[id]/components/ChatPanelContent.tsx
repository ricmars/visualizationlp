"use client";

import React from "react";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatInterface, { ChatMessage } from "../../../components/ChatInterface";
import type { ChatMode } from "../../../types";

type ChatPanelContentProps = {
  messages: ChatMessage[];
  onSendMessage: (message: string, mode?: ChatMode) => Promise<void> | void;
  onAbort: () => void;
  isProcessing: boolean;
  objectid: number;
  onQuickAction: () => void;
  onClearChat: () => void;
  additionalHeaderButtons?: React.ReactNode;
  applicationId?: number;
};

export default function ChatPanelContent({
  messages,
  onSendMessage,
  onAbort,
  isProcessing,
  objectid,
  onQuickAction,
  onClearChat,
  additionalHeaderButtons,
  applicationId,
}: ChatPanelContentProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <ChatPanelHeader
        onQuickAction={onQuickAction}
        onClearChat={onClearChat}
        additionalButtons={additionalHeaderButtons}
      />
      <div className="flex-1 min-w-0 chat-panel-bg min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={onSendMessage}
          onAbort={onAbort}
          isProcessing={isProcessing}
          isLoading={false}
          objectid={objectid}
          applicationId={applicationId}
        />
      </div>
    </div>
  );
}
