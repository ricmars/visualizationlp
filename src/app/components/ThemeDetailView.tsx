import React, { useState } from "react";
import { FaPencilAlt } from "react-icons/fa";
import StandardModal from "./StandardModal";
import ThemeEditorWithToggle from "./ThemeEditorWithToggle";

interface Theme {
  id: number;
  name: string;
  description: string;
  isSystemTheme: boolean;
  applicationid: number;
  model: any;
}

interface ThemeDetailViewProps {
  theme: Theme | null;
  onEdit: (theme: Theme) => void;
  onDelete: (themeId: number) => void;
  onClose: () => void;
  onSave?: (theme: Theme) => Promise<void>;
}

export const ThemeDetailView: React.FC<ThemeDetailViewProps> = ({
  theme,
  onEdit,
  onDelete,
  onClose: _onClose,
  onSave,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedThemeModel, setEditedThemeModel] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  if (!theme) return null;

  const handleDelete = () => {
    onDelete(theme.id);
    setShowDeleteConfirm(false);
  };

  const handleSaveThemeModel = async () => {
    if (!editedThemeModel || !onSave) return;

    setIsSaving(true);
    try {
      const updatedTheme = { ...theme, model: editedThemeModel };
      await onSave(updatedTheme);
      setEditedThemeModel(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving theme model:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeUpdate = (updatedTheme: any) => {
    setEditedThemeModel(updatedTheme);
    setHasUnsavedChanges(true);
  };

  const currentThemeModel = editedThemeModel || theme.model;

  return (
    <>
      <div className="h-full flex flex-col bg-[rgb(14,10,42)] text-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{theme.name}</h2>
              {theme.isSystemTheme && (
                <span className="tag-secondary">System</span>
              )}
              <button
                className="btn-secondary w-8"
                aria-label="Edit theme name and description"
                onClick={() => onEdit(theme)}
              >
                <FaPencilAlt className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {!theme.isSystemTheme && (
                <button
                  className="btn-secondary px-3"
                  aria-label="Delete theme"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </button>
              )}
              <button
                className="interactive-button px-3"
                onClick={handleSaveThemeModel}
                disabled={!hasUnsavedChanges || isSaving}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <p className="text-white/80 text-sm">{theme.description}</p>
            </div>

            {/* Theme Model */}
            <div
              className="flex-1 flex flex-col"
              style={{
                height: "calc(100vh - 300px)",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            >
              <ThemeEditorWithToggle
                theme={currentThemeModel}
                name={theme.name}
                onUpdate={handleThemeUpdate}
                readOnly={false}
              />
            </div>
          </div>
        </div>
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
          },
          {
            id: "delete",
            label: "Delete",
            type: "primary" as const,
            onClick: handleDelete,
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
    </>
  );
};
