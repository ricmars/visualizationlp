import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import StandardModal from "./StandardModal";

// Dynamic import to prevent SSR issues with Pega components
const ThemeEditorWithToggle = dynamic(() => import("./ThemeEditorWithToggle"), {
  ssr: false,
});

interface Theme {
  id: number;
  name: string;
  description: string;
  isSystemTheme: boolean;
  applicationid: number;
  model: any;
}

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme | null;
  onSave: (
    id: number,
    name: string,
    description: string,
    model: any,
  ) => Promise<void>;
  onDelete?: (themeId: number) => Promise<void>;
  isSaving: boolean;
  saveError?: string | null;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  theme,
  onSave,
  onDelete,
  isSaving,
  saveError,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<any>(null);

  // Update form when theme changes
  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setDescription(theme.description);
      setCurrentTheme(theme.model || {});
    }
  }, [theme]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required.");
      setIsSubmitting(false);
      return;
    }
    try {
      const finalModel = currentTheme;
      await onSave(theme!.id, name.trim(), description.trim(), finalModel);
      setIsSubmitting(false);
    } catch (_error) {
      setIsSubmitting(false);
      return;
    }
  };

  const handleThemeUpdate = (updatedTheme: any) => {
    setCurrentTheme(updatedTheme);
  };

  const handleDelete = async () => {
    if (!theme || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(theme.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete theme:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onClose,
      disabled: isSubmitting || isSaving || isDeleting,
    },
    ...(theme && !theme.isSystemTheme && onDelete
      ? [
          {
            id: "delete",
            label: "Delete",
            type: "secondary" as const,
            onClick: () => setShowDeleteConfirm(true),
            disabled: isSubmitting || isSaving || isDeleting,
          },
        ]
      : []),
    {
      id: "save",
      label: "Save",
      type: "primary" as const,
      onClick: handleSubmit,
      disabled:
        isSubmitting ||
        isSaving ||
        isDeleting ||
        !name.trim() ||
        !description.trim(),
      loading: isSubmitting || isSaving,
    },
  ];

  if (!theme) return null;

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Edit theme"
      actions={actions}
      width="w-full max-w-4xl"
      closeOnOverlayClick={!isSaving}
      closeOnEscape={!isSaving}
    >
      <div className="space-y-4">
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-red-800">
                Error saving theme
              </span>
            </div>
            <div className="text-sm text-red-700">{saveError}</div>
          </div>
        )}

        <div className="space-y-4">
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
              disabled={isSubmitting || isSaving}
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-white"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full lp-input resize-none"
              required
              disabled={isSubmitting || isSaving}
            />
          </div>
        </div>

        <div style={{ height: "calc(100vh - 400px)", overflow: "auto" }}>
          <ThemeEditorWithToggle
            theme={currentTheme}
            name={name}
            onUpdate={handleThemeUpdate}
            readOnly={isSubmitting || isSaving}
          />
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>

      {/* Delete Confirmation Modal */}
      <StandardModal
        isOpen={showDeleteConfirm}
        onCloseAction={() => setShowDeleteConfirm(false)}
        title="Delete Theme"
        actions={[
          {
            id: "cancel",
            label: "Cancel",
            type: "secondary" as const,
            onClick: () => setShowDeleteConfirm(false),
            disabled: isDeleting,
          },
          {
            id: "delete",
            label: "Delete",
            type: "primary" as const,
            onClick: handleDelete,
            disabled: isDeleting,
            loading: isDeleting,
          },
        ]}
        width="w-full max-w-md"
      >
        <div className="text-white">
          <p>Are you sure you want to delete the theme "{theme.name}"?</p>
          <p className="text-sm text-white/70 mt-2">
            This action cannot be undone.
          </p>
        </div>
      </StandardModal>
    </StandardModal>
  );
};
