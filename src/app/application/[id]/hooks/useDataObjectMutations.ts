"use client";

import { useCallback } from "react";
import { Field } from "../../../types";
import { DB_TABLES } from "../../../types/database";

type MinimalCase = {
  id: number;
  name: string;
  description: string;
  model: any;
};

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  model?: any;
};

type UseDataObjectMutationsArgs = {
  selectedCase: MinimalCase | null;
  fields: Field[];
  // Setter for data object-specific fields (not case-level fields)
  setDataObjectFieldsAction: (
    next: Field[] | ((prev: Field[]) => Field[]),
  ) => void;
  setDataObjectsAction: (
    next: DataObject[] | ((prev: DataObject[]) => DataObject[]),
  ) => void;
  eventName?: string;
  refreshWorkflowDataAction?: () => Promise<void>;
};

/**
 * Manage mutations for data objects' field references in their model.fields
 * Data object model shape used: { fields: Array<{ fieldId: number; required?: boolean; order?: number }> }
 */
export default function useDataObjectMutations({
  selectedCase: _selectedCase,
  fields,
  setDataObjectFieldsAction,
  eventName = "model-updated",
  refreshWorkflowDataAction,
}: UseDataObjectMutationsArgs) {
  const refreshDataObjects = useCallback(async () => {
    if (refreshWorkflowDataAction) {
      await refreshWorkflowDataAction();
    }
  }, [refreshWorkflowDataAction]);

  const handleAddNewFieldAndAttach = useCallback(
    async (
      dataObjectId: number,
      field: {
        label: string;
        type: Field["type"];
        options?: string[];
        required?: boolean;
        primary?: boolean;
        sampleValue?: string;
      },
    ) => {
      // Create a new field specific to this data object
      const fieldName = field.label.toLowerCase().replace(/\s+/g, "_");
      const createResp = await fetch(
        `/api/database?table=${DB_TABLES.FIELDS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: DB_TABLES.FIELDS,
            data: {
              name: fieldName,
              type: field.type,
              primary: field.primary ?? false,
              objectid: dataObjectId,
              label: field.label,
              description: field.label,
              order: 0,
              options: field.options ?? [],
              required: field.required ?? false,
              sampleValue: field.sampleValue,
            },
          }),
        },
      );
      if (!createResp.ok) {
        const errorText = await createResp.text();
        throw new Error(
          `Failed to add field: ${createResp.status} ${errorText}`,
        );
      }
      const createData = await createResp.json();
      const createdField: Field | undefined = createData?.data;

      // Optimistically update fields list (append to global list)
      if (createdField) {
        setDataObjectFieldsAction((prev) => [...prev, createdField]);
      }
      // Refresh data objects list to maintain UI consistency
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [setDataObjectFieldsAction, refreshDataObjects, eventName],
  );

  const handleRemoveFieldFromDataObject = useCallback(
    async (_dataObjectId: number, field: Field) => {
      if (!field.id) return;
      // Delete the field record as it's specific to the data object
      const resp = await fetch(
        `/api/database?table=${DB_TABLES.FIELDS}&id=${field.id}`,
        { method: "DELETE" },
      );
      if (!resp.ok) throw new Error("Failed to delete field");
      // Sync local state
      setDataObjectFieldsAction((prev) =>
        prev.filter((f) => f.id !== field.id),
      );
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [setDataObjectFieldsAction, refreshDataObjects, eventName],
  );

  const handleReorderFieldsInDataObject = useCallback(
    async (dataObjectId: number, orderedFieldIds: number[]) => {
      // Optimistically update orders in local fields state
      setDataObjectFieldsAction((prev) => {
        const next = [...prev];
        const idToOrder = new Map<number, number>();
        orderedFieldIds.forEach((fid, idx) => idToOrder.set(fid, idx + 1));
        return next.map((f) =>
          (f as any).id &&
          (f as any).objectid === dataObjectId &&
          idToOrder.has((f as any).id)
            ? ({ ...(f as any), order: idToOrder.get((f as any).id)! } as any)
            : f,
        );
      });

      // Persist updated order for each affected field
      const updates = orderedFieldIds.map((fid, index) => {
        const field = (fields || []).find((f) => (f as any).id === fid);
        if (!field) return Promise.resolve(new Response(null));
        return fetch(`/api/database?table=${DB_TABLES.FIELDS}&id=${fid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: DB_TABLES.FIELDS,
            data: {
              // Include all required props for validation
              id: field.id,
              name: field.name,
              label: field.label,
              type: field.type,
              primary: field.primary ?? false,
              objectid: dataObjectId,
              options: field.options ?? [],
              required: field.required ?? false,
              order: index + 1,
              description: (field as any).description ?? "",
              sampleValue: (field as any).sampleValue,
            },
          }),
        });
      });
      await Promise.all(updates);
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [fields, setDataObjectFieldsAction, refreshDataObjects, eventName],
  );

  return {
    handleAddNewFieldAndAttach,
    handleRemoveFieldFromDataObject,
    handleReorderFieldsInDataObject,
  } as const;
}
