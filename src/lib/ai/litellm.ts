import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import logger from "logger";

interface LiteLLMModelEntry {
  id: string;
  object: string;
}

interface LiteLLMModelsResponse {
  data: LiteLLMModelEntry[];
}

function getBaseUrl(): string | undefined {
  return process.env.LITELLM_BASE_URL;
}

function getSdkBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
}

function toDisplayName(modelId: string): string {
  return modelId.includes("/") ? modelId.split("/").pop()! : modelId;
}

let cachedProvider: ReturnType<typeof createOpenAICompatible> | null = null;
let cachedBaseUrl: string | null = null;

function getOrCreateProvider() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;
  if (cachedProvider && cachedBaseUrl === baseUrl) return cachedProvider;

  cachedBaseUrl = baseUrl;
  cachedProvider = createOpenAICompatible({
    name: "litellm",
    baseURL: getSdkBaseUrl(baseUrl),
    apiKey: process.env.LITELLM_API_KEY ?? "",
  });
  return cachedProvider;
}

export function createLiteLLMModels(): Record<string, LanguageModel> {
  const baseUrl = getBaseUrl();
  const modelsEnv = process.env.LITELLM_MODELS;

  if (!baseUrl || !modelsEnv) return {};

  const provider = getOrCreateProvider();
  if (!provider) return {};

  try {
    const modelIds = modelsEnv
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const models: Record<string, LanguageModel> = {};
    for (const id of modelIds) {
      models[toDisplayName(id)] = provider(id);
    }
    return models;
  } catch (error) {
    logger.error("Failed to create LiteLLM models:", error);
    return {};
  }
}

export function getLiteLLMModel(modelName: string): LanguageModel | null {
  const provider = getOrCreateProvider();
  if (!provider) return null;
  return provider(modelName);
}

export interface LiteLLMModelInfo {
  name: string;
  modelId: string;
}

export async function fetchLiteLLMModelList(): Promise<LiteLLMModelInfo[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const modelsUrl = `${getSdkBaseUrl(baseUrl)}/models`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiKey = process.env.LITELLM_API_KEY;
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(modelsUrl, { headers });
    if (!response.ok) {
      logger.error(
        `LiteLLM /v1/models returned ${response.status}: ${response.statusText}`,
      );
      return [];
    }

    const body = (await response.json()) as LiteLLMModelsResponse;
    return (body.data ?? [])
      .map((m) => m.id)
      .filter(Boolean)
      .map((id) => ({ name: toDisplayName(id), modelId: id }));
  } catch (error) {
    logger.error("Failed to fetch LiteLLM models:", error);
    return [];
  }
}
