import { fetchWithBaseUrl } from "../lib/fetchWithBaseUrl";

// Cache for object names to avoid repeated API calls
const objectNameCache = new Map<number, string>();

/**
 * Get the name of an object by its ID
 * @param objectId - The ID of the object
 * @returns Promise<string> - The name of the object
 */
export async function getObjectName(objectId: number): Promise<string> {
  // Check cache first
  if (objectNameCache.has(objectId)) {
    return objectNameCache.get(objectId)!;
  }

  try {
    const response = await fetchWithBaseUrl(
      `/api/database?table=Objects&id=${objectId}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch object: ${response.status}`);
    }

    const data = await response.json();
    const objectName = data.data?.name || `Object ${objectId}`;

    // Cache the result
    objectNameCache.set(objectId, objectName);

    return objectName;
  } catch (error) {
    console.error(`Error fetching object name for ID ${objectId}:`, error);
    return `Object ${objectId}`;
  }
}

/**
 * Check if a field type is a reference type
 * @param fieldType - The field type to check
 * @returns boolean - True if the field type is a reference type
 */
export function isReferenceFieldType(fieldType: string): boolean {
  return [
    "DataReferenceSingle",
    "DataReferenceMulti",
    "CaseReferenceSingle",
    "CaseReferenceMulti",
    "EmbedDataSingle",
    "EmbedDataMulti",
  ].includes(fieldType);
}
