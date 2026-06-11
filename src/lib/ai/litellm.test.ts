import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createLiteLLMModels } from "./litellm";

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: vi.fn(() =>
    vi.fn((apiName: string) => ({ apiName })),
  ),
}));

describe("createLiteLLMModels", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty object when LITELLM_BASE_URL is not set", () => {
    vi.stubEnv("LITELLM_BASE_URL", "");
    vi.stubEnv("LITELLM_MODELS", "model-a,model-b");

    const result = createLiteLLMModels();
    expect(result).toEqual({});
  });

  it("returns empty object when LITELLM_MODELS is not set", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_MODELS", "");

    const result = createLiteLLMModels();
    expect(result).toEqual({});
  });

  it("creates models from comma-separated LITELLM_MODELS", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_API_KEY", "sk-test");
    vi.stubEnv(
      "LITELLM_MODELS",
      "anthropic/claude-sonnet-4-6,openai/gpt-4o,deepseek-chat",
    );

    const result = createLiteLLMModels();

    expect(result).toHaveProperty("claude-sonnet-4-6");
    expect(result).toHaveProperty("gpt-4o");
    expect(result).toHaveProperty("deepseek-chat");
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("strips provider prefix for display names", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_MODELS", "anthropic/claude-sonnet-4-6");

    const result = createLiteLLMModels();
    expect(result).toHaveProperty("claude-sonnet-4-6");
    expect(result).not.toHaveProperty("anthropic/claude-sonnet-4-6");
  });

  it("handles models without provider prefix", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_MODELS", "deepseek-chat");

    const result = createLiteLLMModels();
    expect(result).toHaveProperty("deepseek-chat");
  });

  it("trims whitespace around model ids", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_MODELS", " model-a , model-b ");

    const result = createLiteLLMModels();
    expect(result).toHaveProperty("model-a");
    expect(result).toHaveProperty("model-b");
  });

  it("appends /v1 to base URL when not present", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_MODELS", "test-model");

    createLiteLLMModels();

    expect(createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:4000/v1",
      }),
    );
  });

  it("does not double-append /v1 when already present", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000/v1");
    vi.stubEnv("LITELLM_MODELS", "test-model");

    createLiteLLMModels();

    expect(createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://localhost:4000/v1",
      }),
    );
  });
});
