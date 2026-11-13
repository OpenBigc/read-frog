import { beforeEach, describe, expect, it, vi } from "vitest"
import { storage } from "#imports"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getLanguageModelForConfig, getModelById } from "../model"
const { deepseek, compatible, languageModel } = vi.hoisted(() => {
  const modelFactory = vi.fn<(id: string) => { id: string }>((id) => ({ id }))
  return {
    languageModel: modelFactory,
    deepseek: vi.fn<() => { languageModel: typeof modelFactory }>(() => ({
      languageModel: modelFactory,
    })),
    compatible: vi.fn<() => { languageModel: typeof modelFactory }>(() => ({
      languageModel: modelFactory,
    })),
  }
})
vi.mock("@ai-sdk/deepseek", () => ({ createDeepSeek: deepseek }))
vi.mock("@ai-sdk/openai-compatible", () => ({ createOpenAICompatible: compatible }))
beforeEach(() => vi.clearAllMocks())
describe("custom model adapters", () => {
  it("uses the custom endpoint, key, model and headers without attribution headers", () => {
    getLanguageModelForConfig({
      ...DEFAULT_PROVIDER_CONFIG["openai-compatible"],
      baseURL: "https://custom.example/v1",
      apiKey: "my-key",
      headers: { "X-Custom": "value" },
      model: { model: "use-custom-model", isCustomModel: true, customModel: "my-model" },
    })
    expect(compatible).toHaveBeenCalledWith({
      name: "openai-compatible",
      baseURL: "https://custom.example/v1",
      apiKey: "my-key",
      headers: { "X-Custom": "value" },
      supportsStructuredOutputs: true,
    })
    expect(languageModel).toHaveBeenCalledWith("my-model")
  })
  it("uses DeepSeek with a custom base URL", () => {
    getLanguageModelForConfig({
      ...DEFAULT_PROVIDER_CONFIG.deepseek,
      apiKey: "deepseek-key",
      baseURL: "https://proxy.example/v1",
    })
    expect(deepseek).toHaveBeenCalledWith({
      baseURL: "https://proxy.example/v1",
      apiKey: "deepseek-key",
      headers: undefined,
    })
    expect(languageModel).toHaveBeenCalledWith(DEFAULT_PROVIDER_CONFIG.deepseek.model.model)
  })
  it("resolves configured providers from local storage", async () => {
    vi.spyOn(storage, "getItem").mockResolvedValue(structuredClone(DEFAULT_CONFIG))
    await getModelById("deepseek-default")
    expect(deepseek).toHaveBeenCalledOnce()
    await expect(getModelById("removed-provider")).rejects.toThrow("not found")
  })
  it("rejects empty custom models and removed adapters", () => {
    expect(() => getLanguageModelForConfig(DEFAULT_PROVIDER_CONFIG["openai-compatible"])).toThrow(
      "Model is undefined",
    )
    expect(() => getLanguageModelForConfig(DEFAULT_PROVIDER_CONFIG.openai)).toThrow(
      "Unsupported provider",
    )
  })
})
