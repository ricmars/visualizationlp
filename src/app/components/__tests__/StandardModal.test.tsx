import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StandardModal from "../StandardModal";

// Mock ModalPortal to avoid portal rendering issues in tests
jest.mock("../ModalPortal", () => {
  return function MockModalPortal({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen?: boolean;
  }) {
    if (isOpen === false) return null;
    return <div data-testid="modal-portal">{children}</div>;
  };
});

describe("StandardModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render modal with title and children when open", () => {
    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(
      <StandardModal
        isOpen={false}
        onCloseAction={mockOnClose}
        title="Test Modal"
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("should render actions in correct order: secondary first, then primary", () => {
    const actions = [
      {
        id: "cancel",
        label: "Cancel",
        type: "secondary" as const,
        onClick: mockOnCancel,
      },
      {
        id: "save",
        label: "Save",
        type: "primary" as const,
        onClick: mockOnSave,
      },
    ];

    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
        actions={actions}
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Cancel");
    expect(buttons[1]).toHaveTextContent("Save");
  });

  it("should apply correct CSS classes for action types", () => {
    const actions = [
      {
        id: "cancel",
        label: "Cancel",
        type: "secondary" as const,
        onClick: mockOnCancel,
      },
      {
        id: "save",
        label: "Save",
        type: "primary" as const,
        onClick: mockOnSave,
      },
    ];

    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
        actions={actions}
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const cancelButton = screen.getByText("Cancel");
    const saveButton = screen.getByText("Save");

    expect(cancelButton).toHaveClass("btn-secondary");
    expect(saveButton).toHaveClass("interactive-button");
  });

  it("should handle disabled and loading states", () => {
    const actions = [
      {
        id: "save",
        label: "Save",
        type: "primary" as const,
        onClick: mockOnSave,
        disabled: true,
        loading: true,
      },
    ];

    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
        actions={actions}
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const saveButton = screen.getByRole("button", { name: /save is loading/i });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveClass("opacity-60", "cursor-not-allowed");
  });

  it("should call onCloseAction when Escape key is pressed", () => {
    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const modal = screen.getByRole("dialog");
    fireEvent.keyDown(modal, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onCloseAction when overlay is clicked", () => {
    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const overlay = screen.getByRole("dialog").parentElement;
    fireEvent.click(overlay!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should not close when modal content is clicked", () => {
    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    const modalContent = screen.getByRole("dialog");
    fireEvent.click(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should call action onClick handlers when buttons are clicked", () => {
    const actions = [
      {
        id: "cancel",
        label: "Cancel",
        type: "secondary" as const,
        onClick: mockOnCancel,
      },
      {
        id: "save",
        label: "Save",
        type: "primary" as const,
        onClick: mockOnSave,
      },
    ];

    render(
      <StandardModal
        isOpen={true}
        onCloseAction={mockOnClose}
        title="Test Modal"
        actions={actions}
      >
        <div>Modal content</div>
      </StandardModal>,
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Save"));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          description="Test description"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      expect(modal).toHaveAttribute("aria-modal", "true");
      expect(modal).toHaveAttribute("aria-labelledby", "modal-title");
      expect(modal).toHaveAttribute("aria-describedby", "modal-description");
    });

    it("should announce modal opening to screen readers", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const liveRegion = screen.getByText("Modal opened: Test Modal");
      expect(liveRegion).toHaveClass("sr-only");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("should include screen reader description when provided", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          description="This is a test modal description"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const description = screen.getByText("This is a test modal description");
      expect(description).toHaveClass("sr-only");

      // Check that the container div has the ID
      const descriptionContainer = description.parentElement;
      expect(descriptionContainer).toHaveAttribute("id", "modal-description");

      // Also check that the modal has the aria-describedby attribute
      const modal = screen.getByRole("dialog");
      expect(modal).toHaveAttribute("aria-describedby", "modal-description");
    });

    it("should handle focus management", async () => {
      const { rerender } = render(
        <StandardModal
          isOpen={false}
          onCloseAction={mockOnClose}
          title="Test Modal"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      // Modal should not be in DOM when closed
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Open modal
      rerender(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      await waitFor(() => {
        const modal = screen.getByRole("dialog");
        expect(modal).toBeInTheDocument();
      });
    });

    it("should trap focus within modal", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          actions={[
            {
              id: "cancel",
              label: "Cancel",
              type: "secondary" as const,
              onClick: mockOnCancel,
            },
            {
              id: "save",
              label: "Save",
              type: "primary" as const,
              onClick: mockOnSave,
            },
          ]}
        >
          <input type="text" placeholder="Test input" />
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      const cancelButton = screen.getByText("Cancel");

      // Test Tab key navigation
      fireEvent.keyDown(modal, { key: "Tab" });
      // Focus should move to first focusable element

      // Test Shift+Tab from first element should go to last
      fireEvent.keyDown(cancelButton, { key: "Tab", shiftKey: true });
      // This should focus the last focusable element (save button)
    });

    it("should handle escape key to close modal", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      fireEvent.keyDown(modal, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not close on escape when closeOnEscape is false", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          closeOnEscape={false}
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      fireEvent.keyDown(modal, { key: "Escape" });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should not close on overlay click when closeOnOverlayClick is false", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          closeOnOverlayClick={false}
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const overlay = screen.getByRole("dialog").parentElement;
      fireEvent.click(overlay!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should provide proper loading state accessibility", () => {
      const actions = [
        {
          id: "save",
          label: "Save",
          type: "primary" as const,
          onClick: mockOnSave,
          loading: true,
        },
      ];

      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          actions={actions}
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const saveButton = screen.getByRole("button", {
        name: /save is loading/i,
      });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute("aria-describedby", "save-loading");

      const loadingDescription = screen.getByText("Save is loading");
      expect(loadingDescription).toHaveClass("sr-only");
      expect(loadingDescription).toHaveAttribute("id", "save-loading");
    });

    it("should handle form submission with proper button types", () => {
      const actions = [
        {
          id: "submit",
          label: "Submit",
          type: "primary" as const,
          onClick: mockOnSave,
          buttonType: "submit" as const,
          form: "test-form",
        },
      ];

      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          actions={actions}
        >
          <form id="test-form">
            <input type="text" />
          </form>
        </StandardModal>,
      );

      const submitButton = screen.getByText("Submit");
      expect(submitButton).toHaveAttribute("type", "submit");
      expect(submitButton).toHaveAttribute("form", "test-form");
    });

    it("should render with custom z-index", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          zIndex="z-[100]"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      expect(modal).toHaveClass("z-[100]");
    });

    it("should render with custom width", () => {
      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          width="w-96"
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modalSurface = screen.getByRole("dialog").firstChild;
      expect(modalSurface).toHaveClass("w-96");
    });

    it("should call onKeyDownAction when provided", () => {
      const mockKeyDown = jest.fn();

      render(
        <StandardModal
          isOpen={true}
          onCloseAction={mockOnClose}
          title="Test Modal"
          onKeyDownAction={mockKeyDown}
        >
          <div>Modal content</div>
        </StandardModal>,
      );

      const modal = screen.getByRole("dialog");
      fireEvent.keyDown(modal, { key: "Enter" });
      expect(mockKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: "Enter" }),
      );
    });
  });
});
