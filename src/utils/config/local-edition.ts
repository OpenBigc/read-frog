import { isLocalProviderType } from "../constants/local-providers"

/** Normalize legacy provider references before validation without touching prompts or keys. */
export function normalizeLocalEditionConfig(value: unknown): unknown {
  if (!value || typeof value !== "object" || !("providersConfig" in value)) return value
  const config = structuredClone(value) as Record<string, any>
  if (!Array.isArray(config.providersConfig)) return value
  const removedIds = new Set(
    config.providersConfig
      .filter((provider: any) => provider && !isLocalProviderType(provider.provider))
      .map((provider: any) => provider.id),
  )
  config.providersConfig = config.providersConfig.filter(
    (provider: any) => provider && isLocalProviderType(provider.provider),
  )
  if (removedIds.size > 0 && !config.providersConfig.some((provider: any) => provider.enabled)) {
    let fallbackId = "deepseek-default"
    while (config.providersConfig.some((provider: any) => provider.id === fallbackId))
      fallbackId += "-local"
    config.providersConfig.push({
      id: fallbackId,
      name: "DeepSeek",
      enabled: true,
      provider: "deepseek",
      model: { model: "deepseek-v4-flash", isCustomModel: false, customModel: null },
    })
  }
  const fallback = config.providersConfig.find((provider: any) => provider.enabled)?.id
  const reassign = (item: any) => {
    if (
      item &&
      fallback &&
      (removedIds.has(item.providerId) ||
        ["read-frog-free-ai", "read-frog-advance-ai"].includes(item.providerId))
    )
      item.providerId = fallback
  }
  for (const key of ["pageTranslation", "inputTranslation", "videoSubtitles"]) reassign(config[key])
  if (config.languageDetection?.mode === "llm") reassign(config.languageDetection)
  const toolbar = config.selectionToolbar
  if (toolbar) {
    reassign(toolbar.features?.translate)
    reassign(toolbar.noteSuggestion)
    for (const key of ["sentenceAnalysis", "improveWriting"]) {
      if (toolbar.builtInActions && !toolbar.builtInActions[key] && fallback)
        toolbar.builtInActions[key] = { enabled: key === "sentenceAnalysis", providerId: fallback }
    }
    Object.values(toolbar.builtInActions ?? {}).forEach(reassign)
    ;(toolbar.customActions ?? []).forEach(reassign)
  }
  return config
}
