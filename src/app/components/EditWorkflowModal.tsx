import { useState, useEffect } from "react";
import StandardModal from "./StandardModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface EditWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  onDelete?: () => Promise<void> | void;
  initialData: {
    name: string;
    description: string;
  };
}

const EditWorkflowModal: React.FC<EditWorkflowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
}) => {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name);
      setDescription(initialData.description);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Workflow name is required");
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() });
    onClose();
  };

  const handleDelete = () => {
    setIsConfirmingDelete(true);
  };

  const actions = [
    ...(onDelete
      ? [
          {
            id: "delete",
            label: "Delete",
            type: "secondary" as const,
            onClick: handleDelete,
          },
        ]
      : []),
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
    <>
      <StandardModal
        isOpen={isOpen}
        onCloseAction={onClose}
        title="Edit Workflow"
        actions={actions}
        width="w-full max-w-md"
      >
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="workflowName"
              className="block text-sm font-medium text-white mb-1"
            >
              Workflow Name
            </label>
            <input
              type="text"
              id="workflowName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
              placeholder="Enter workflow name"
            />
          </div>

          <div>
            <label
              htmlFor="workflowDescription"
              className="block text-sm font-medium text-white mb-1"
            >
              Description
            </label>
            <textarea
              id="workflowDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgb(20,16,60)] text-white"
              placeholder="Enter workflow description"
            />
          </div>
        </div>
      </StandardModal>

      <ConfirmDeleteModal
        isOpen={isConfirmingDelete}
        title="Delete workflow"
        message={`Are you sure you want to delete "${name}"? This will permanently remove the workflow, all fields, views, and checkpoints for this case.`}
        onCancel={() => setIsConfirmingDelete(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          await onDelete();
          setIsConfirmingDelete(false);
          onClose();
        }}
      />
    </>
  );
};

export default EditWorkflowModal;
