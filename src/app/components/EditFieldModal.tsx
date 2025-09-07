import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "../types/types";
import FieldModal from "./FieldModal";

interface EditFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: Partial<Field>) => void;
  field: Field;
  workflowObjects?: Array<{ id: number; name: string }>;
  dataObjects?: Array<{ id: number; name: string }>;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  field,
  workflowObjects = [],
  dataObjects = [],
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop z-[120] modal-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-[130] modal-surface"
            tabIndex={-1}
          >
            <div className="space-y-4 p-4">
              <FieldModal
                isOpen={isOpen}
                mode="edit"
                title="Edit Field"
                onClose={onClose}
                initialField={field}
                onSubmitEdit={onSubmit}
                workflowObjects={workflowObjects}
                dataObjects={dataObjects}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditFieldModal;
