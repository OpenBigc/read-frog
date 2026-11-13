import { describe, expect, it, vi } from "vitest"
import { browser } from "#imports"
import { createPortStreamPromise, STREAM_PORT_DISCONNECTED_MESSAGE } from "./port-streaming"

describe("stream port disconnection", () => {
  it.each([undefined, "Could not establish connection. Receiving end does not exist."])(
    "consumes runtime errors synchronously and rejects: %s",
    async (message) => {
      let onDisconnect: (() => void) | undefined
      const removeListener = vi.fn<(...args: any[]) => void>()
      const disconnect = vi.fn<() => void>()
      vi.spyOn(browser.runtime, "connect").mockReturnValue({
        onMessage: { addListener: vi.fn<(...args: any[]) => void>(), removeListener },
        onDisconnect: {
          addListener: (listener: () => void) => {
            onDisconnect = listener
          },
          removeListener,
        },
        postMessage: vi.fn<(...args: any[]) => void>(),
        disconnect,
      } as never)
      const lastError = vi.spyOn(browser.runtime, "lastError", "get")
      const result = createPortStreamPromise("stream-text", {}, { keepAliveIntervalMs: 0 })
      lastError.mockReturnValue(message ? { message } : undefined)
      onDisconnect?.()
      expect(lastError).toHaveBeenCalled()
      lastError.mockReturnValue(undefined)
      await expect(result).rejects.toThrow(message || STREAM_PORT_DISCONNECTED_MESSAGE)
      expect(removeListener).toHaveBeenCalledTimes(2)
      expect(disconnect).toHaveBeenCalledOnce()
    },
  )
})
