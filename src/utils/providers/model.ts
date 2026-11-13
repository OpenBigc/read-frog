import type { Config } from "@/types/config/config"
import type { LLMProviderConfig } from "@/types/config/provider"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { storage } from "#imports"
import { getLLMProvidersConfig, getProviderConfigById } from "../config/helpers"
import { CONFIG_STORAGE_KEY } from "../constants/config"
import { getProviderHeadersWithOverride } from "./headers"
import { resolveModelId } from "./model-id"
import { ProviderSetupError } from "./provider-setup-error"

export function getLanguageModelForConfig(config: LLMProviderConfig) {
  const modelId = resolveModelId(config.model)
  if (!modelId) throw new ProviderSetupError("Model is undefined")
  if (config.provider !== "deepseek" && config.provider !== "openai-compatible")
    throw new ProviderSetupError("Unsupported provider")
  const headers = getProviderHeadersWithOverride(config.provider, config.headers)
  const settings = { apiKey: config.apiKey, baseURL: config.baseURL, headers }
  if (config.provider === "deepseek") return createDeepSeek(settings).languageModel(modelId)
  if (config.provider === "openai-compatible") {
    return createOpenAICompatible({
      ...settings,
      name: "openai-compatible",
      baseURL: config.baseURL,
      supportsStructuredOutputs: true,
    }).languageModel(modelId)
  }
  throw new ProviderSetupError("Unsupported provider")
}

export async function getModelById(providerId: string) {
  const config = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  if (!config) throw new ProviderSetupError("Config not found")
  const provider = getProviderConfigById(getLLMProvidersConfig(config.providersConfig), providerId)
  if (!provider) throw new ProviderSetupError(`Provider ${providerId} not found`)
  return getLanguageModelForConfig(provider)
}
