import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createLiteLLMModels,
  getLiteLLMModel,
  fetchLiteLLMModelList,
} from "./litellm";

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

describe("getLiteLLMModel", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when LITELLM_BASE_URL is not set", () => {
    vi.stubEnv("LITELLM_BASE_URL", "");
    expect(getLiteLLMModel("test")).toBeNull();
  });

  it("creates model on the fly when configured", () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    const model = getLiteLLMModel("anthropic/claude-sonnet-4-6");
    expect(model).toBeTruthy();
    expect((model as any).apiName).toBe("anthropic/claude-sonnet-4-6");
  });
});

describe("fetchLiteLLMModelList", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns empty array when LITELLM_BASE_URL is not set", async () => {
    vi.stubEnv("LITELLM_BASE_URL", "");
    const result = await fetchLiteLLMModelList();
    expect(result).toEqual([]);
  });

  it("parses /v1/models response correctly", async () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");
    vi.stubEnv("LITELLM_API_KEY", "sk-test");

    const mockResponse = {
      data: [
        { id: "anthropic/claude-sonnet-4-6", object: "model" },
        { id: "gpt-4o", object: "model" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchLiteLLMModelList();

    expect(result).toEqual([
      { name: "claude-sonnet-4-6", modelId: "anthropic/claude-sonnet-4-6" },
      { name: "gpt-4o", modelId: "gpt-4o" },
    ]);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
  });

  it("returns empty array on fetch error", async () => {
    vi.stubEnv("LITELLM_BASE_URL", "http://localhost:4000");

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await fetchLiteLLMModelList();
    expect(result).toEqual([]);
  });
});
