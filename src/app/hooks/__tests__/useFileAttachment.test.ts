import { renderHook, act } from "@testing-library/react";
import { useFileAttachment } from "../useFileAttachment";

describe("useFileAttachment", () => {
  it("should initialize with empty attached files", () => {
    const { result } = renderHook(() => useFileAttachment());

    expect(result.current.attachedFiles).toEqual([]);
    expect(result.current.fileInputRef.current).toBeNull();
  });

  it("should handle file selection for PDF files", () => {
    const { result } = renderHook(() => useFileAttachment());

    const mockFile = new File(["pdf data"], "test.pdf", {
      type: "application/pdf",
    });
    const mockEvent = {
      target: {
        files: [mockFile],
      },
    } as any;

    act(() => {
      result.current.handleFileSelect(mockEvent);
    });

    expect(result.current.attachedFiles).toHaveLength(1);
    expect(result.current.attachedFiles[0].name).toBe("test.pdf");
    expect(result.current.attachedFiles[0].type).toBe("pdf");
    expect(result.current.attachedFiles[0].content).toBe("[PDF: test.pdf]");
  });

  it("should handle empty file selection", () => {
    const { result } = renderHook(() => useFileAttachment());

    const mockEvent = {
      target: {
        files: null,
      },
    } as any;

    act(() => {
      result.current.handleFileSelect(mockEvent);
    });

    expect(result.current.attachedFiles).toHaveLength(0);
  });

  it("should handle file selection with no files", () => {
    const { result } = renderHook(() => useFileAttachment());

    const mockEvent = {
      target: {
        files: [],
      },
    } as any;

    act(() => {
      result.current.handleFileSelect(mockEvent);
    });

    expect(result.current.attachedFiles).toHaveLength(0);
  });

  it("should truncate file names correctly", () => {
    const { result } = renderHook(() => useFileAttachment());

    expect(result.current.truncateFileName("short.txt", 10)).toBe("short.txt");
    expect(result.current.truncateFileName("verylongfilename.txt", 10)).toBe(
      "verylon....txt",
    );
    expect(result.current.truncateFileName("filewithoutextension", 10)).toBe(
      "....filewithoutextension",
    );
  });

  it("should provide all required functions", () => {
    const { result } = renderHook(() => useFileAttachment());

    expect(typeof result.current.handleFileSelect).toBe("function");
    expect(typeof result.current.handleRemoveFile).toBe("function");
    expect(typeof result.current.handleRemoveAllFiles).toBe("function");
    expect(typeof result.current.handleAttachFile).toBe("function");
    expect(typeof result.current.truncateFileName).toBe("function");
    expect(typeof result.current.clearFiles).toBe("function");
  });
});
