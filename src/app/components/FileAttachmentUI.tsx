import React from "react";
import { AttachedFile } from "../hooks/useFileAttachment";

interface FileAttachmentUIProps {
  attachedFiles: AttachedFile[];
  onRemoveFile: (fileId: string) => void;
  onRemoveAllFiles: () => void;
  onAttachFile: () => void;
  truncateFileName: (fileName: string, maxLength?: number) => string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  showAttachButton?: boolean;
  attachButtonText?: string;
  className?: string;
}

export const FileAttachmentUI: React.FC<FileAttachmentUIProps> = ({
  attachedFiles,
  onRemoveFile,
  onRemoveAllFiles,
  onAttachFile,
  fileInputRef,
  onFileSelect,
  disabled = false,
  showAttachButton = true,
  attachButtonText = "Attach files",
}) => {
  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileSelect}
        className="hidden"
        multiple
        accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.sql,.xml,.yaml,.yml,.html,.css,.scss,.sass,.less,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg"
      />

      {/* Attach files button */}
      {showAttachButton && (
        <button
          type="button"
          onClick={onAttachFile}
          disabled={disabled}
          className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
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
          {attachButtonText}
        </button>
      )}

      {/* File attachment toolbar */}
      {attachedFiles.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-300">
              Attached files ({attachedFiles.length})
            </span>
            <button
              onClick={onRemoveAllFiles}
              className="text-xs text-gray-400 hover:text-white transition-colors"
              title="Remove all files"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {file.type === "image" ? (
                    <svg
                      className="w-3 h-3 text-gray-400"
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
                  ) : file.type === "pdf" ? (
                    <svg
                      className="w-3 h-3 text-gray-400"
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
                      className="w-3 h-3 text-gray-400"
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
                    className="text-xs text-white truncate"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="btn-secondary w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600 transition-colors"
                  title="Remove file"
                >
                  <svg
                    className="w-3 h-3"
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
            ))}
          </div>
        </>
      )}
    </>
  );
};
