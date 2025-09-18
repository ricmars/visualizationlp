export type AvailableModel = {
  id: string; // deployment or model identifier
  label: string; // human-friendly label
  provider: "azure-openai"; // future-proofing if more providers added
  multimodal: boolean;
};

// Centralized list of models available in the UI. Modify here to add/remove.
export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "azure-openai",
    multimodal: true,
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    provider: "azure-openai",
    multimodal: true,
  },
];

export function getDefaultModelId(): string {
  // Prefer env override for backwards-compat with existing deployments
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.AZURE_OPENAI_DEPLOYMENT
  ) {
    return process.env.AZURE_OPENAI_DEPLOYMENT as string;
  }
  return AVAILABLE_MODELS[0].id;
}

export function getModelLabelById(id: string): string {
  const m = AVAILABLE_MODELS.find((x) => x.id === id);
  return m ? m.label : id;
}
