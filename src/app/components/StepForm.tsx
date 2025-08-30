import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { FaGripVertical, FaTrash, FaPencilAlt } from "react-icons/fa";
import { Field } from "../types";

interface StepFormProps {
  fields: Field[];
  onDeleteField: (field: Field) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
  onEditField: (field: Field) => void;
  onFieldChange: (fieldId: string, value: string | number | boolean) => void;
}

const StepForm: React.FC<StepFormProps> = ({
  fields,
  onDeleteField,
  onReorderFields,
  onEditField,
  onFieldChange: _onFieldChange,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex !== destinationIndex) {
      onReorderFields(sourceIndex, destinationIndex);
    }
  };

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="step-fields">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {fields.map((field, index) => (
                <Draggable
                  key={`field-${field.id}`}
                  draggableId={`field-${field.id}`}
                  index={index}
                >
                  {(provided: DraggableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center space-x-3 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-700 bg-[rgb(20,16,60)] text-white"
                      data-fieldid={field.id}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-white dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
                      >
                        <FaGripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-medium text-white truncate">
                          {field.label || field.name}
                        </div>
                        <div className="text-sm text-white/70">
                          {field.type}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onEditField(field)}
                          className="btn-secondary w-8"
                          title="Edit field"
                        >
                          <FaPencilAlt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteField(field)}
                          className="btn-secondary w-8"
                          title="Delete field"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default StepForm;
