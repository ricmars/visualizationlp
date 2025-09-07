import { useEffect, useRef, useState } from "react";
import { LLMResponseDisplay } from "./LLMResponseDisplay";
import StandardModal from "./StandardModal";
import { useFileAttachment } from "../hooks/useFileAttachment";
import { FileAttachmentUI } from "./FileAttachmentUI";

interface CreateApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    attachedFiles?: any[],
  ) => Promise<void>;
  isCreating: boolean;
  creationProgress?: string;
  creationError?: string | null;
  title?: string;
}

export const CreateApplicationModal: React.FC<CreateApplicationModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
  creationProgress,
  creationError,
  title,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required.");
      setIsSubmitting(false);
      return;
    }
    try {
      const trimmedDescription = description.trim().slice(0, 2000);
      await onCreate(name.trim(), trimmedDescription, attachedFiles);
    } catch (_error) {
      setIsSubmitting(false);
      return;
    }
    setName("");
    setDescription("");
    clearFiles();
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    if (value.length <= 2000) {
      setDescription(value);
    }
  };

  // Auto-scroll progress box to bottom whenever new progress arrives
  useEffect(() => {
    if (isCreating && creationProgress && progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight;
    }
  }, [isCreating, creationProgress]);

  const remainingChars = 2000 - description.length;

  const actions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onClose,
      disabled: isSubmitting || isCreating,
    },
    {
      id: "create",
      label: "Create",
      type: "primary" as const,
      onClick: handleSubmit,
      disabled:
        isSubmitting || isCreating || !name.trim() || !description.trim(),
      loading: isSubmitting || isCreating,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title={title || "Create new application"}
      actions={actions}
      width="w-full max-w-md"
      closeOnOverlayClick={!isCreating}
      closeOnEscape={!isCreating}
    >
      <div className="space-y-4">
        {creationError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-red-800">
                Error creating application
              </span>
            </div>
            <div className="text-sm text-red-700">{creationError}</div>
          </div>
        )}
        {isCreating && creationProgress && (
          <div className="bg-[rgb(14,10,42)] border border-blue-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
              <span className="text-sm font-medium text-white">
                Creating application...
              </span>
            </div>
            <div
              ref={progressRef}
              className="text-sm text-white max-h-32 overflow-y-auto"
            >
              <LLMResponseDisplay content={creationProgress} />
            </div>
          </div>
        )}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-white"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full lp-input"
            required
            disabled={isSubmitting || isCreating}
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-white"
          >
            Description
          </label>
          <div className="mt-1 relative">
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              rows={5}
              maxLength={2000}
              className="block w-full lp-input"
              required
              disabled={isSubmitting || isCreating}
            />
            <div className="absolute right-2 text-sm text-interactive">
              {remainingChars} characters remaining
            </div>
          </div>
        </div>

        {/* File attachment section */}
        <div>
          <FileAttachmentUI
            attachedFiles={attachedFiles}
            onRemoveFile={handleRemoveFile}
            onRemoveAllFiles={handleRemoveAllFiles}
            onAttachFile={handleAttachFile}
            truncateFileName={truncateFileName}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            disabled={isSubmitting || isCreating}
            showAttachButton={true}
            attachButtonText="Attach files"
            className="mt-2"
          />
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>
    </StandardModal>
  );
};
