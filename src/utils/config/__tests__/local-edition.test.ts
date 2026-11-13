import { describe, expect, it } from "vitest"
import { configSchema } from "@/types/config/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getLanguageModelForConfig } from "@/utils/providers/model"
import {
  getSystemProviderIdsForCapability,
  resolveProviderRefForCapability,
} from "@/utils/providers/provider-registry"
import { normalizeLocalEditionConfig } from "../local-edition"

describe("local edition providers", () => {
  it("ships valid defaults with only custom OpenAI-compatible and DeepSeek providers", () => {
    const config = configSchema.parse(DEFAULT_CONFIG)
    expect(config.providersConfig.map((provider) => provider.provider)).toEqual([
      "openai-compatible",
      "deepseek",
    ])
    expect(config.pageTranslation.providerId).toBe("deepseek-default")
    expect(config.selectionToolbar.builtInActions.dictionary.providerId).toBe("deepseek-default")
    expect(getSystemProviderIdsForCapability("videoSubtitles")).toEqual([])
    expect(
      resolveProviderRefForCapability(
        "pageTranslation",
        config.providersConfig,
        "read-frog-free-ai",
      ),
    ).toBeNull()
  })

  it("preserves custom credentials, models and prompts while replacing removed references", () => {
    const old = structuredClone(DEFAULT_CONFIG)
    const custom = {
      ...DEFAULT_PROVIDER_CONFIG["openai-compatible"],
      apiKey: "test-secret",
      baseURL: "https://my-api.example/v1",
      model: {
        model: "use-custom-model" as const,
        isCustomModel: true as const,
        customModel: "my-model",
      },
    }
    old.providersConfig = [DEFAULT_PROVIDER_CONFIG.openai, custom]
    old.pageTranslation.providerId = "openai-default"
    old.videoSubtitles.providerId = "read-frog-free-ai"
    old.selectionToolbar.builtInActions.dictionary.providerId = "read-frog-advance-ai"
    old.inputTranslation.providerId = "openai-default"
    old.selectionToolbar.features.translate.providerId = "openai-default"
    old.selectionToolbar.noteSuggestion.providerId = "openai-default"
    old.selectionToolbar.builtInActions.sentenceAnalysis.providerId = "read-frog-free-ai"
    old.selectionToolbar.builtInActions.improveWriting.providerId = "read-frog-advance-ai"
    old.languageDetection = { mode: "llm", providerId: "openai-default" }
    const snapshot = structuredClone(old)
    const updated = configSchema.parse(old)
    expect(updated.providersConfig).toEqual([custom])
    expect(updated.pageTranslation.providerId).toBe(custom.id)
    expect(updated.videoSubtitles.providerId).toBe(custom.id)
    expect(updated.languageDetection.providerId).toBe(custom.id)
    expect(updated.selectionToolbar.builtInActions.dictionary.providerId).toBe(custom.id)
    expect(updated.pageTranslation.customPromptsConfig).toEqual(
      old.pageTranslation.customPromptsConfig,
    )
    expect(old).toEqual(snapshot)
    expect(normalizeLocalEditionConfig(updated)).toEqual(updated)
  })

  it("recovers a profile containing only removed providers", () => {
    const old = structuredClone(DEFAULT_CONFIG)
    old.providersConfig = [DEFAULT_PROVIDER_CONFIG["microsoft-translate"]]
    const updated = configSchema.parse(old)
    expect(updated.providersConfig).toHaveLength(1)
    expect(updated.providersConfig[0]?.provider).toBe("deepseek")
  })

  it("rejects legacy provider configurations at the execution boundary", () => {
    expect(() => getLanguageModelForConfig(DEFAULT_PROVIDER_CONFIG.openai)).toThrow(
      "Unsupported provider",
    )
  })

  it("fills missing action state with the remaining custom provider while preserving the off default", () => {
    const old = structuredClone(DEFAULT_CONFIG) as any
    old.providersConfig = [DEFAULT_PROVIDER_CONFIG["openai-compatible"]]
    old.selectionToolbar.builtInActions.dictionary.providerId = "openai-compatible-default"
    delete old.selectionToolbar.builtInActions.sentenceAnalysis
    delete old.selectionToolbar.builtInActions.improveWriting
    for (const key of ["pageTranslation", "inputTranslation", "videoSubtitles"])
      old[key].providerId = "openai-compatible-default"
    old.selectionToolbar.features.translate.providerId = "openai-compatible-default"
    old.selectionToolbar.noteSuggestion.providerId = "openai-compatible-default"
    const updated = configSchema.parse(old)
    expect(updated.selectionToolbar.builtInActions.improveWriting).toMatchObject({
      enabled: false,
      providerId: "openai-compatible-default",
    })
    expect(updated.selectionToolbar.builtInActions.sentenceAnalysis).toMatchObject({
      enabled: true,
      providerId: "openai-compatible-default",
    })
  })
})
