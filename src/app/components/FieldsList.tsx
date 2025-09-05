"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { getFieldTypeDisplayName } from "../utils/fieldTypes";
import { getObjectName, isReferenceFieldType } from "../utils/objectUtils";

interface FieldsListProps {
  fields: Field[];
  onDeleteField: (field: Field) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
  onEditField: (field: Field) => void;
}

const FieldsList: React.FC<FieldsListProps> = ({
  fields,
  onDeleteField,
  onReorderFields,
  onEditField,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [objectNames, setObjectNames] = useState<Map<number, string>>(
    new Map(),
  );

  // Load object names for reference fields
  useEffect(() => {
    const loadObjectNames = async () => {
      const referenceFields = fields.filter(
        (field) => isReferenceFieldType(field.type) && field.refObjectId,
      );

      const newObjectNames = new Map(objectNames);

      for (const field of referenceFields) {
        if (field.refObjectId && !newObjectNames.has(field.refObjectId)) {
          try {
            const name = await getObjectName(field.refObjectId);
            newObjectNames.set(field.refObjectId, name);
          } catch (error) {
            console.error(
              `Failed to load object name for ID ${field.refObjectId}:`,
              error,
            );
            newObjectNames.set(
              field.refObjectId,
              `Object ${field.refObjectId}`,
            );
          }
        }
      }

      setObjectNames(newObjectNames);
    };

    loadObjectNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const buildHrefForObject = (objectId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("object", String(objectId));
    return `${pathname}?${params.toString()}`;
  };

  const handleRefClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    objectId: number,
  ) => {
    e.preventDefault();
    const href = buildHrefForObject(objectId);
    router.push(href);
  };

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
        <Droppable droppableId="fields-list">
          {(provided: DroppableProvided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-1"
            >
              {fields.map((field, index) => (
                <Draggable
                  key={`field-${field.id ?? field.name}`}
                  draggableId={`field-${field.id ?? field.name}`}
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
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-white truncate">
                            {field.label}
                          </div>
                          {field.primary && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/70">
                          Type: {getFieldTypeDisplayName(field.type as any)}
                          {isReferenceFieldType(field.type) &&
                            field.refObjectId && (
                              <span className="ml-2">
                                {"Object: "}
                                <a
                                  href={buildHrefForObject(field.refObjectId)}
                                  onClick={(e) =>
                                    handleRefClick(e, field.refObjectId!)
                                  }
                                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 transition-colors"
                                  title={`Open ${
                                    objectNames.get(field.refObjectId) ||
                                    `Object ${field.refObjectId}`
                                  }`}
                                >
                                  {objectNames.get(field.refObjectId) ||
                                    `Object ${field.refObjectId}`}
                                </a>
                              </span>
                            )}
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

export default FieldsList;
