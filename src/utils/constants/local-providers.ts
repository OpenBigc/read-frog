/** Providers supported by this local edition. Legacy schemas remain readable for upgrades. */
export const LOCAL_PROVIDER_TYPES = ["openai-compatible", "deepseek"] as const

export function isLocalProviderType(provider: string): boolean {
  return LOCAL_PROVIDER_TYPES.some((type) => type === provider)
}
