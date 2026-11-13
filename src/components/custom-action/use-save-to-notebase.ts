import type { SaveToNotebaseAnalyticsSource } from "./save-to-notebase-dialog-atom"
import type { SurfaceByFeature } from "@/types/analytics"
import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import { useMutation } from "@tanstack/react-query"
import { toastManager } from "@/components/ui/base-ui/toast"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
export type SaveToNotebaseOutcome = "saved" | "dialog_opened" | "failed"
export interface SaveToNotebaseRequest {
  action: SelectionToolbarCustomAction
  results: Array<Record<string, unknown>>
  analyticsSource?: SaveToNotebaseAnalyticsSource
  surface?: SurfaceByFeature["note_save"]
}
export function useSaveToNotebase() {
  const mutation = useMutation({
    mutationFn: async ({ action, results }: SaveToNotebaseRequest) => {
      if (!results.length) throw new Error("No results to save")
      await sendMessage(
        "createLocalNotes",
        results.map((result) => ({
          title: action.name,
          content: action.outputSchema
            .map((field) => {
              const value = result[field.name]
              if (value === undefined) return ""
              return (
                field.name +
                "\n" +
                (typeof value === "string" ? value : JSON.stringify(value, null, 2))
              )
            })
            .filter(Boolean)
            .join("\n\n"),
          sourceUrl: location.href,
          actionId: action.id,
        })),
      )
    },
    onSuccess: () => {
      const id = toastManager.add({
        type: "success",
        title: i18n.t("localNotes.saved" as never),
        actionProps: {
          children: i18n.t("localNotes.title" as never),
          onClick: () => {
            toastManager.close(id)
            void sendMessage("openOptionsPage", { route: "/notes" })
          },
        },
      })
    },
    onError: () => {
      toastManager.add({ type: "error", title: i18n.t("action.saveToNotebaseFailed") })
    },
  })
  return {
    save: async (request: SaveToNotebaseRequest): Promise<SaveToNotebaseOutcome> => {
      try {
        await mutation.mutateAsync(request)
        return "saved"
      } catch {
        return "failed"
      }
    },
    isSaving: mutation.isPending,
  }
}
