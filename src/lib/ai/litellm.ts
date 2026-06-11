import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import logger from "logger";

function toDisplayName(modelId: string): string {
  return modelId.includes("/") ? modelId.split("/").pop()! : modelId;
}

export function createLiteLLMModels(): Record<string, LanguageModel> {
  const baseUrl = process.env.LITELLM_BASE_URL;
  const apiKey = process.env.LITELLM_API_KEY;
  const modelsEnv = process.env.LITELLM_MODELS;

  if (!baseUrl || !modelsEnv) return {};

  try {
    const sdkBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

    const provider = createOpenAICompatible({
      name: "litellm",
      baseURL: sdkBaseUrl,
      apiKey: apiKey ?? "",
    });

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
