import React, { useState, useEffect, useRef } from "react";
import { FaUndo, FaCheck, FaClock, FaStop, FaMicrophone } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// Blinking cursor component
const BlinkingCursor = () => (
  <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-1"></span>
);

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isThinking?: boolean; // Add flag to indicate if the message is actively being updated
  // Total time taken by the assistant to complete the response, in milliseconds
  durationMs?: number;
  // Approximate number of prompt tokens sent to the LLM for this response
  tokenCount?: number;
  tokenExact?: boolean;
}

interface CheckpointSession {
  id: string;
  description: string;
  startedAt: string;
}

interface CheckpointStatus {
  activeSession?: CheckpointSession;
  activeCheckpoints: Array<{
    id: string;
    description: string;
    created_at: Date;
    source?: string;
    toolName?: string;
  }>;
  summary: {
    total: number;
    mcp: number;
    llm: number;
  };
}

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  onAbort?: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isProcessing: boolean;
  objectid?: number;
}

// Function to format content based on its type
function normalizeMarkdown(original: string): string {
  let content = original;
  // Hide completion control markers from user display
  content = content.replace(/^\s*\[\[COMPLETED\]\]\s*\n?/i, "");
  // Also remove any inline occurrences of the marker while preserving line breaks
  content = content.replace(/[ \t]*\[\[COMPLETED\]\][ \t]*/gi, "");
  // Normalize line endings to \n
  content = content.replace(/\r\n?/g, "\n");
  // Normalize headings and colon/bullet variants in one pass
  // Matches line starts like: "Analyze", "Reasoning", "Plan", "Next Action"
  // with optional leading bullet and optional trailing colon
  // Remove any empty heading lines like "#" or "##" with no text
  content = content.replace(/(^|\n)\s*#{1,6}\s*(?=\n|$)/g, "$1");
  // Ensure headings start at the beginning of a line with a blank line before
  content = content.replace(/([^\n])\s*(#{1,6})\s+/g, (match, prev, hashes) => {
    return `${prev}\n\n${hashes} `;
  });

  // Ensure unordered list markers start on a new line
  content = content.replace(/([^\n])\s*([\-*+]\s+)/g, (match, prev, marker) => {
    return `${prev}\n${marker}`;
  });

  // Ensure ordered list markers like "1. " start on a new line
  content = content.replace(/([^\n])\s*(\d+\.\s+)/g, (match, prev, marker) => {
    return `${prev}\n${marker}`;
  });

  // Add missing space after unordered list markers at line start: "*Item" -> "* Item"
  content = content.replace(
    /(^|\n)([\-*+])(?!\s|[\-*+])/g,
    (match, start, marker) => {
      return `${start}${marker} `;
    },
  );

  // Add missing space after ordered list markers at line start: "1.Item" -> "1. Item"
  content = content.replace(/(^|\n)(\d+\.)(?!\s)/g, (match, start, marker) => {
    return `${start}${marker} `;
  });

  // Normalize multiple consecutive spaces after list markers
  content = content.replace(
    /(^|\n)([\-*+]\s{2,})/g,
    (match, start) => `${start}* `,
  );

  // Ensure a blank line between paragraphs when headings or lists follow text immediately
  content = content.replace(
    /([\S])\n(#{1,6}|[\-*+]\s|\d+\.\s)/g,
    (m, prev, next) => {
      return `${prev}\n\n${next}`;
    },
  );

  // No special newline handling for completion phrase; rely on [[COMPLETED]] marker format

  return content;
}

function formatContent(content: string): string {
  // Check if content is JSON
  try {
    const parsed = JSON.parse(content);
    // If it's a valid JSON object, format it as a code block
    return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
  } catch {
    // If it's not JSON, return as is (will be rendered as markdown)
    return normalizeMarkdown(content);
  }
}

// Function to check if content should be filtered out
function shouldFilterContent(content: string): boolean {
  // Filter out empty or whitespace-only content
  if (!content.trim()) {
    return true;
  }

  return false;
}

// Format duration into a human-friendly string per requirements
// - >= 60s: show minutes and seconds (e.g., 1m30s)
// - 10s..59.999s: show seconds only (rounded to nearest second)
// - 1s..9.999s: show seconds and milliseconds (e.g., 8s340ms)
// - < 1s: show milliseconds only (e.g., 450ms)
function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const totalMs = Math.round(durationMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const ms = totalMs % 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 1) {
    return `${minutes}m ${seconds}s`;
  }
  if (totalSeconds >= 10) {
    return `${totalSeconds}s`;
  }
  if (totalSeconds >= 1) {
    return `${totalSeconds}s ${ms}ms`;
  }
  return `${ms}ms`;
}

export default function ChatInterface({
  onSendMessage,
  onAbort,
  messages,
  isLoading,
  isProcessing,
  objectid,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [checkpointStatus, setCheckpointStatus] =
    useState<CheckpointStatus | null>(null);
  const [_isCheckpointLoading, setIsCheckpointLoading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>(
    typeof navigator !== "undefined" && (navigator as any).language
      ? (navigator as any).language
      : "en-US",
  );
  const [recognition, setRecognition] = useState<any | null>(null);
  const [disableRecord, setDisableRecord] = useState(false);
  const [recordedValue, setRecordedValue] = useState<string>("");
  const [audioOutputDevice, setAudioOutputDevice] =
    useState<MediaDeviceInfo | null>(null);
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [preferredOutputDeviceId, setPreferredOutputDeviceId] = useState<
    string | null
  >(null);
  const [hasVoiceConfig, setHasVoiceConfig] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150,
      )}px`;
    }
  }, [message]);

  // Load checkpoint status on component mount
  useEffect(() => {
    fetchCheckpointStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load saved voice config on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("voice.lang");
      if (savedLang) setSelectedLang(savedLang);
      const savedDevId = localStorage.getItem("voice.audioOutputDeviceId");
      if (savedDevId) setPreferredOutputDeviceId(savedDevId);
      setHasVoiceConfig(localStorage.getItem("voice.configured") === "true");
    } catch {}
  }, []);

  // Initialize webkitSpeechRecognition / SpeechRecognition
  useEffect(() => {
    const W: any = typeof window !== "undefined" ? window : {};
    const SR = W.webkitSpeechRecognition || W.SpeechRecognition;
    if (!SR) return;
    const tmpRecognition = new SR();
    tmpRecognition.interimResults = false;
    tmpRecognition.continuous = false;
    tmpRecognition.onresult = (event: any) => {
      const lastIndex = event.results?.length ? event.results.length - 1 : 0;
      const result = event.results?.[lastIndex]?.[0]?.transcript;
      if (!result || String(result).trim() === "") return;
      setRecordedValue(result);
    };
    tmpRecognition.onend = () => {
      setDisableRecord(false);
      setIsRecording(false);
    };
    tmpRecognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event?.error);
      setDisableRecord(false);
    };
    tmpRecognition.onnomatch = () => {};
    setRecognition(tmpRecognition);
    return () => {
      try {
        tmpRecognition.stop();
      } catch {}
    };
  }, []);

  // When we have a recorded value, populate the textarea (do not auto-send)
  useEffect(() => {
    if (!recordedValue || recordedValue.trim() === "") return;
    setMessage(recordedValue);
  }, [recordedValue]);

  const startRecording = () => {
    if (!recognition) return;
    try {
      setDisableRecord(true);
      setIsRecording(true);
      recognition.lang = selectedLang;
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setDisableRecord(false);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      recognition?.stop();
    } catch {}
  };

  const _openRecordModal = () => {
    setIsRecordModalOpen(true);
  };

  const closeRecordModal = () => {
    setIsRecordModalOpen(false);
  };

  const _handleChooseAudioOutput = async () => {
    try {
      const md: any = (navigator as any).mediaDevices;
      if (!md || !md.selectAudioOutput) {
        console.warn("selectAudioOutput() not supported in this browser.");
        return;
      }
      const device: MediaDeviceInfo = await md.selectAudioOutput();
      setAudioOutputDevice(device);
      setPreferredOutputDeviceId(device.deviceId);
      try {
        localStorage.setItem("voice.audioOutputDeviceId", device.deviceId);
      } catch {}
      if (audioRef.current && (audioRef.current as any).setSinkId) {
        try {
          await (audioRef.current as any).setSinkId(device.deviceId);
        } catch (err) {
          console.warn("Failed to set sinkId on audio element", err);
        }
      }
      await refreshOutputDevices();
    } catch (err) {
      console.error("Error selecting audio output:", err);
    }
  };

  const refreshOutputDevices = async () => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      setAudioOutputDevices(outputs);
      if (audioOutputDevice) {
        const stillExists = outputs.find(
          (d) => d.deviceId === audioOutputDevice.deviceId,
        );
        if (!stillExists) setAudioOutputDevice(outputs[0] || null);
      } else if (outputs.length > 0) {
        setAudioOutputDevice(outputs[0]);
      }
    } catch (e) {
      console.warn("Could not enumerate devices", e);
    }
  };

  useEffect(() => {
    if (isRecordModalOpen) {
      void refreshOutputDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecordModalOpen]);

  useEffect(() => {
    const md = navigator?.mediaDevices;
    if (!md) return;
    const handler = () => void refreshOutputDevices();
    md.addEventListener?.("devicechange", handler);
    return () => {
      md.removeEventListener?.("devicechange", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCheckpointStatus = async () => {
    try {
      const url = objectid
        ? `/api/checkpoint?objectid=${objectid}`
        : "/api/checkpoint";
      const response = await fetch(url);
      const data = await response.json();
      if (data.activeSession) {
        setCheckpointStatus(data);
      }
      // Log checkpoint summary for debugging
      if (data.summary && data.summary.total > 0) {
        console.log(
          `Active checkpoints: ${data.summary.total} (${data.summary.llm} LLM, ${data.summary.mcp} MCP)`,
        );
      }
    } catch (error) {
      console.error("Failed to fetch checkpoint status:", error);
    }
  };

  const rollbackCheckpoint = async () => {
    if (!checkpointStatus?.activeSession) return;

    setIsCheckpointLoading(true);
    try {
      const response = await fetch("/api/checkpoint?action=rollback", {
        method: "POST",
      });

      if (response.ok) {
        setCheckpointStatus(null);
        // Optionally refresh the page or reload data
        window.location.reload();
      } else {
        console.error("Failed to rollback checkpoint");
      }
    } catch (error) {
      console.error("Error rolling back checkpoint:", error);
    } finally {
      setIsCheckpointLoading(false);
    }
  };

  const commitCheckpoint = async () => {
    if (!checkpointStatus?.activeSession) return;

    setIsCheckpointLoading(true);
    try {
      const response = await fetch("/api/checkpoint?action=commit", {
        method: "POST",
      });

      if (response.ok) {
        setCheckpointStatus(null);
      } else {
        console.error("Failed to commit checkpoint");
      }
    } catch (error) {
      console.error("Error committing checkpoint:", error);
    } finally {
      setIsCheckpointLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const markdownComponents: Components = {
    p({ children }) {
      return <p style={{ wordBreak: "break-word" }}>{children}</p>;
    },
    h1({ children }) {
      const text = String(React.Children.toArray(children).join(" ")).trim();
      if (!text) return null;
      return (
        <h2 className="text-lg md:text-lg font-bold text-white mb-1 mt-2">
          {children}
        </h2>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-lg md:text-lg font-bold text-white mb-1 mt-2">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-lg md:text-xl font-bold text-white mb-1 mt-2">
          {children}
        </h3>
      );
    },
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      return isInline ? (
        <code
          className="font-bold px-1 py-0.5 rounded text-sm font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </code>
      ) : (
        <pre
          className="font-bold p-2 rounded text-sm overflow-x-auto font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          <code
            className={className}
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            {children}
          </code>
        </pre>
      );
    },
    em({ children }) {
      return (
        <em
          className="italic font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </em>
      );
    },
    strong({ children }) {
      return (
        <strong
          className="font-bold font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </strong>
      );
    },
    pre({ children }) {
      return (
        <pre
          className="font-bold p-2 rounded text-sm overflow-x-auto font-sans"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {children}
        </pre>
      );
    },
  };

  const filteredMessages = messages.filter(
    (msg) => !shouldFilterContent(msg.content),
  );

  return (
    <div className="flex flex-col h-full min-w-0 min-h-0">
      {/* Checkpoint Status Bar */}
      {checkpointStatus?.activeSession && (
        <div className="bg-blue-50 dark:bg-blue-900 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaClock className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Active Session: {checkpointStatus.activeSession.description}
                </span>
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  Started{" "}
                  {new Date(
                    checkpointStatus.activeSession.startedAt,
                  ).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={rollbackCheckpoint}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-md"
              >
                <FaUndo className="w-3 h-3" />
                <span>Rollback</span>
              </button>
              <button
                onClick={commitCheckpoint}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-md"
              >
                <FaCheck className="w-3 h-3" />
                <span>Commit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm min-h-0">
        {filteredMessages.map((msg, idx) => {
          const isLast = idx === filteredMessages.length - 1;
          const isAssistant = msg.sender !== "user";
          const baseBubbleClasses = isAssistant
            ? "llm-response-bubble"
            : "user-message-bubble";
          const bubbleRadiusClasses = isAssistant ? "" : "";

          return (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                {isAssistant && (
                  <>
                    <div
                      className={`p-2 text-sm ${bubbleRadiusClasses} ${baseBubbleClasses}`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none font-sans text-white"
                          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={markdownComponents}
                          >
                            {formatContent(msg.content)}
                          </ReactMarkdown>
                          {msg.isThinking && <BlinkingCursor />}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {!isAssistant && (
                  <>
                    <div
                      className={`p-2 text-sm ${bubbleRadiusClasses} ${baseBubbleClasses}`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none font-sans text-white"
                          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={markdownComponents}
                          >
                            {formatContent(msg.content)}
                          </ReactMarkdown>
                          {msg.isThinking && <BlinkingCursor />}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* In-bubble status and controls, matching screenshot style */}
                {isAssistant && msg.isThinking && isLast && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Generating your response…</span>
                    </div>
                    {onAbort && (
                      <button
                        onClick={() => onAbort?.()}
                        className="px-3 py-1.5 text-xs rounded-full bg-white/20 text-white hover:bg-white/30 border border-white/30"
                      >
                        Stop generating
                      </button>
                    )}
                  </div>
                )}
                {/* Timestamp outside the bubble */}
                <div
                  className={`text-xs mt-1.5 ${
                    msg.sender === "user"
                      ? "text-white dark:text-white text-right"
                      : "text-white dark:text-white text-left"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString()}
                  {!msg.isThinking && typeof msg.durationMs === "number" && (
                    <span className="ml-2">
                      • {formatDuration(msg.durationMs)}
                    </span>
                  )}
                  {typeof msg.tokenCount === "number" && (
                    <span className="ml-2">
                      • {msg.tokenExact ? "" : "~"}
                      {msg.tokenCount} tokens
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="w-full border-t border-gray-400 bg-[rgb(14,10,42)] rounded-b-lg flex-shrink-0">
        <div className="flex flex-col">
          {/* Text area - full width with 3 lines */}
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={3}
              className="w-full min-h-[72px] max-h-[200px] p-4 bg-transparent text-white placeholder-gray-400 text-sm leading-relaxed resize-none overflow-y-auto focus:outline-none transition-all duration-200 ease-in-out"
              disabled={isLoading || isProcessing}
            />
          </div>

          {/* Bottom buttons row */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-3">
              {/* Emoji/Options button */}
              <button
                className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 focus:text-gray-300 active:text-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[rgb(14,10,42)] rounded"
                disabled={isLoading || isProcessing}
                title="Add emoji or options"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>

              {/* Microphone button */}
              <button
                onClick={() => {
                  if (!recognition) return;
                  // First time, open config modal
                  if (!hasVoiceConfig) {
                    setIsRecordModalOpen(true);
                    return;
                  }
                  // Toggle record/stop
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                disabled={isLoading || isProcessing || !recognition}
                className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 focus:text-gray-300 active:text-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[rgb(14,10,42)] rounded"
                title={
                  recognition
                    ? isRecording
                      ? "Stop recording"
                      : "Start recording"
                    : "Speech recognition not supported"
                }
              >
                {isRecording ? (
                  <FaStop className="w-4 h-4" />
                ) : (
                  <FaMicrophone className="w-4 h-4" />
                )}
              </button>

              {/* Attachment button */}
              <button
                className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 focus:text-gray-300 active:text-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[rgb(14,10,42)] rounded"
                disabled={isLoading || isProcessing}
                title="Attach file"
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
            {isProcessing ? (
              <button
                onClick={() => onAbort?.()}
                className="flex items-center justify-center w-8 h-8 text-red-400 hover:text-red-300 focus:text-red-300 active:text-red-500 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[rgb(14,10,42)] rounded"
                title="Stop"
              >
                <FaStop className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 focus:text-gray-300 active:text-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[rgb(14,10,42)] rounded"
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
            )}
          </div>
        </div>
      </div>
      {isRecordModalOpen && (
        <div className="absolute inset-0 modal-backdrop flex items-center justify-center z-[80] modal-overlay p-4">
          <div
            className="rounded-lg shadow-xl w-full max-w-md z-[90] bg-[rgb(14,10,42)] text-white min-w-[450px]"
            role="dialog"
          >
            <div className="p-6">
              <div className="lp-modal-header">
                <h2 className="text-lg font-semibold text-white">
                  Voice Input Settings
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeRecordModal}
                    className="btn-secondary px-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem("voice.lang", selectedLang);
                        if (audioOutputDevice) {
                          localStorage.setItem(
                            "voice.audioOutputDeviceId",
                            audioOutputDevice.deviceId,
                          );
                          setPreferredOutputDeviceId(
                            audioOutputDevice.deviceId,
                          );
                        }
                        localStorage.setItem("voice.configured", "true");
                      } catch {}
                      setHasVoiceConfig(true);
                      closeRecordModal();
                      startRecording();
                    }}
                    disabled={disableRecord || !recognition}
                    className="interactive-button px-3 flex items-center gap-2"
                  >
                    {disableRecord && (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    )}
                    {disableRecord ? "Recording…" : "Start Recording"}
                  </button>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Language
                  </label>
                  <select
                    className="lp-input w-full"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Español (ES)</option>
                    <option value="fr-FR">Français (FR)</option>
                    <option value="de-DE">Deutsch (DE)</option>
                    <option value="pt-BR">Português (BR)</option>
                    <option value="it-IT">Italiano (IT)</option>
                    <option value="ja-JP">日本語 (JP)</option>
                    <option value="ko-KR">한국어 (KR)</option>
                    <option value="zh-CN">中文 (简体)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white mb-2">
                    Audio Output Device
                  </label>
                  <select
                    className="lp-input w-full"
                    value={
                      audioOutputDevice?.deviceId ||
                      preferredOutputDeviceId ||
                      ""
                    }
                    onChange={async (e) => {
                      const selected = audioOutputDevices.find(
                        (d) => d.deviceId === e.target.value,
                      );
                      setAudioOutputDevice(selected || null);
                      setPreferredOutputDeviceId(selected?.deviceId || null);
                      try {
                        if (selected?.deviceId) {
                          localStorage.setItem(
                            "voice.audioOutputDeviceId",
                            selected.deviceId,
                          );
                        }
                      } catch {}
                      if (
                        selected &&
                        audioRef.current &&
                        (audioRef.current as any).setSinkId
                      ) {
                        try {
                          await (audioRef.current as any).setSinkId(
                            selected.deviceId,
                          );
                        } catch (err) {
                          console.warn("Failed to set sinkId", err);
                        }
                      }
                    }}
                  >
                    <option value="" disabled>
                      {audioOutputDevices.length > 0
                        ? "Choose device"
                        : "No outputs found"}
                    </option>
                    {audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId}
                      </option>
                    ))}
                  </select>
                  <audio ref={audioRef} className="hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
