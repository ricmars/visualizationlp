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
  setFields: (next: Field[] | ((prev: Field[]) => Field[])) => void;
  dataObjects: DataObject[];
  setDataObjects: (
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
  setFields,
  dataObjects,
  setDataObjects,
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
        setDataObjects(data.data || []);
      }
    } catch (e) {
      console.error("Failed to refresh data objects", e);
    }
  }, [selectedCase, setDataObjects]);

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
      if (!selectedCase) return;

      // 1) Create a new global field (cannot re-use existing for data-tab per requirements)
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
              caseid: selectedCase.id,
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

      // Optimistically update fields list
      if (createdField) {
        setFields((prev) => [...prev, createdField]);
      }

      // 2) Attach the new field to the data object's model.fields
      const target = dataObjects.find((d) => d.id === dataObjectId);
      if (!target) throw new Error("Data object not found");
      let model: any = {};
      try {
        model =
          typeof target.model === "string"
            ? JSON.parse(target.model)
            : target.model || {};
      } catch {
        model = {};
      }
      const currentRefs: Array<{
        fieldId: number;
        required?: boolean;
        order?: number;
      }> = Array.isArray(model?.fields) ? model.fields : [];
      const hasAlready = createdField?.id
        ? currentRefs.some((r) => r.fieldId === createdField!.id)
        : false;
      const nextRefs = hasAlready
        ? currentRefs
        : [
            ...currentRefs,
            {
              fieldId: createdField?.id as number,
              required: field.required ?? false,
              order: currentRefs.length + 1,
            },
          ];

      const putResp = await fetch(
        `/api/database?table=${DB_TABLES.DATA_OBJECTS}&id=${dataObjectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: target.name,
            description: target.description,
            caseid: target.caseid,
            systemOfRecordId: target.systemOfRecordId,
            model: {
              ...(model || {}),
              fields: nextRefs,
            },
          }),
        },
      );
      if (!putResp.ok) {
        const errorText = await putResp.text();
        throw new Error(
          `Failed to attach field to data object: ${putResp.status} ${errorText}`,
        );
      }

      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [selectedCase, dataObjects, setFields, refreshDataObjects, eventName],
  );

  const handleRemoveFieldFromDataObject = useCallback(
    async (dataObjectId: number, field: Field) => {
      const target = dataObjects.find((d) => d.id === dataObjectId);
      if (!target) return;
      let model: any = {};
      try {
        model =
          typeof target.model === "string"
            ? JSON.parse(target.model)
            : target.model || {};
      } catch {
        model = {};
      }
      const currentRefs: Array<{
        fieldId: number;
        required?: boolean;
        order?: number;
      }> = Array.isArray(model?.fields) ? model.fields : [];
      const nextRefs = currentRefs.filter((r) => r.fieldId !== field.id);

      const resp = await fetch(
        `/api/database?table=${DB_TABLES.DATA_OBJECTS}&id=${dataObjectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: target.name,
            description: target.description,
            caseid: target.caseid,
            systemOfRecordId: target.systemOfRecordId,
            model: {
              ...(model || {}),
              fields: nextRefs,
            },
          }),
        },
      );
      if (!resp.ok) throw new Error("Failed to update data object");
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [dataObjects, refreshDataObjects, eventName],
  );

  const handleReorderFieldsInDataObject = useCallback(
    async (dataObjectId: number, orderedFieldIds: number[]) => {
      const target = dataObjects.find((d) => d.id === dataObjectId);
      if (!target) return;
      let model: any = {};
      try {
        model =
          typeof target.model === "string"
            ? JSON.parse(target.model)
            : target.model || {};
      } catch {
        model = {};
      }
      const currentRefs: Array<{
        fieldId: number;
        required?: boolean;
        order?: number;
      }> = Array.isArray(model?.fields) ? model.fields : [];
      const refById = new Map(currentRefs.map((r) => [r.fieldId, { ...r }]));
      const nextRefs: Array<{
        fieldId: number;
        required?: boolean;
        order?: number;
      }> = [];
      orderedFieldIds.forEach((fid, index) => {
        const existing = refById.get(fid) || { fieldId: fid };
        nextRefs.push({ ...existing, order: index + 1 });
        refById.delete(fid);
      });
      // append any leftover refs, preserving order
      currentRefs
        .filter((r) => refById.has(r.fieldId))
        .forEach((r) => nextRefs.push({ ...r, order: nextRefs.length + 1 }));

      // Optimistic update to avoid flicker: update local state immediately
      setDataObjects((prev) => {
        return prev.map((d) => {
          if (d.id !== dataObjectId) return d;
          let localModel: any = {};
          try {
            localModel =
              typeof d.model === "string" ? JSON.parse(d.model) : d.model || {};
          } catch {
            localModel = {};
          }
          return {
            ...d,
            model: {
              ...(localModel || {}),
              fields: nextRefs,
            },
          } as any;
        });
      });

      const resp = await fetch(
        `/api/database?table=${DB_TABLES.DATA_OBJECTS}&id=${dataObjectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: target.name,
            description: target.description,
            caseid: target.caseid,
            systemOfRecordId: target.systemOfRecordId,
            model: {
              ...(model || {}),
              fields: nextRefs,
            },
          }),
        },
      );
      if (!resp.ok)
        throw new Error("Failed to update field order in data object");
      // Keep current order; refetch to sync server source of truth in background
      await refreshDataObjects();
      window.dispatchEvent(new CustomEvent(eventName));
    },
    [dataObjects, setDataObjects, refreshDataObjects, eventName],
  );

  return {
    handleAddNewFieldAndAttach,
    handleRemoveFieldFromDataObject,
    handleReorderFieldsInDataObject,
  } as const;
}
