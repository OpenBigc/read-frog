import type { LocalNote } from "@/utils/local-notes/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/base-ui/button"
import { toastManager } from "@/components/ui/base-ui/toast"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import { PageLayout } from "../../components/page-layout"

const t = (key: string) => i18n.t(`localNotes.${key}` as never)
const queryKey = ["local-notes"]
const inputClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm"

function safeSourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

export function LocalNotesPage() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey,
    queryFn: async () => await sendMessage("listLocalNotes"),
    refetchOnWindowFocus: "always",
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const notes = query.data ?? []
  const selected = notes.find((note) => note.id === selectedId)
  const visible = notes.filter((note) =>
    `${note.title}\n${note.content}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  )
  const refresh = () => client.invalidateQueries({ queryKey })
  const canLeave = () => {
    if (!dirty) return true
    if (!window.confirm(t("discard"))) return false
    if (selectedId) localStorage.removeItem(`local-note-draft:${selectedId}`)
    return true
  }
  const reportError = () => {
    toastManager.add({ type: "error", title: t("failed") })
  }

  async function create() {
    if (!canLeave()) return
    setBusy(true)
    try {
      const created = await sendMessage("createLocalNotes", [
        { title: t("untitled"), content: "", sourceUrl: "", actionId: "manual" },
      ])
      await refresh()
      setDirty(false)
      setSearch("")
      setSelectedId(created[0]?.id ?? null)
    } catch {
      reportError()
    } finally {
      setBusy(false)
    }
  }

  async function exportNotes() {
    setBusy(true)
    try {
      const current = await sendMessage("listLocalNotes")
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ version: 1, notes: current }, null, 2)], {
          type: "application/json",
        }),
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `read-frog-notes-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      reportError()
    } finally {
      setBusy(false)
    }
  }

  async function importNotes(file: File) {
    setBusy(true)
    try {
      await sendMessage("importLocalNotes", JSON.parse(await file.text()))
      await refresh()
      toastManager.add({ type: "success", title: t("imported") })
    } catch {
      reportError()
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageLayout title={t("title")} innerClassName="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} max-w-sm`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t("search")}
          placeholder={t("search")}
        />
        <Button size="sm" onClick={() => void create()} disabled={busy}>
          {t("new")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          {t("import")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void exportNotes()} disabled={busy}>
          {t("export")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) void importNotes(file)
          }}
        />
      </div>
      {query.isPending ? (
        <p>{t("loading")}</p>
      ) : query.isError ? (
        <Button variant="outline" onClick={() => void query.refetch()}>
          {t("retry")}
        </Button>
      ) : (
        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
            {visible.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
            {visible.map((note) => (
              <button
                key={note.id}
                type="button"
                disabled={busy}
                aria-pressed={selectedId === note.id}
                className={`rounded-lg border p-3 text-left ${selectedId === note.id ? "border-accent bg-accent/10" : "hover:bg-muted"}`}
                onClick={() => {
                  if (selectedId !== note.id && canLeave()) {
                    setDirty(false)
                    setSelectedId(note.id)
                  }
                }}
              >
                <span className="block truncate text-sm font-medium">
                  {note.title || t("untitled")}
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleString()}
                </time>
              </button>
            ))}
          </div>
          {selected && (
            <NoteEditor
              key={selected.id}
              note={selected}
              busy={busy}
              setBusy={setBusy}
              setDirty={setDirty}
              refresh={refresh}
              onDelete={() => {
                setSelectedId(null)
                setDirty(false)
              }}
            />
          )}
        </div>
      )}
    </PageLayout>
  )
}

function NoteEditor({
  note,
  busy,
  setBusy,
  setDirty,
  refresh,
  onDelete,
}: {
  note: LocalNote
  busy: boolean
  setBusy: (value: boolean) => void
  setDirty: (value: boolean) => void
  refresh: () => Promise<unknown>
  onDelete: () => void
}) {
  const draftKey = `local-note-draft:${note.id}`
  const [draft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null")
      return saved && typeof saved.title === "string" && typeof saved.content === "string"
        ? (saved as { title: string; content: string })
        : null
    } catch {
      return null
    }
  })
  const [title, setTitle] = useState(draft?.title ?? note.title)
  const [content, setContent] = useState(draft?.content ?? note.content)
  function persistDraft(nextTitle: string, nextContent: string) {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title: nextTitle, content: nextContent }))
    } catch {
      toastManager.add({ type: "error", title: t("failed") })
    }
    setDirty(true)
  }
  const sourceUrl = safeSourceUrl(note.sourceUrl)
  async function save() {
    setBusy(true)
    try {
      await sendMessage("updateLocalNote", { id: note.id, title, content })
      localStorage.removeItem(draftKey)
      setDirty(false)
      await refresh()
      toastManager.add({ type: "success", title: t("saved") })
    } catch {
      toastManager.add({ type: "error", title: t("failed") })
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!window.confirm(t("confirmDelete"))) return
    setBusy(true)
    try {
      await sendMessage("deleteLocalNote", { id: note.id })
      localStorage.removeItem(draftKey)
      onDelete()
      await refresh()
    } catch {
      toastManager.add({ type: "error", title: t("failed") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input
        className={inputClass}
        value={title}
        disabled={busy}
        aria-label={t("noteTitle")}
        onChange={(event) => {
          setTitle(event.target.value)
          persistDraft(event.target.value, content)
        }}
      />
      <textarea
        className={`${inputClass} min-h-80 resize-y`}
        disabled={busy}
        value={content}
        aria-label={t("content")}
        onChange={(event) => {
          setContent(event.target.value)
          persistDraft(title, event.target.value)
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => void save()}>
          {t("save")}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void remove()}>
          {t("delete")}
        </Button>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto truncate text-sm text-link"
          >
            {t("source")}
          </a>
        )}
      </div>
    </div>
  )
}
