import { useState, useRef } from "react";

export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  content: string;
  type: "text" | "image" | "pdf";
  base64?: string;
}

export const useFileAttachment = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const fileType = getFileType(file.name, file.type);
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;

      if (fileType === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const newFile: AttachedFile = {
            id: fileId,
            file,
            name: file.name,
            content: `[Image: ${file.name}]`,
            type: "image",
            base64,
          };
          setAttachedFiles((prev) => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      } else if (fileType === "pdf") {
        // For PDFs, we'll upload directly to OpenAI Files API
        const newFile: AttachedFile = {
          id: fileId,
          file,
          name: file.name,
          content: `[PDF: ${file.name}]`,
          type: "pdf",
        };
        setAttachedFiles((prev) => [...prev, newFile]);
      } else {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const newFile: AttachedFile = {
            id: fileId,
            file,
            name: file.name,
            content,
            type: "text",
          };
          setAttachedFiles((prev) => [...prev, newFile]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleRemoveAllFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const truncateFileName = (
    fileName: string,
    maxLength: number = 20,
  ): string => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split(".").pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
    const truncatedName = nameWithoutExt.substring(0, maxLength - 3);
    return `${truncatedName}...${extension ? `.${extension}` : ""}`;
  };

  const clearFiles = () => {
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    attachedFiles,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile,
    handleRemoveAllFiles,
    handleAttachFile,
    truncateFileName,
    clearFiles,
  };
};
