"use client";

import { useCallback, useEffect, useState } from "react";
import { Field } from "../../../types/types";
import { DB_COLUMNS, DB_TABLES } from "../../../types/database";
import { fetchWithBaseUrl } from "../../../lib/fetchWithBaseUrl";
import { validateModelIds } from "../utils/validateModelIds";

type DatabaseCase = {
  id: number;
  name: string;
  description: string;
  applicationid?: number;
  model: any;
};

type ComposedModel = {
  name: string;
  description?: string;
  stages: any[];
};

type View = {
  id: number;
  name: string;
  model: any;
  objectid: number;
};

const MODEL_UPDATED_EVENT = "model-updated";

export function useWorkflowData(objectid: string) {
  const [model, setModel] = useState<ComposedModel | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [dataObjectFields, setDataObjectFields] = useState<Field[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [dataObjects, setDataObjects] = useState<
    Array<{
      id: number;
      name: string;
      description: string;
      objectid: number;
      systemOfRecordId: number;
      isEmbedded?: boolean;
      model?: any;
    }>
  >([]);
  const [systemsOfRecord, setSystemsOfRecord] = useState<
    Array<{ id: number; name: string; icon?: string | null }>
  >([]);
  const [selectedCase, setSelectedCase] = useState<DatabaseCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setModelAction = useCallback(
    (updater: (prev: ComposedModel | null) => ComposedModel | null) => {
      setModel(updater);
    },
    [],
  );

  const setSelectedCaseAction = useCallback((next: DatabaseCase) => {
    setSelectedCase(next);
  }, []);

  const fetchCaseData = useCallback(
    async (objectid: string): Promise<ComposedModel> => {
      const caseResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
      );
      if (!caseResponse.ok) {
        throw new Error(`Failed to fetch case: ${caseResponse.status}`);
      }
      const caseData = await caseResponse.json();
      const dbCase: DatabaseCase = caseData.data;

      if (!dbCase) {
        throw new Error("Case not found");
      }

      const parsedModel = dbCase.model || {};
      const stagesWithIds = validateModelIds(parsedModel.stages || []);
      return {
        name: dbCase.name,
        description: dbCase.description,
        stages: stagesWithIds,
      };
    },
    [],
  );

  const fetchCase = useCallback(async () => {
    try {
      const response = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch case: ${response.status}`);
      }
      const data = await response.json();
      setSelectedCase(data.data || null);
    } catch (err) {
      console.error("Error fetching case:", err);
    }
  }, [objectid]);

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const composedModel = await fetchCaseData(objectid);
      setModel(composedModel);

      // Fetch object-level fields
      let caseFields: Field[] = [];
      const fieldsResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.FIELDS}&${DB_COLUMNS.CASE_ID}=${objectid}`,
      );
      if (fieldsResponse.ok) {
        const fieldsResult = await fieldsResponse.json();
        caseFields = fieldsResult.data || [];
      }
      setFields(caseFields);

      // Fetch views for this object
      const viewsResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.VIEWS}&${DB_COLUMNS.CASE_ID}=${objectid}`,
      );
      if (viewsResponse.ok) {
        const viewsData = await viewsResponse.json();
        setViews(viewsData.data);
      }

      // Load Systems of Record (global list)
      const sorResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.SYSTEMS_OF_RECORD}`,
      );
      if (sorResponse.ok) {
        const sorData = await sorResponse.json();
        setSystemsOfRecord(sorData.data || []);
      }

      // Load Data Objects for the same application (hasWorkflow=false)
      try {
        const caseRes = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
        );
        if (caseRes.ok) {
          const caseJson = await caseRes.json();
          const appId: number | undefined = caseJson?.data?.applicationid;
          if (typeof appId === "number") {
            const dataObjRes = await fetchWithBaseUrl(
              `/api/database?table=${DB_TABLES.OBJECTS}&${DB_COLUMNS.APPLICATION_ID}=${appId}&hasWorkflow=false`,
            );
            if (dataObjRes.ok) {
              const listJson = await dataObjRes.json();
              const dataObjs = (listJson?.data as any[]) || [];
              setDataObjects(dataObjs as any);

              const allFields: Field[] = [];
              for (const d of dataObjs) {
                if (typeof d?.id === "number") {
                  try {
                    const dfRes = await fetchWithBaseUrl(
                      `/api/database?table=${DB_TABLES.FIELDS}&${DB_COLUMNS.CASE_ID}=${d.id}`,
                    );
                    if (dfRes.ok) {
                      const dfJson = await dfRes.json();
                      const fieldsForDo: Field[] = dfJson?.data || [];
                      allFields.push(...fieldsForDo);
                    }
                  } catch {}
                }
              }
              setDataObjectFields(allFields);
            } else {
              setDataObjects([] as any);
              setDataObjectFields([]);
            }
          } else {
            setDataObjects([] as any);
            setDataObjectFields([]);
          }
        } else {
          setDataObjects([] as any);
          setDataObjectFields([]);
        }
      } catch {
        setDataObjects([] as any);
        setDataObjectFields([]);
      }

      setError(null);
    } catch (err) {
      console.error("Error loading workflow:", err);
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [objectid, fetchCaseData]);

  const refreshWorkflowData = useCallback(async () => {
    try {
      const caseResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
      );
      if (caseResponse.ok) {
        const caseData = await caseResponse.json();
        setSelectedCase(caseData.data);
      }

      try {
        const composedModel = await fetchCaseData(objectid);
        setModel(composedModel);
      } catch (_err) {
        // Object may have been deleted; skip model refresh silently
      }

      // Refresh case-level fields
      let caseFields: Field[] = [];
      const fieldsResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.FIELDS}&${DB_COLUMNS.CASE_ID}=${objectid}`,
      );
      if (fieldsResponse.ok) {
        const fieldsResult = await fieldsResponse.json();
        caseFields = fieldsResult.data || [];
      }
      setFields(caseFields);

      const viewsResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.VIEWS}&${DB_COLUMNS.CASE_ID}=${objectid}`,
      );
      if (viewsResponse.ok) {
        const viewsData = await viewsResponse.json();
        setViews(viewsData.data);
      }

      // Refresh Systems of Record
      const sorResponse = await fetchWithBaseUrl(
        `/api/database?table=${DB_TABLES.SYSTEMS_OF_RECORD}`,
      );
      if (sorResponse.ok) {
        const sorData = await sorResponse.json();
        setSystemsOfRecord(sorData.data || []);
      }
      // Refresh Data Objects for the same application (hasWorkflow=false)
      try {
        const selected = await fetchWithBaseUrl(
          `/api/database?table=${DB_TABLES.OBJECTS}&id=${objectid}`,
        );
        if (selected.ok) {
          const selJson = await selected.json();
          const appId: number | undefined = selJson?.data?.applicationid;
          if (typeof appId === "number") {
            const dataObjRes = await fetchWithBaseUrl(
              `/api/database?table=${DB_TABLES.OBJECTS}&${DB_COLUMNS.APPLICATION_ID}=${appId}&hasWorkflow=false`,
            );
            if (dataObjRes.ok) {
              const listJson = await dataObjRes.json();
              const dataObjs = (listJson?.data as any[]) || [];
              setDataObjects(dataObjs as any);

              const allFields: Field[] = [];
              for (const d of dataObjs) {
                if (typeof d?.id === "number") {
                  try {
                    const dfRes = await fetchWithBaseUrl(
                      `/api/database?table=${DB_TABLES.FIELDS}&${DB_COLUMNS.CASE_ID}=${d.id}`,
                    );
                    if (dfRes.ok) {
                      const dfJson = await dfRes.json();
                      const fieldsForDo: Field[] = dfJson?.data || [];
                      allFields.push(...fieldsForDo);
                    }
                  } catch {}
                }
              }
              setDataObjectFields(allFields);
            } else {
              setDataObjects([] as any);
              setDataObjectFields([]);
            }
          } else {
            setDataObjects([] as any);
            setDataObjectFields([]);
          }
        } else {
          setDataObjects([] as any);
          setDataObjectFields([]);
        }
      } catch {
        setDataObjects([] as any);
        setDataObjectFields([]);
      }

      // Fire after state commits so listeners (iframe) receive the latest model
      try {
        console.debug(
          "[data] refreshWorkflowData completed; dispatching model-updated via raf",
        );
      } catch {}
      try {
        requestAnimationFrame(() => {
          try {
            console.debug("[data] dispatch model-updated now");
            window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
          } catch {}
        });
      } catch {
        try {
          console.debug("[data] dispatch model-updated (no raf)");
          window.dispatchEvent(new CustomEvent(MODEL_UPDATED_EVENT));
        } catch {}
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/Failed to fetch case: 4\d\d/.test(message)) {
        console.debug(
          "[data] Case missing during refresh (likely deleted); skipping.",
        );
      } else {
        console.error("Error refreshing workflow data:", err);
      }
    }
  }, [objectid, fetchCaseData]);

  useEffect(() => {
    fetchCase();
    void loadWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectid]); // Only depend on objectid to prevent unnecessary re-runs

  return {
    model,
    setModelAction,
    fields,
    setFields,
    dataObjectFields,
    setDataObjectFields,
    views,
    setViews,
    dataObjects,
    setDataObjects,
    systemsOfRecord,
    setSystemsOfRecord,
    selectedCase,
    setSelectedCaseAction,
    loading,
    error,
    loadWorkflow,
    refreshWorkflowData,
    fetchCaseData,
  } as const;
}
