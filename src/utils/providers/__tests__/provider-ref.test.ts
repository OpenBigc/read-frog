import { describe, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import {
  canProviderRefGenerateText,
  resolvePageTranslationProvider,
  serializeProviderRef,
} from "../provider-ref"
const send = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>())
vi.mock("@/utils/message", () => ({ sendMessage: send }))
describe("local provider references", () => {
  it("resolves the selected local provider and serializes its configuration without a cloud request", async () => {
    const provider = resolvePageTranslationProvider(DEFAULT_CONFIG)
    expect(provider.kind).toBe("local")
    expect(await serializeProviderRef(provider, "pageTranslation")).toEqual({
      kind: "local",
      config: DEFAULT_PROVIDER_CONFIG.deepseek,
    })
    expect(send).not.toHaveBeenCalled()
  })
  it("rejects official provider references even if a caller retained an old snapshot", async () => {
    await expect(
      serializeProviderRef(
        { kind: "system", id: "read-frog-free-ai", name: "Built-in AI", modelTier: "normal" },
        "pageTranslation",
      ),
    ).rejects.toThrow("removed")
    expect(send).not.toHaveBeenCalled()
  })
  it("recognizes a custom model as promptable", () => {
    expect(
      canProviderRefGenerateText({ kind: "local", config: DEFAULT_PROVIDER_CONFIG.deepseek }),
    ).toBe(true)
  })
})
