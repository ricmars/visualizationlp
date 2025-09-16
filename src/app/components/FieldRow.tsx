"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaGripVertical, FaTrash, FaPencilAlt } from "react-icons/fa";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Field } from "../types/types";
import { getFieldTypeDisplayName } from "../utils/fieldTypes";
import { getObjectName, isReferenceFieldType } from "../utils/objectUtils";

interface FieldRowProps {
  field: Field;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onEdit?: (field: Field) => void;
  onDelete?: (field: Field) => void;
  hideDragHandle?: boolean;
  disableRefNavigation?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({
  field,
  dragHandleProps,
  onEdit,
  onDelete,
  hideDragHandle,
  disableRefNavigation,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [objectName, setObjectName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isReferenceFieldType(field.type) && field.refObjectId) {
        try {
          const name = await getObjectName(field.refObjectId);
          if (isMounted) setObjectName(name);
        } catch {
          if (isMounted) setObjectName(`Object ${field.refObjectId}`);
        }
      } else {
        if (isMounted) setObjectName(null);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [field]);

  const buildHrefForObject = (objectId: number): string => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("object", String(objectId));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <>
      {!hideDragHandle && (
        <div
          {...dragHandleProps}
          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-white dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
        >
          <FaGripVertical className="w-4 h-4" />
        </div>
      )}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium text-white truncate">
            {field.label || field.name}
          </div>
          {field.highlighted ? (
            <span className="tag-secondary">Highlighted</span>
          ) : field.primary ? (
            <span className="tag-secondary">Primary</span>
          ) : null}
        </div>
        <ol
          className="text-sm text-white/70 dot-separated"
          aria-label="Field details"
        >
          <li>
            <span className="sr-only">Type: </span>
            <span aria-hidden="true">Type: </span>
            {getFieldTypeDisplayName(field.type as unknown as any)}
          </li>
          {isReferenceFieldType(field.type) && field.refObjectId ? (
            <li>
              <span className="sr-only">Object: </span>
              <span aria-hidden="true">Object: </span>
              {disableRefNavigation ? (
                <span className="text-blue-300">
                  {objectName || `Object ${field.refObjectId}`}
                </span>
              ) : (
                <Link
                  href={buildHrefForObject(field.refObjectId)}
                  className="inline-flex items-center gap-1"
                  title={`Open ${objectName || `Object ${field.refObjectId}`}`}
                >
                  {objectName || `Object ${field.refObjectId}`}
                </Link>
              )}
            </li>
          ) : null}
          {(field.type === "EmbedDataSingle" ||
            field.type === "EmbedDataMulti") && (
            <li>
              <span className="tag-secondary">Embedded</span>
            </li>
          )}
        </ol>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex items-center space-x-1">
          {onEdit && (
            <button
              onClick={() => onEdit(field)}
              className="btn-secondary w-8"
              title="Edit field"
            >
              <FaPencilAlt className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(field)}
              className="btn-secondary w-8"
              title="Delete field"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default FieldRow;
