"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FaGripVertical, FaTrash, FaPencilAlt } from "react-icons/fa";
import { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Field } from "../types";
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
  const router = useRouter();
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

  const handleRefClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    objectId: number,
  ) => {
    e.preventDefault();
    const href = buildHrefForObject(objectId);
    router.push(href);
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
          {field.primary ? (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
              Primary
            </span>
          ) : null}
        </div>
        <div className="text-sm text-white/70">
          Type: {getFieldTypeDisplayName(field.type as unknown as any)}
          {isReferenceFieldType(field.type) && field.refObjectId ? (
            <span className="ml-2">
              {"Object: "}
              {disableRefNavigation ? (
                <span className="text-blue-300">
                  {objectName || `Object ${field.refObjectId}`}
                </span>
              ) : (
                <a
                  href={buildHrefForObject(field.refObjectId)}
                  onClick={(e) => handleRefClick(e, field.refObjectId!)}
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 transition-colors"
                  title={`Open ${objectName || `Object ${field.refObjectId}`}`}
                >
                  {objectName || `Object ${field.refObjectId}`}
                </a>
              )}
            </span>
          ) : null}
        </div>
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
