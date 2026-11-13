import { describe, expect, it } from "vitest"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { useHostedAiProviderOptions } from "../use-hosted-ai-provider-options"
describe("local provider options", () => {
  it("never offers official providers, regardless of hosted status", () => {
    const local = DEFAULT_PROVIDER_CONFIG.deepseek
    expect(
      useHostedAiProviderOptions("pageTranslation", [
        local,
        { kind: "system", id: "read-frog-free-ai", name: "Built-in AI", logo: () => "" },
      ]),
    ).toEqual([local])
  })
})
