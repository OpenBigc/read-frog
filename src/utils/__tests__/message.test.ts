import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { browser } from "#imports"
import { onMessage, sendMessage } from "../message"

describe("extension messaging", () => {
  beforeEach(() => {
    fakeBrowser.reset()
  })

  it("round-trips async responses through the callback-based browser API", async () => {
    const removeListener = onMessage("getInitialConfig", async () => null)

    try {
      await expect(sendMessage("getInitialConfig", undefined)).resolves.toBeNull()
    } finally {
      removeListener()
    }
  })

  it.each([42, { tabId: 42, frameId: 3 }])(
    "handles a missing tab receiver for %j inside the callback",
    async (target) => {
      const lastError = vi.spyOn(browser.runtime, "lastError", "get")
      vi.spyOn(browser.tabs, "sendMessage").mockImplementation((...args: any[]) => {
        lastError.mockReturnValue({
          message: "Could not establish connection. Receiving end does not exist.",
        })
        try {
          args.at(-1)(undefined)
          expect(lastError).toHaveBeenCalled()
        } finally {
          lastError.mockReturnValue(undefined)
        }
      })

      await expect(sendMessage("refreshDetectedPageLanguage", undefined, target)).rejects.toThrow(
        "Could not establish connection. Receiving end does not exist.",
      )
    },
  )
})
