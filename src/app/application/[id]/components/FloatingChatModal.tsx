"use client";

import { useState } from "react";
import { ChatMessage } from "../../../components/ChatInterface";
import ChatPanelContent from "./ChatPanelContent";
import type { ChatMode } from "../../../types/types";

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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {isExpanded ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      )}
                    </svg>
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
