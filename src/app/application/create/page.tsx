"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useFileAttachment } from "../../hooks/useFileAttachment";
import ChatInputToolbar from "../../components/ChatInputToolbar";
import ChatInterface, { ChatMessage } from "../../components/ChatInterface";
import { Service } from "../../services/service";
import { buildDatabaseSystemPrompt } from "../../lib/databasePrompt";
import { registerRuleTypes } from "../../types/ruleTypeDefinitions";
import { getDefaultModelId } from "../../lib/models";

// Initialize rule types on module load
registerRuleTypes();

export default function CreateApplicationPage() {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string>("");
  const [progressDots, setProgressDots] = useState<number>(0);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    getDefaultModelId(),
  );
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdApplication, setCreatedApplication] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [creationSummary, setCreationSummary] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatModeRef = useRef<boolean>(false);

  const {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleRemoveAllFiles,
    handleAttachFile,
    truncateFileName,
    clearFiles,
  } = useFileAttachment();

  // Auto-scroll progress box to bottom whenever new progress arrives
  useEffect(() => {
    if (isCreating && creationProgress && progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [isCreating, creationProgress]);

  // Animate three dots while creating
  useEffect(() => {
    if (!isCreating) {
      setProgressDots(0);
      return;
    }
    const interval = setInterval(() => {
      setProgressDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, [isCreating]);

  // Keep assistant thinking message updated with animated dots in chat mode
  useEffect(() => {
    if (!isCreating || !showChatInterface) return;
    setChatMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (
        lastMessage &&
        lastMessage.sender === "assistant" &&
        lastMessage.isThinking &&
        !lastMessage.content.includes("successfully created") // Don't overwrite success messages
      ) {
        lastMessage.content = "Generating application";
      }
      return updated;
    });
  }, [isCreating, showChatInterface]);

  const handleSubmit = async () => {
    if (!showChatInterface) {
      // First time - show chat interface with user message
      console.log("CreateApp: first submit; switching to chat interface");
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: description,
        sender: "user",
        timestamp: new Date(),
      };
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Generating application",
        sender: "assistant",
        timestamp: new Date(),
        isThinking: true,
      };
      console.log("CreateApp: seeded assistant thinking message");
      setChatMessages([userMessage, assistantMessage]);
      chatModeRef.current = true;
      setShowChatInterface(true);
      setDescription("");
      clearFiles();

      // Start the workflow creation process
      setIsProcessing(true);
      try {
        await handleCreateWorkflow(description, attachedFiles);
      } catch (_error) {
        setIsProcessing(false);
        return;
      }
    } else {
      // Subsequent messages - handle as chat
      console.log("CreateApp: subsequent submit in chat mode");
      setIsSubmitting(true);
      chatModeRef.current = true;
      try {
        await handleCreateWorkflow(description, attachedFiles);
      } catch (_error) {
        setIsSubmitting(false);
        return;
      }
      setDescription("");
      clearFiles();
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setDescription(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (description.trim().length > 0) {
        handleSubmit();
      }
    }
  };

  const handleCreateWorkflow = async (
    description: string,
    attachedFiles?: any[],
  ) => {
    try {
      setIsCreating(true);
      setCreationProgress("Generating application");

      // Create abort controller for this request
      abortRef.current = new AbortController();

      // Add or reuse assistant message in chat mode (avoid duplicates)
      if (chatModeRef.current) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (
            lastMessage &&
            lastMessage.sender === "assistant" &&
            lastMessage.isThinking
          ) {
            // Reuse existing assistant thinking message
            lastMessage.content = "Generating application";
            return updated;
          }
          // Otherwise append a new assistant thinking message
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            content: "Generating application",
            sender: "assistant",
            timestamp: new Date(),
            isThinking: true,
          };
          return [...updated, assistantMessage];
        });
      }

      console.log("=== Creating New Application ===");
      console.log("Input:", { description });

      // Use the AI service to create the workflow
      console.log("CreateApp: calling Service.generateResponse");
      const response = await Service.generateResponse(
        `Create a new application that has the following description: ${description}. First call saveApplication with the metadata to get the application id. Then create at least two distinct workflow objects for this application, using createObject(hasWorkflow=true, applicationid=<new app id>), followed by saveFields, saveView, and saveObject to complete each workflow. Each workflow should have at least 4 stages, each with at least 3 steps including 2 steps of type "Collect information". Do not finish until at least two workflows have been created and saved. If any object was created without applicationid, finalize by calling saveApplication with objectsIds to ensure associations.`,
        buildDatabaseSystemPrompt(),
        undefined, // history
        abortRef.current.signal, // signal
        undefined, // mode
        attachedFiles, // attached files
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Failed to create workflow: ${response.status} ${errorText}`,
        );
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body available");
      }

      const decoder = new TextDecoder();
      let isComplete = false;

      // Keep the progress message simple - don't show LLM reasoning
      setCreationProgress("Generating application");

      try {
        let shouldStop = false;
        while (true) {
          // Check if request was aborted
          if (abortRef.current?.signal.aborted) {
            console.log("Request aborted by user");
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const rawPayload = line.slice(6);
              try {
                const data = JSON.parse(rawPayload);

                // Don't show LLM reasoning text to user - keep it simple
                if (data.text) {
                  // Only update chat message if in chat mode, but don't show reasoning
                  if (chatModeRef.current) {
                    setChatMessages((prev) => {
                      const updated = [...prev];
                      const lastMessage = updated[updated.length - 1];
                      if (lastMessage && lastMessage.sender === "assistant") {
                        // Keep the message simple - don't append LLM reasoning
                        lastMessage.content = "Generating application";
                      }
                      return updated;
                    });
                  }
                }

                if (data.done) {
                  isComplete = true;
                  // Stop reading the stream immediately on done to avoid UI hang
                  try {
                    await reader.cancel();
                  } catch {}
                  shouldStop = true;
                  break;
                }

                // Check for timeout or other errors in the text content
                if (data.text && data.text.includes("timeout")) {
                  throw new Error(
                    "Application creation timed out. Please try again.",
                  );
                }

                // Check for incomplete workflow warnings
                if (
                  data.text &&
                  data.text.includes("WARNING: Application creation incomplete")
                ) {
                  throw new Error(
                    "Application creation was incomplete. Please try again.",
                  );
                }

                if (data.error) {
                  console.error("Streaming error received:", data.error);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE data:", parseError);
                // Fallback: treat special markers as completion signals
                try {
                  const payload = rawPayload.trim();
                  if (
                    payload === "[[COMPLETED]]" ||
                    payload.includes("[[COMPLETED]]") ||
                    payload === '"[[COMPLETED]]"'
                  ) {
                    isComplete = true;
                    try {
                      await reader.cancel();
                    } catch {}
                    shouldStop = true;
                    break;
                  }
                } catch {}
              }
            }
          }
          if (shouldStop) break;
        }
      } finally {
        reader.releaseLock();
      }

      // Only proceed with success handling if not aborted and completed
      if (!isComplete && !abortRef.current?.signal.aborted) {
        throw new Error("Application creation did not complete properly");
      }

      // If aborted, don't proceed with success handling
      if (abortRef.current?.signal.aborted) {
        console.log("CreateApp: aborted before success handling; exiting");
        return;
      }

      // Immediately show a generic success message in chat to avoid getting stuck
      if (chatModeRef.current) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.sender === "assistant") {
            lastMessage.content =
              "✅ Your application has been successfully created. Finalizing details...";
            lastMessage.isThinking = false;
          }
          // Ensure no older assistant messages remain in thinking state
          for (let i = 0; i < updated.length - 1; i++) {
            if (updated[i].sender === "assistant" && updated[i].isThinking) {
              updated[i].isThinking = false;
            }
          }
          return updated;
        });
      }

      // Try to extract application information from the response
      // The LLM should have created an application, so we need to find it
      try {
        const appsUrl =
          "/api/database?ruleTypeId=application&orderBy=id&orderDirection=DESC&limit=1";
        const response = await fetch(appsUrl);
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            const app = result.data[0];
            setCreatedApplication({
              id: app.id,
              name: app.name || "New Application",
            });

            // Build summary of what was created (objects list)
            try {
              const objectsUrl = `/api/database?table=Objects&applicationid=${app.id}`;
              const objectsRes = await fetch(objectsUrl);
              if (objectsRes.ok) {
                const objectsData = await objectsRes.json();
                const allObjects: Array<{
                  id: number;
                  name: string;
                  hasWorkflow?: boolean;
                }> = Array.isArray(objectsData?.data) ? objectsData.data : [];
                const workflowObjects = allObjects.filter(
                  (o) => o && (o as any).hasWorkflow,
                );
                const workflowNames = workflowObjects
                  .map((o) => o.name)
                  .filter(Boolean);
                const nonWorkflowObjects = allObjects.filter(
                  (o) => !o.hasWorkflow,
                );
                const objectNames = nonWorkflowObjects
                  .map((o) => o.name)
                  .filter(Boolean);
                const summaryLines: string[] = [];
                summaryLines.push(`<h2>Summary:</h2>`);
                if (workflowNames.length > 0) {
                  summaryLines.push(
                    `- Workflows created (${
                      workflowNames.length
                    }): ${workflowNames.join(", ")}.`,
                  );
                }
                if (objectNames.length > 0) {
                  summaryLines.push(
                    `- Objects created (${
                      objectNames.length
                    }): ${objectNames.join(", ")}.`,
                  );
                }
                const summaryText = summaryLines.join("\n");
                setCreationSummary(summaryText);

                // Update chat message with success + summary if in chat mode
                if (chatModeRef.current) {
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = updated[updated.length - 1];
                    if (lastMessage && lastMessage.sender === "assistant") {
                      const successMessage = `✅ Your application "${
                        app.name || "New Application"
                      }" has been successfully created.\n\n${summaryText}`;
                      lastMessage.content = successMessage;
                      lastMessage.isThinking = false;
                      lastMessage.applicationId = app.id;
                    }
                    // Ensure no older assistant messages remain in thinking state
                    for (let i = 0; i < updated.length - 1; i++) {
                      if (
                        updated[i].sender === "assistant" &&
                        updated[i].isThinking
                      ) {
                        updated[i].isThinking = false;
                      }
                    }
                    return updated;
                  });
                }
              } else {
                setCreationSummary(null);
              }
            } catch {
              setCreationSummary(null);
            }

            // If not in chat mode, no need to update chat message here (handled by success panel)
          }
        }
      } catch (error) {
        console.warn("Could not fetch created application:", error);
      }
    } catch (error) {
      console.error("Error creating application:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create application";
      setCreationProgress("❌ " + errorMessage);

      // Update chat message with error if in chat mode
      if (showChatInterface) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage && lastMessage.sender === "assistant") {
            lastMessage.content = "❌ " + errorMessage;
            lastMessage.isThinking = false;
          }
          return updated;
        });
      }
    } finally {
      setIsCreating(false);
      setIsSubmitting(false);
      setIsProcessing(false);
      abortRef.current = null;
    }
  };

  const handleChatMessage = async (
    message: string,
    mode?: any,
    attachedFiles?: any[],
    _modelId?: string,
  ) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: "user",
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Process the message
    setIsProcessing(true);
    try {
      await handleCreateWorkflow(message, attachedFiles);
    } catch (_error) {
      setIsProcessing(false);
      return;
    }
  };

  const handleAbort = () => {
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        // ignore abort errors
      }
    }
    setIsProcessing(false);
    setIsCreating(false);
    setIsSubmitting(false);

    // Update chat message to show stopped status if in chat mode
    if (showChatInterface) {
      setChatMessages((prev) => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        if (
          lastMessage &&
          lastMessage.sender === "assistant" &&
          lastMessage.isThinking
        ) {
          lastMessage.content = "❌ Application creation stopped by user.";
          lastMessage.isThinking = false;
        }
        // Ensure no older assistant messages remain in thinking state
        for (let i = 0; i < updated.length - 1; i++) {
          if (updated[i].sender === "assistant" && updated[i].isThinking) {
            updated[i].isThinking = false;
          }
        }
        return updated;
      });
    }
  };

  // Show chat interface if user has entered description
  if (showChatInterface) {
    return (
      <ChatInterface
        onSendMessage={handleChatMessage}
        onAbort={handleAbort}
        messages={chatMessages}
        isLoading={isSubmitting}
        isProcessing={isProcessing}
        applicationId={0} // We don't have an application ID yet
        initialMessage={description}
        enableMentions={false} // Disable @mentions for create app mode
        variant="create-app" // Use create-app styling
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/Launchpad logo.svg"
            alt="Launchpad"
            width={180}
            height={26}
            className="w-[180px] h-[26px]"
          />
        </div>

        {/* Form Fields */}
        <div className="create-app-post">
          <textarea
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full flex-1 min-h-[72px] max-h-[200px] p-4 bg-transparent text-white placeholder-gray-400 text-sm leading-relaxed resize-none overflow-y-auto focus:outline-none transition-all duration-200 ease-in-out"
            placeholder="Describe the application you would like to create..."
            disabled={isSubmitting || isCreating}
          />
          <ChatInputToolbar
            onSendMessage={handleSubmit}
            disabled={isSubmitting || isCreating}
            isLoading={isSubmitting || isCreating}
            hasContent={description.trim().length > 0}
            attachedFiles={attachedFiles}
            fileInputRef={fileInputRef}
            handleFileSelect={handleFileSelect}
            handleRemoveFile={handleRemoveFile}
            handleRemoveAllFiles={handleRemoveAllFiles}
            handleAttachFile={handleAttachFile}
            truncateFileName={truncateFileName}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            showRecordButton={true}
          />
        </div>
      </div>
      {/* Progress Display */}
      {isCreating && creationProgress && (
        <div className="bg-[rgb(14,10,42)] border border-blue-200 rounded-md p-4 mb-4 max-w-md">
          <div className="flex items-center mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
            <span className="text-sm font-medium text-white">
              {creationProgress}
            </span>
          </div>
        </div>
      )}

      {/* Success Display */}
      {createdApplication && !isCreating && (
        <div className="bg-[rgb(14,10,42)] border border-green-200 rounded-md p-4 mb-4 max-w-md">
          <div className="text-sm text-white mb-3">
            ✅ Your application "{createdApplication.name}" has been
            successfully created.
          </div>
          {creationSummary && (
            <div
              className="text-sm text-white mb-3 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: creationSummary }}
            />
          )}
          <button
            onClick={() =>
              (window.location.href = `/application/${createdApplication.id}`)
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Open Application
          </button>
        </div>
      )}
    </div>
  );
}
