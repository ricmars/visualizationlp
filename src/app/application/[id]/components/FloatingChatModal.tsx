"use client";

import { useState } from "react";
import { ChatMessage } from "../../../components/ChatInterface";
import ChatPanelContent from "./ChatPanelContent";
import type { ChatMode } from "../../../types/types";
import dynamic from "next/dynamic";

const Icon = dynamic(() =>
  import("@pega/cosmos-react-core").then((mod) => ({ default: mod.Icon })),
);

interface FloatingChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (
    message: string,
    mode?: ChatMode,
    attachedFiles?: Array<{
      id: string;
      file: File;
      name: string;
      content: string;
      type: "text" | "image" | "pdf";
      base64?: string;
    }>,
    modelId?: string,
  ) => void;
  onAbort: () => void;
  isProcessing: boolean;
  objectid: number;
  onQuickAction: () => void;
  onClearChat: () => void;
  applicationId: number;
}

export default function FloatingChatModal({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onAbort,
  isProcessing,
  objectid,
  onQuickAction,
  onClearChat,
  applicationId,
}: FloatingChatModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-none ${
        isExpanded ? "" : "flex items-end justify-end p-4"
      }`}
    >
      <div
        className={`pointer-events-auto floating-modal-enter ${
          isExpanded ? "w-full h-full" : ""
        }`}
      >
        <div
          className={`bg-[rgb(14,10,42)] text-white rounded-lg shadow-2xl border border-[rgb(172,117,240)] transition-all duration-300 ease-in-out flex flex-col ${
            isExpanded
              ? "w-full h-full max-w-none max-h-none"
              : "w-80 h-96 sm:w-96 sm:h-[500px]"
          }`}
        >
          {/* Content */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <ChatPanelContent
              messages={messages}
              onSendMessage={onSendMessage}
              onAbort={onAbort}
              isProcessing={isProcessing}
              objectid={objectid}
              onQuickAction={onQuickAction}
              onClearChat={onClearChat}
              applicationId={applicationId}
              additionalHeaderButtons={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    aria-label={
                      isExpanded ? "Collapse" : "Expand to full screen"
                    }
                  >
                    <Icon name={isExpanded ? "dock" : "undock"} size="s" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
