"use client";

import React from "react";
import ChatPanelHeader from "./ChatPanelHeader";
import ChatInterface, { ChatMessage } from "../../../components/ChatInterface";

type ChatPanelContentProps = {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void> | void;
  onAbort: () => void;
  isProcessing: boolean;
  objectid: number;
  onQuickAction: () => void;
  onClearChat: () => void;
};

export default function ChatPanelContent({
  messages,
  onSendMessage,
  onAbort,
  isProcessing,
  objectid,
  onQuickAction,
  onClearChat,
}: ChatPanelContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatPanelHeader
        onQuickAction={onQuickAction}
        onClearChat={onClearChat}
      />
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={onSendMessage}
          onAbort={onAbort}
          isProcessing={isProcessing}
          isLoading={false}
          objectid={objectid}
        />
      </div>
    </div>
  );
}
