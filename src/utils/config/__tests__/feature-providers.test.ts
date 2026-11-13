import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getSelectableProvidersForCapability } from "@/utils/providers/provider-registry"
import {
  computeLanguageDetectionFallbackAfterDeletion,
  computeProviderFallbacksAfterDeletion,
  findFeatureMissingProvider,
  resolveLanguageDetectionConfigForModeChange,
} from "../helpers"
const custom = DEFAULT_PROVIDER_CONFIG["openai-compatible"]
const deepseek = DEFAULT_PROVIDER_CONFIG.deepseek
describe("local feature assignments", () => {
  it("builds nested assignment patches", () => {
    expect(
      buildFeatureProviderPatch({ pageTranslation: custom.id, selectionTranslation: deepseek.id }),
    ).toEqual({
      pageTranslation: { providerId: custom.id },
      selectionToolbar: { features: { translate: { providerId: deepseek.id } } },
    })
  })
  it("offers only enabled supported providers", () => {
    expect(
      getSelectableProvidersForCapability("videoSubtitles", [
        deepseek,
        { ...custom, enabled: false },
        DEFAULT_PROVIDER_CONFIG.openai,
      ]),
    ).toEqual([deepseek])
  })
  it("enables language detection with a custom API and refuses without one", () => {
    expect(
      resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [deepseek]),
    ).toEqual({ mode: "llm", providerId: deepseek.id })
    expect(resolveLanguageDetectionConfigForModeChange({ mode: "basic" }, "llm", [])).toBeNull()
  })
  it("detects a missing provider instead of falling back to official AI", () => {
    expect(findFeatureMissingProvider([], DEFAULT_CONFIG)).toBe("pageTranslation")
    expect(findFeatureMissingProvider([custom], DEFAULT_CONFIG)).toBeNull()
  })
  it("reassigns features to the remaining custom provider after deletion", () => {
    const patch = computeProviderFallbacksAfterDeletion(deepseek.id, DEFAULT_CONFIG, [custom])
    expect(patch).toMatchObject({
      pageTranslation: custom.id,
      videoSubtitles: custom.id,
      noteSuggestion: custom.id,
    })
  })
  it("reassigns language detection after deleting its provider", () => {
    const config = {
      ...DEFAULT_CONFIG,
      languageDetection: { mode: "llm" as const, providerId: deepseek.id },
    }
    expect(computeLanguageDetectionFallbackAfterDeletion(deepseek.id, config, [custom])).toBe(
      custom.id,
    )
    expect(computeLanguageDetectionFallbackAfterDeletion(deepseek.id, config, [])).toBeUndefined()
  })
})
