"use client";

import { useCallback } from "react";
import { Field } from "../../../types";
import { DB_COLUMNS, DB_TABLES } from "../../../types/database";
import { fetchWithBaseUrl } from "../../../lib/fetchWithBaseUrl";

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
  caseid: number;
  systemOfRecordId: number;
  model?: any;
};

type UseDataObjectMutationsArgs = {
  selectedCase: MinimalCase | null;
  fields: Field[];
  setFieldsAction: (next: Field[] | ((prev: Field[]) => Field[])) => void;
  setDataObjectsAction: (
    next: DataObject[] | ((prev: DataObject[]) => DataObject[]),
  ) => void;
  eventName?: string;
};

/**
 * Manage mutations for data objects' field references in their model.fields
 * Data object model shape used: { fields: Array<{ fieldId: number; required?: boolean; order?: number }> }
 */
export default function useDataObjectMutations({
  selectedCase,
  setFieldsAction,
  setDataObjectsAction,
  eventName = "model-updated",
}: UseDataObjectMutationsArgs) {
  const refreshDataObjects = useCallback(async () => {
    if (!selectedCase) return;
    try {
      const res = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.DATA_OBJECTS}&${DB_COLUMNS.CASE_ID}=${selectedCase.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDataObjectsAction(data.data || []);
      }
    } catch (e) {
      console.error("Failed to refresh data objects", e);
    }
  }, [selectedCase, setDataObjectsAction]);

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
              dataObjectId,
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
        setFieldsAction((prev) => [...prev, createdField]);
      }
      // Refresh data objects list to maintain UI consistency
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [setFieldsAction, refreshDataObjects, eventName],
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
      setFieldsAction((prev) => prev.filter((f) => f.id !== field.id));
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [setFieldsAction, refreshDataObjects, eventName],
  );

  const handleReorderFieldsInDataObject = useCallback(
    async (dataObjectId: number, orderedFieldIds: number[]) => {
      // Optimistically update orders in local fields state
      setFieldsAction((prev) => {
        const next = [...prev];
        const idToOrder = new Map<number, number>();
        orderedFieldIds.forEach((fid, idx) => idToOrder.set(fid, idx + 1));
        return next.map((f) =>
          (f as any).id &&
          (f as any).dataObjectId === dataObjectId &&
          idToOrder.has((f as any).id)
            ? ({ ...(f as any), order: idToOrder.get((f as any).id)! } as any)
            : f,
        );
      });

      // Persist updated order for each affected field
      const updates = orderedFieldIds.map((fid, index) =>
        fetch(`/api/database?table=${DB_TABLES.FIELDS}&id=${fid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: DB_TABLES.FIELDS,
            data: { order: index + 1 },
          }),
        }),
      );
      await Promise.all(updates);
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [setFieldsAction, refreshDataObjects, eventName],
  );

  return {
    handleAddNewFieldAndAttach,
    handleRemoveFieldFromDataObject,
    handleReorderFieldsInDataObject,
  } as const;
}
