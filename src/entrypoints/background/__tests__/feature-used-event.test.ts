import type { FeatureUsedEventProperties } from "@/types/analytics"
import { beforeEach, describe, expect, it, vi } from "vitest"

type Handler = (message: {
  data: FeatureUsedEventProperties
  sender?: { tab?: { id?: number; url?: string } }
}) => Promise<unknown>

const handlers = new Map<string, Handler>()
const recordFeatureActiveDayMock = vi.fn<() => Promise<void>>()
const captureMock =
  vi.fn<
    (properties: FeatureUsedEventProperties, tab?: { id?: number; url?: string }) => Promise<void>
  >()

vi.mock("@/utils/message", () => ({
  onMessage: (key: string, handler: Handler) => {
    handlers.set(key, handler)
  },
}))

vi.mock("@/utils/feature-active-days", () => ({
  recordFeatureActiveDay: () => recordFeatureActiveDayMock(),
}))

vi.mock("../analytics", () => ({
  captureFeatureUsedEventInBackground: (
    properties: FeatureUsedEventProperties,
    tab?: { id?: number; url?: string },
  ) => captureMock(properties, tab),
}))

const { setupFeatureUsedEventHandlers } = await import("../feature-used-event")

const BASE_EVENT = {
  feature: "page_translation",
  surface: "popup",
  latency_ms: 100,
  provider: "openai",
  backend_kind: "llm",
  target_language: "cmn",
  translation_mode: "bilingual",
} as const

function send(outcome: "success" | "failure", tabUrl?: string): Promise<unknown> {
  const handler = handlers.get("trackFeatureUsedEvent")
  if (!handler) throw new Error("trackFeatureUsedEvent handler was never registered")
  return handler({
    data: { ...BASE_EVENT, outcome },
    sender: tabUrl === undefined ? undefined : { tab: { id: 42, url: tabUrl } },
  })
}

describe("setupFeatureUsedEventHandlers", () => {
  beforeEach(() => {
    handlers.clear()
    recordFeatureActiveDayMock.mockReset().mockResolvedValue(undefined)
    captureMock.mockReset().mockResolvedValue(undefined)
    setupFeatureUsedEventHandlers()
  })

  it("counts an active day for a successful feature use", async () => {
    await send("success")
    expect(recordFeatureActiveDayMock).toHaveBeenCalledTimes(1)
  })

  it("does not count an active day for a failed feature use", async () => {
    await send("failure")
    expect(recordFeatureActiveDayMock).not.toHaveBeenCalled()
  })

  it("does not count an active day for a note save request, which only records the click", async () => {
    const handler = handlers.get("trackFeatureUsedEvent")
    await handler?.({
      data: {
        feature: "note_save",
        surface: "selection_toolbar",
        latency_ms: 0,
        provider: "unknown",
        backend_kind: "unknown",
        action_id: "save_requested",
        save_source: "custom_action",
        note_count: 1,
        outcome: "success",
      },
    })

    expect(recordFeatureActiveDayMock).not.toHaveBeenCalled()
    expect(captureMock).not.toHaveBeenCalled()
  })

  it("does not report page or account data to official analytics", async () => {
    await send("success", "https://example.com/private")
    await send("failure")
    expect(captureMock).not.toHaveBeenCalled()
  })
})
