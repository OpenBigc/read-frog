import { indexedDB, IDBKeyRange } from "fake-indexeddb"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.stubGlobal("indexedDB", indexedDB)
vi.stubGlobal("IDBKeyRange", IDBKeyRange)
const { createLocalNotes, deleteLocalNote, importLocalNotes, listLocalNotes, updateLocalNote } =
  await import("./database")

afterAll(() => vi.unstubAllGlobals())

const input = {
  title: "词典",
  content: "word\n释义",
  sourceUrl: "https://example.com/article",
  actionId: "dictionary",
}

beforeEach(async () => {
  for (const note of await listLocalNotes()) await deleteLocalNote(note.id)
})

describe("local notes IndexedDB", () => {
  it("persists, edits and deletes notes without an account or network", async () => {
    await createLocalNotes([input])
    const [saved] = await listLocalNotes()
    expect(saved).toMatchObject(input)
    expect(saved!.createdAt).toBeGreaterThan(0)
    await updateLocalNote({ id: saved!.id, title: "Edited", content: "New content" })
    expect((await listLocalNotes())[0]).toMatchObject({
      ...input,
      title: "Edited",
      content: "New content",
      createdAt: saved!.createdAt,
    })
    await deleteLocalNote(saved!.id)
    expect(await listLocalNotes()).toEqual([])
  })

  it("does not lose concurrent saves from different pages", async () => {
    await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        createLocalNotes([{ ...input, content: String(index) }]),
      ),
    )
    const saved = await listLocalNotes()
    expect(saved).toHaveLength(30)
    expect(new Set(saved.map((note) => note.id)).size).toBe(30)
  })

  it("imports backups additively without overwriting edited notes or duplicating IDs", async () => {
    await createLocalNotes([input])
    const [original] = await listLocalNotes()
    await updateLocalNote({ id: original!.id, title: "Local edit", content: "Keep this" })
    const imported = { ...original!, id: "imported-note" }
    expect(await importLocalNotes({ version: 1, notes: [original, imported, imported] })).toBe(1)
    expect((await listLocalNotes()).find((note) => note.id === original!.id)?.content).toBe(
      "Keep this",
    )
    expect(await importLocalNotes({ version: 1, notes: [original, imported] })).toBe(0)
  })

  it("rejects invalid backups without partial writes", async () => {
    await createLocalNotes([input])
    const before = await listLocalNotes()
    await expect(
      importLocalNotes({ version: 1, notes: [{ ...before[0], id: "new-id" }, { id: "broken" }] }),
    ).rejects.toThrow(/./)
    await expect(importLocalNotes({ version: 2, notes: [] })).rejects.toThrow(/./)
    expect(await listLocalNotes()).toEqual(before)
    await expect(updateLocalNote({ id: "missing", title: "x", content: "y" })).rejects.toThrow(
      "Note not found",
    )
  })
})
