import React, { useState, useEffect, useRef } from "react";
import { FaUndo, FaCheck, FaClock, FaStop, FaMicrophone } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { composeQuickChatMessage } from "../application/[id]/utils/composeQuickChatMessage";
import type { ChatMode } from "../types/types";
import StandardModal from "./StandardModal";

// Global cache for objects to avoid refetching
const objectsCache = new Map<
  string,
  Array<{
    id: number;
    name: string;
    description: string;
    hasWorkflow: boolean;
    isEmbedded: boolean;
  }>
>();

// Inline Object Selector Popup Component
interface ObjectSelectorPopupProps {
  onClose: () => void;
  onSelect: (object: {
    id: number;
    name: string;
    description: string;
    hasWorkflow: boolean;
    isEmbedded: boolean;
  }) => void;
  applicationId?: number;
  filterText?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const ObjectSelectorPopup: React.FC<ObjectSelectorPopupProps> = ({
  onClose,
  onSelect,
  applicationId,
  filterText = "",
  onKeyDown,
}) => {
  const [objects, setObjects] = useState<
    Array<{
      id: number;
      name: string;
      description: string;
      hasWorkflow: boolean;
      isEmbedded: boolean;
    }>
  >([]);
  const [filteredObjects, setFilteredObjects] = useState<
    Array<{
      id: number;
      name: string;
      description: string;
      hasWorkflow: boolean;
      isEmbedded: boolean;
    }>
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchObjects = async () => {
      const cacheKey = `objects_${applicationId || "default"}`;

      // Check cache first
      if (objectsCache.has(cacheKey)) {
        const cachedObjects = objectsCache.get(cacheKey)!;
        setObjects(cachedObjects);
        setFilteredObjects(cachedObjects.slice(0, 5));
        return;
      }

      setLoading(true);
      try {
        // Use the standard query
        let url = "/api/database?table=Objects";
        if (applicationId) {
          url += `&applicationid=${applicationId}`;
        }

        const response = await fetch(url);

        if (response.ok) {
          const result = await response.json();
          const fetchedObjects = result.data || [];

          // Cache the results
          objectsCache.set(cacheKey, fetchedObjects);

          setObjects(fetchedObjects);
          setFilteredObjects(fetchedObjects.slice(0, 5)); // Limit to 5 items for compact display
        }
      } catch (error) {
        console.error("Error fetching objects:", error);
        setObjects([]);
        setFilteredObjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchObjects();
  }, [applicationId]);

  // Filter objects based on filterText
  useEffect(() => {
    if (!filterText.trim()) {
      setFilteredObjects(objects.slice(0, 5));
    } else {
      const filtered = objects.filter((obj) =>
        obj.name.toLowerCase().includes(filterText.toLowerCase()),
      );
      setFilteredObjects(filtered.slice(0, 5));
    }
    setSelectedIndex(0);
  }, [filterText, objects]);

  const handleSelect = (object: {
    id: number;
    name: string;
    description: string;
    hasWorkflow: boolean;
    isEmbedded: boolean;
  }) => {
    onSelect(object);
    onClose();
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredObjects.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredObjects.length - 1,
        );
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (filteredObjects[selectedIndex]) {
          handleSelect(filteredObjects[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Global key handling so the popup works while focus stays in the textarea
  useEffect(() => {
    const keyListener = (ev: KeyboardEvent) => {
      if (
        ev.key === "ArrowDown" ||
        ev.key === "ArrowUp" ||
        ev.key === "Enter" ||
        ev.key === "Tab" ||
        ev.key === "Escape"
      ) {
        handleKeyDown({
          key: ev.key,
          preventDefault: () => ev.preventDefault(),
        });
      }
    };
    window.addEventListener("keydown", keyListener);
    return () => window.removeEventListener("keydown", keyListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredObjects, selectedIndex]);

  if (loading) {
    return (
      <div className="p-2 text-[10px] text-white text-center">Loading...</div>
    );
  }

  return (
    <div onKeyDown={onKeyDown ?? ((e) => handleKeyDown(e as any))} tabIndex={0}>
      {filteredObjects.map((object, index) => (
        <button
          key={object.id}
          onClick={() => handleSelect(object)}
          className={`w-full px-2 py-1 text-left transition-colors text-[10px] ${
            index === selectedIndex ? "bg-gray-700" : "hover:bg-gray-700"
          }`}
        >
          <div className="text-white truncate">{object.name}</div>
        </button>
      ))}
      {filteredObjects.length === 0 && (
        <div className="p-2 text-[10px] text-white text-center">
          No objects found
        </div>
      )}
    </div>
  );
};

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
  onSendMessage: (
    message: string,
    mode?: ChatMode,
    attachedFile?: {
      file: File;
      name: string;
      content: string;
      type: "text" | "image" | "pdf";
      base64?: string;
    },
  ) => void;
  onAbort?: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  isProcessing: boolean;
  objectid?: number;
  applicationId?: number;
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
  applicationId,
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
  const [isObjectSelectorOpen, setIsObjectSelectorOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [filterText, setFilterText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("agent");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    content: string;
    type: "text" | "image" | "pdf";
    base64?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle click outside popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsObjectSelectorOpen(false);
      }
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModeDropdownOpen(false);
      }
    };

    if (isObjectSelectorOpen || isModeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isObjectSelectorOpen, isModeDropdownOpen]);

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

  const getFileType = (
    fileName: string,
    mimeType: string,
  ): "text" | "image" | "pdf" => {
    const extension = fileName.toLowerCase().split(".").pop();

    if (extension === "pdf" || mimeType === "application/pdf") {
      return "pdf";
    }

    if (
      ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(
        extension || "",
      ) ||
      mimeType.startsWith("image/")
    ) {
      return "image";
    }

    return "text";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file.name, file.type);

    if (fileType === "image") {
      // Handle images - convert to base64 for now
      // TODO: Consider implementing image URL upload for better efficiency
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachedFile({
          file,
          name: file.name,
          content: `[Image: ${file.name}]`,
          type: "image",
          base64,
        });
      };
      reader.readAsDataURL(file);
    } else if (fileType === "pdf") {
      // For PDFs, we'll upload directly to OpenAI Files API
      setAttachedFile({
        file,
        name: file.name,
        content: `[PDF: ${file.name}]`,
        type: "pdf",
      });
    } else {
      // Handle text files
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachedFile({
          file,
          name: file.name,
          content,
          type: "text",
        });
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const truncateFileName = (
    fileName: string,
    maxLength: number = 10,
  ): string => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split(".").pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
    const truncatedName = nameWithoutExt.substring(
      0,
      maxLength - (extension ? extension.length + 1 : 0),
    );
    return extension
      ? `${truncatedName}...${extension}`
      : `${truncatedName}...`;
  };

  const handleSendMessage = () => {
    const raw = message.trim();
    if (raw || attachedFile) {
      let outgoing = raw;
      try {
        const cacheKey = `objects_${applicationId || "default"}`;
        const candidates = objectsCache.get(cacheKey) || [];
        const matched = candidates.find((obj) =>
          outgoing.includes(`@${obj.name}`),
        );
        if (matched) {
          const cleanedInstruction = outgoing
            .replaceAll(`@${matched.name}`, "")
            .replace(/\s+/g, " ")
            .trim();
          outgoing = composeQuickChatMessage({
            quickChatText: cleanedInstruction,
            selectedFieldIds: [],
            selectedViewIds: [],
            selectedStageIds: [],
            selectedProcessIds: [],
            selectedStepIds: [],
            fields: [],
            views: [],
            stages: [],
            selectedObjectId: matched.id,
            isDataObjectView: !matched.hasWorkflow,
          });
        }
      } catch {}

      // Include file content if attached
      if (attachedFile) {
        if (attachedFile.type === "image") {
          // For images, we'll send the base64 data separately
          // The content will be handled by the LLM API route
          outgoing = outgoing
            ? `${outgoing}\n\n[Image attached: ${attachedFile.name}]`
            : `[Image attached: ${attachedFile.name}]`;
        } else if (attachedFile.type === "pdf") {
          // For PDFs, we'll upload directly to OpenAI Files API
          outgoing = outgoing
            ? `${outgoing}\n\n[PDF attached: ${attachedFile.name}]`
            : `[PDF attached: ${attachedFile.name}]`;
        } else {
          // For text files, include the content
          outgoing = outgoing
            ? `${outgoing}\n\n--- File: ${attachedFile.name} ---\n${attachedFile.content}`
            : `--- File: ${attachedFile.name} ---\n${attachedFile.content}`;
        }
      }

      // Pass the chat mode and attached file along with the message
      onSendMessage(outgoing, chatMode, attachedFile || undefined);
      setMessage("");
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isObjectSelectorOpen) {
      // Handle popup navigation
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp":
        case "Enter":
        case "Tab":
        case "Escape":
          e.preventDefault();
          // Let the popup handle these keys
          break;
        default:
          // Allow normal typing
          break;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCursorPosition = (
    textarea: HTMLTextAreaElement,
    cursorPos: number,
    textValue: string,
  ) => {
    // Caret-based positioning using a hidden mirror element
    const style = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    // Copy relevant styles for accurate measurement
    const props = [
      "boxSizing",
      "width",
      "fontSize",
      "fontFamily",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "textTransform",
      "borderLeftWidth",
      "borderRightWidth",
      "borderTopWidth",
      "borderBottomWidth",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "paddingBottom",
      "lineHeight",
    ];
    props.forEach((p) => {
      // @ts-expect-error dynamic style index
      mirror.style[p] = style[p as any];
    });
    mirror.style.width = style.width;

    const before = textValue.substring(0, cursorPos);
    const after = textValue.substring(cursorPos);
    mirror.textContent = before;
    const caret = document.createElement("span");
    caret.textContent = after.length > 0 ? after[0] : "\u200b";
    mirror.appendChild(caret);
    document.body.appendChild(mirror);

    const textRect = textarea.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const caretRect = caret.getBoundingClientRect();
    document.body.removeChild(mirror);

    let x = textRect.left + (caretRect.left - mirrorRect.left);
    let y = textRect.top + (caretRect.top - mirrorRect.top) + 22; // below line

    // Clamp to viewport
    const pad = 8;
    x = Math.max(pad, Math.min(x, window.innerWidth - pad));
    y = Math.max(pad, Math.min(y, window.innerHeight - pad));

    return { x, y };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    setMessage(newValue);

    // Check if @ was just typed at the cursor position
    if (newValue[cursorPos - 1] === "@") {
      setCursorPosition(cursorPos);
      setFilterText("");

      // Calculate popup position
      const position = getCursorPosition(e.target, cursorPos, newValue);
      setPopupPosition(position);

      // Open object selector modal after a short delay
      setTimeout(() => {
        setIsObjectSelectorOpen(true);
      }, 10);
    } else if (isObjectSelectorOpen) {
      // Update filter text if popup is open
      const textAfterAt = newValue.substring(cursorPosition);
      const spaceIndex = textAfterAt.indexOf(" ");
      const filter =
        spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);
      setFilterText(filter);
      // Reposition popup as caret moves
      const position = getCursorPosition(e.target, cursorPos, newValue);
      setPopupPosition(position);
    }
  };

  const handleObjectSelect = (object: {
    id: number;
    name: string;
    description: string;
    hasWorkflow: boolean;
    isEmbedded: boolean;
  }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    // Slice message into: text before '@', the filter after '@', and the rest
    const atStartIndex = Math.max(0, cursorPosition - 1);
    const beforeAt = message.substring(0, atStartIndex);
    const textAfterAt = message.substring(cursorPosition);
    // Determine end of typed filter (until first space or delimiter)
    const delimiterMatch = textAfterAt.match(/[\s.,:;!?/\\()\[\]{}]/);
    const endOfFilterIndex = delimiterMatch
      ? delimiterMatch.index || 0
      : textAfterAt.length;
    const afterFilterRemainder = textAfterAt.substring(endOfFilterIndex);

    // Insert the selected object mention, replacing the filter
    const objectReference = `@${object.name}`;
    const newMessage = beforeAt + objectReference + afterFilterRemainder;

    setMessage(newMessage);
    setIsObjectSelectorOpen(false);
    setFilterText("");

    // Set cursor position after the inserted object reference
    const newCursorPosition = beforeAt.length + objectReference.length;

    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
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
      return <h3 className="mb-1 mt-2">{children}</h3>;
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
      <div className="flex-1 chat-panel-content p-3 space-y-3 text-sm min-h-0">
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

      {/* File attachment toolbar */}
      {attachedFile && (
        <div className="w-full border-t border-gray-400 bg-[rgb(14,10,42)] px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {attachedFile.type === "image" ? (
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ) : attachedFile.type === "pdf" ? (
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-400"
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
              )}
              <span
                className="text-sm text-white truncate max-w-[200px]"
                title={attachedFile.name}
              >
                {truncateFileName(attachedFile.name)}
              </span>
            </div>
            <button
              onClick={handleRemoveFile}
              className="btn-secondary w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-600 transition-colors"
              title="Remove file"
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
        </div>
      )}

      {/* Message input */}
      <div className="w-full border-t border-gray-400 bg-[rgb(14,10,42)] rounded-b-lg flex-shrink-0">
        <div className="flex flex-col">
          {/* Text area - full width with 3 lines */}
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={3}
              className="w-full min-h-[72px] max-h-[200px] p-4 bg-transparent text-white placeholder-gray-400 text-sm leading-relaxed resize-none overflow-y-auto focus:outline-none transition-all duration-200 ease-in-out"
              disabled={isLoading || isProcessing}
            />
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.sql,.xml,.yaml,.yml,.html,.css,.scss,.sass,.less,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg"
            />
          </div>

          {/* Bottom buttons row */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-3">
              {/* Mode selector dropdown */}
              <div className="relative" ref={modeDropdownRef}>
                <button
                  className="chat-toolbar-btn-mode"
                  disabled={isLoading || isProcessing}
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
                        setChatMode("agent");
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
                        setChatMode("ask");
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
                className="chat-toolbar-btn"
                title={
                  recognition
                    ? isRecording
                      ? "Stop"
                      : "Record"
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
                className="chat-toolbar-btn"
                disabled={isLoading || isProcessing}
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
            {isProcessing ? (
              <button
                onClick={() => onAbort?.()}
                className="chat-toolbar-btn-stop"
                title="Stop"
              >
                <FaStop className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!message.trim() && !attachedFile)}
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
            )}
          </div>
        </div>
      </div>
      <StandardModal
        isOpen={isRecordModalOpen}
        onCloseAction={closeRecordModal}
        title="Voice Input Settings"
        width="w-full max-w-md"
        actions={[
          {
            id: "cancel",
            label: "Cancel",
            type: "secondary" as const,
            onClick: closeRecordModal,
          },
          {
            id: "record",
            label: disableRecord ? "Recording…" : "Record",
            type: "primary" as const,
            onClick: () => {
              try {
                localStorage.setItem("voice.lang", selectedLang);
                if (audioOutputDevice) {
                  localStorage.setItem(
                    "voice.audioOutputDeviceId",
                    audioOutputDevice.deviceId,
                  );
                  setPreferredOutputDeviceId(audioOutputDevice.deviceId);
                }
                localStorage.setItem("voice.configured", "true");
              } catch {}
              setHasVoiceConfig(true);
              closeRecordModal();
              startRecording();
            },
            disabled: disableRecord || !recognition,
            loading: disableRecord,
          },
        ]}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white mb-2">Language</label>
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
                audioOutputDevice?.deviceId || preferredOutputDeviceId || ""
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
      </StandardModal>

      {/* Inline Object Selector Popup */}
      {isObjectSelectorOpen && (
        <div
          ref={popupRef}
          className="fixed z-[100] bg-[rgb(14,10,42)] border border-gray-600 rounded-lg shadow-xl max-h-32 overflow-y-auto min-w-40"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
          }}
        >
          <ObjectSelectorPopup
            onClose={() => setIsObjectSelectorOpen(false)}
            onSelect={handleObjectSelect}
            applicationId={applicationId}
            filterText={filterText}
          />
        </div>
      )}
    </div>
  );
}
