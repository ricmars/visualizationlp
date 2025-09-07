import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatInterface from "../ChatInterface";

// Mock React Markdown
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: any) {
    return <div data-testid="react-markdown">{children}</div>;
  };
});

// Mock remark plugins
jest.mock("remark-gfm", () => ({}));
jest.mock("remark-breaks", () => ({}));

// Mock fetch for object selector popup
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        data: [
          {
            id: 1,
            name: "TestObject",
            description: "Test Description",
            hasWorkflow: true,
            isEmbedded: false,
          },
        ],
      }),
  }),
) as jest.Mock;

describe("ChatInterface", () => {
  const mockProps = {
    onSendMessage: jest.fn(),
    onAbort: jest.fn(),
    messages: [],
    isLoading: false,
    isProcessing: false,
    objectid: 1,
    applicationId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should render the chat interface", () => {
    render(<ChatInterface {...mockProps} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    expect(textarea).toBeInTheDocument();
  });

  it("should open object selector popup when @ key is pressed", async () => {
    render(<ChatInterface {...mockProps} />);

    const textarea = screen.getByPlaceholderText("Type a message...");

    // Type @ in the textarea
    fireEvent.change(textarea, { target: { value: "Hello @" } });

    // Wait for the popup to appear
    await waitFor(() => {
      expect(screen.getByText("TestObject")).toBeInTheDocument();
    });
  });

  it("should insert object reference when object is selected", async () => {
    render(<ChatInterface {...mockProps} />);

    const textarea = screen.getByPlaceholderText("Type a message...");

    // Type some text and then @
    fireEvent.change(textarea, { target: { value: "Hello @" } });

    // Wait for the popup to appear
    await waitFor(() => {
      expect(screen.getByText("TestObject")).toBeInTheDocument();
    });

    // Select an object
    const selectButton = screen.getByText("TestObject");
    fireEvent.click(selectButton);

    // Check that the object reference was inserted
    await waitFor(() => {
      expect(textarea).toHaveValue("Hello @TestObject");
    });
  });

  it("should close popup when escape key is pressed", async () => {
    render(<ChatInterface {...mockProps} />);

    const textarea = screen.getByPlaceholderText("Type a message...");

    // Open the popup
    fireEvent.change(textarea, { target: { value: "Hello @" } });

    await waitFor(() => {
      expect(screen.getByText("TestObject")).toBeInTheDocument();
    });

    // Close the popup with escape key
    fireEvent.keyDown(textarea, { key: "Escape" });

    // Check that the popup is closed
    await waitFor(() => {
      expect(screen.queryByText("TestObject")).not.toBeInTheDocument();
    });
  });

  it("should send message when Enter is pressed", () => {
    render(<ChatInterface {...mockProps} />);

    const textarea = screen.getByPlaceholderText("Type a message...");

    // Type a message
    fireEvent.change(textarea, { target: { value: "Test message" } });

    // Press Enter
    fireEvent.keyDown(textarea, { key: "Enter" });

    // Check that onSendMessage was called with message, mode, and attachedFile
    expect(mockProps.onSendMessage).toHaveBeenCalledWith(
      "Test message",
      "agent",
      undefined,
    );
  });
});
