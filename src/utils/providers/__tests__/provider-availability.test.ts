import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { getUsableProviderIdsForCapability } from "../provider-availability"
describe("local provider availability", () => {
  it("never offers an official fallback when no custom provider exists", () => {
    expect(getUsableProviderIdsForCapability("pageTranslation", [], undefined)).toEqual([])
  })
  it("offers the configured local APIs without querying account status", () => {
    expect(
      getUsableProviderIdsForCapability(
        "pageTranslation",
        DEFAULT_CONFIG.providersConfig,
        undefined,
      ),
    ).toEqual(["openai-compatible-default", "deepseek-default"])
  })
  it("filters disabled and removed providers", () => {
    expect(
      getUsableProviderIdsForCapability(
        "videoSubtitles",
        [{ ...DEFAULT_PROVIDER_CONFIG.deepseek, enabled: false }, DEFAULT_PROVIDER_CONFIG.openai],
        undefined,
      ),
    ).toEqual([])
  })
})
