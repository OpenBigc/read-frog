// @vitest-environment jsdom
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createDefaultDictionaryAction } from "@/utils/constants/config"
import { SaveToNotebaseButton } from "../save-to-notebase-button"
const { send, toast } = vi.hoisted(() => ({
  send: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  toast: vi.fn<(...args: unknown[]) => string>(() => "toast"),
}))
vi.mock("@/utils/message", () => ({ sendMessage: send }))
vi.mock("@/components/ui/base-ui/toast", () => ({
  toastManager: { add: toast, close: vi.fn<() => void>() },
}))
const action = createDefaultDictionaryAction()
const result = { [action.outputSchema[0]!.name]: "hello" }
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}
beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue([])
  toast.mockClear()
})
describe("save to local notes", () => {
  it("saves directly without login or cloud mapping", async () => {
    render(
      <SaveToNotebaseButton
        action={action}
        result={result}
        failed={false}
        isRunning={false}
        surface="selection_toolbar"
      />,
      { wrapper: Wrapper },
    )
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("createLocalNotes", [
        expect.objectContaining({
          actionId: action.id,
          content: expect.stringContaining("hello"),
          sourceUrl: location.href,
        }),
      ]),
    )
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "success" })),
    )
  })
  it.each([
    { failed: true, isRunning: false, result },
    { failed: false, isRunning: true, result },
    { failed: false, isRunning: false, result: null },
  ])("does not save incomplete results (%j)", (props) => {
    render(<SaveToNotebaseButton action={action} {...props} surface="selection_toolbar" />, {
      wrapper: Wrapper,
    })
    expect(screen.getByRole("button")).toBeDisabled()
    expect(send).not.toHaveBeenCalled()
  })
  it("reports a storage error and allows retry", async () => {
    send.mockRejectedValueOnce(new Error("storage failed"))
    render(
      <SaveToNotebaseButton
        action={action}
        result={result}
        failed={false}
        isRunning={false}
        surface="video_subtitles"
      />,
      { wrapper: Wrapper },
    )
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" })),
    )
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled())
  })
})
