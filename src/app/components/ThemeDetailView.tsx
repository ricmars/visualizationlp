import React, { useState } from "react";
import { FaPencilAlt, FaTrash } from "react-icons/fa";
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
}

export const ThemeDetailView: React.FC<ThemeDetailViewProps> = ({
  theme,
  onEdit,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!theme) return null;

  const handleDelete = () => {
    onDelete(theme.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-[rgb(14,10,42)] text-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{theme.name}</h2>
            {theme.isSystemTheme && (
              <span className="tag-secondary">System</span>
            )}
            <button
              className="btn-secondary w-8"
              aria-label="Edit theme"
              onClick={() => onEdit(theme)}
            >
              <FaPencilAlt className="w-4 h-4" />
            </button>
            {!theme.isSystemTheme && (
              <button
                className="btn-secondary w-8"
                aria-label="Delete theme"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <FaTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-2">
                Description
              </h3>
              <p className="text-white">{theme.description}</p>
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
                theme={theme.model}
                name={theme.name}
                onUpdate={(updatedTheme) => {
                  // In detail view, we don't allow editing, so this is read-only
                  console.log("Theme updated:", updatedTheme);
                }}
                readOnly={true}
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
