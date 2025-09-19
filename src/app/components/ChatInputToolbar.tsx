import React from "react";
import { FaMicrophone } from "react-icons/fa";
import { FileAttachmentUI } from "./FileAttachmentUI";
import { AttachedFile } from "../hooks/useFileAttachment";
import { AVAILABLE_MODELS, getModelLabelById } from "../lib/models";

interface ChatInputToolbarProps {
  // Core functionality
  onSendMessage: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  hasContent?: boolean;

  // File attachment
  attachedFiles: AttachedFile[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (fileId: string) => void;
  handleRemoveAllFiles: () => void;
  handleAttachFile: () => void;
  truncateFileName: (name: string, maxLength?: number) => string;

  // Model selection
  selectedModelId: string;
  onModelChange: (modelId: string) => void;

  // Mode selection (Agent/Ask)
  chatMode?: "agent" | "ask";
  onModeChange?: (mode: "agent" | "ask") => void;
  showModeSelector?: boolean;

  // Voice recording
  onRecord?: () => void;
  isRecording?: boolean;
  showRecordButton?: boolean;

  // Styling variant
  variant?: "chat" | "create-app";
}

export default function ChatInputToolbar({
  onSendMessage,
  disabled = false,
  isLoading = false,
  hasContent = false,
  attachedFiles,
  fileInputRef,
  handleFileSelect,
  handleRemoveFile,
  handleRemoveAllFiles,
  handleAttachFile,
  truncateFileName,
  selectedModelId,
  onModelChange,
  chatMode = "agent",
  onModeChange,
  showModeSelector = false,
  onRecord,
  isRecording = false,
  showRecordButton = true,
}: ChatInputToolbarProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = React.useState(false);
  const modelDropdownRef = React.useRef<HTMLDivElement>(null);
  const modeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModeDropdownOpen(false);
      }
    };

    if (isModelDropdownOpen || isModeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModelDropdownOpen, isModeDropdownOpen]);

  const isSendDisabled =
    disabled || isLoading || (!hasContent && attachedFiles.length === 0);

  return (
    <>
      {/* File attachment area */}
      <div className="px-2 pt-2">
        <FileAttachmentUI
          attachedFiles={attachedFiles}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onRemoveAllFiles={handleRemoveAllFiles}
          onAttachFile={handleAttachFile}
          truncateFileName={truncateFileName}
          disabled={disabled}
          showAttachButton={false}
          className="w-full flex-shrink-0"
        />
      </div>

      {/* Bottom buttons row */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          {/* Mode selector dropdown */}
          {showModeSelector && onModeChange && (
            <div className="relative" ref={modeDropdownRef}>
              <button
                className="chat-toolbar-btn-mode"
                disabled={disabled}
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                title={`Current mode: ${
                  chatMode === "agent" ? "Agent" : "Ask"
                }`}
              >
                <span className="text-xs font-medium">
                  {chatMode === "agent" ? "Agent" : "Ask"}
                </span>
                <svg
                  className="w-3 h-3 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isModeDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 bg-[rgb(14,10,42)] border border-gray-600 rounded-lg shadow-xl min-w-24 z-[100]">
                  <button
                    onClick={() => {
                      onModeChange("agent");
                      setIsModeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      chatMode === "agent"
                        ? "bg-gray-700 text-white"
                        : "text-white hover:bg-gray-700"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    onClick={() => {
                      onModeChange("ask");
                      setIsModeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      chatMode === "ask"
                        ? "bg-gray-700 text-white"
                        : "text-white hover:bg-gray-700"
                    }`}
                  >
                    Ask
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Model selector dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              className="chat-toolbar-btn-mode"
              disabled={disabled}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              title={`Current model: ${getModelLabelById(selectedModelId)}`}
            >
              <span className="text-xs font-medium">
                {getModelLabelById(selectedModelId)}
              </span>
              <svg
                className="w-3 h-3 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isModelDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-1 bg-[rgb(14,10,42)] border border-gray-600 rounded-lg shadow-xl min-w-32 z-[100]">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange(m.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                      selectedModelId === m.id
                        ? "bg-gray-700 text-white"
                        : "text-white hover:bg-gray-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Microphone button */}
          {showRecordButton && onRecord && (
            <button
              onClick={onRecord}
              disabled={disabled}
              className="chat-toolbar-btn"
              title={isRecording ? "Stop" : "Record"}
            >
              <FaMicrophone className="w-4 h-4" />
            </button>
          )}

          {/* Attachment button */}
          <button
            className="chat-toolbar-btn"
            disabled={disabled}
            title="Attach file"
            onClick={handleAttachFile}
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
                strokeWidth={1.5}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={onSendMessage}
          disabled={isSendDisabled}
          className="chat-toolbar-btn"
          title="Send message"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
