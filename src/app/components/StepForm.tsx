import React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
} from "@hello-pangea/dnd";
import { Field } from "../types/types";
import FieldRow from "./FieldRow";

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
                      <FieldRow
                        field={field}
                        dragHandleProps={provided.dragHandleProps ?? undefined}
                        onEdit={onEditField}
                        onDelete={onDeleteField}
                      />
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
