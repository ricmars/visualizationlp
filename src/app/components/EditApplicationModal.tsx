import { useState, useEffect } from "react";
import StandardModal from "./StandardModal";

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  initialData: {
    name: string;
    description: string;
  };
}

const EditApplicationModal: React.FC<EditApplicationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Application name is required");
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() });
    onClose();
  };

  const actions = [
    {
      id: "cancel",
      label: "Cancel",
      type: "secondary" as const,
      onClick: onClose,
    },
    {
      id: "save",
      label: "Save",
      type: "primary" as const,
      onClick: handleSubmit,
    },
  ];

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Edit Application"
      actions={actions}
      width="w-full max-w-md"
    >
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="applicationName"
            className="block text-sm font-medium text-white mb-1"
          >
            Application Name
          </label>
          <input
            type="text"
            id="applicationName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lp-input w-full"
            placeholder="Enter application name"
          />
        </div>

        <div>
          <label
            htmlFor="applicationDescription"
            className="block text-sm font-medium text-white mb-1"
          >
            Description
          </label>
          <textarea
            id="applicationDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="lp-input w-full"
            placeholder="Enter application description"
          />
        </div>
      </div>
    </StandardModal>
  );
};

export default EditApplicationModal;
