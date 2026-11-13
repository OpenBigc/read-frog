import { describe, expect, it } from "vitest"
import { getForcedProviderHeaders, getProviderHeadersWithOverride } from "../headers"
describe("local provider headers", () => {
  it.each(["deepseek", "openai-compatible"] as const)(
    "uses only user headers for %s",
    (provider) => {
      expect(getForcedProviderHeaders(provider)).toBeUndefined()
      expect(getProviderHeadersWithOverride(provider)).toBeUndefined()
      expect(
        getProviderHeadersWithOverride(provider, { "X-Test": "1", empty: "", count: 1 }),
      ).toEqual({ "X-Test": "1" })
      expect(
        getProviderHeadersWithOverride(provider, { "HTTP-Referer": "https://my-app.example" }),
      ).toEqual({ "HTTP-Referer": "https://my-app.example" })
    },
  )
})
