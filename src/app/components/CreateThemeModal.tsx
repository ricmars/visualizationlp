import { useState } from "react";
import StandardModal from "./StandardModal";

interface CreateThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    description: string,
    applicationId: number,
  ) => Promise<void>;
  isCreating: boolean;
  creationError?: string | null;
  applicationId: number;
}

export const CreateThemeModal: React.FC<CreateThemeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating,
  creationError,
  applicationId,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!name.trim() || !description.trim()) {
      setError("Name and description are required.");
      setIsSubmitting(false);
      return;
    }
    try {
      await onCreate(name.trim(), description.trim(), applicationId);
      setName("");
      setDescription("");
      setIsSubmitting(false);
    } catch (_error) {
      setIsSubmitting(false);
      return;
    }
  };

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
      title="Create new theme"
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
                Error creating theme
              </span>
            </div>
            <div className="text-sm text-red-700">{creationError}</div>
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
            placeholder="Enter theme name"
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
            rows={3}
            className="mt-1 block w-full lp-input"
            required
            disabled={isSubmitting || isCreating}
            placeholder="Enter theme description"
          />
        </div>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </div>
    </StandardModal>
  );
};
