import type { LocalNote, NewLocalNote } from "./types"
import { Dexie, type Table } from "dexie"
import { z } from "zod"
import { localNoteSchema, localNotesBackupSchema } from "./types"

const db = new Dexie("ReadFrogLocalNotes", {
  indexedDB: globalThis.indexedDB,
  IDBKeyRange: globalThis.IDBKeyRange,
})
db.version(1).stores({ notes: "id, createdAt, updatedAt, actionId" })
const notes: Table<LocalNote, string> = db.table("notes")
const newNoteSchema = localNoteSchema.omit({ id: true, createdAt: true, updatedAt: true })

export async function listLocalNotes(): Promise<LocalNote[]> {
  return notes.orderBy("createdAt").reverse().toArray()
}

export async function createLocalNotes(input: NewLocalNote[]): Promise<LocalNote[]> {
  const values = z.array(newNoteSchema).min(1).parse(input)
  const now = Date.now()
  const records = values.map((value) => ({
    ...value,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }))
  await notes.bulkAdd(records)
  return records
}

export async function updateLocalNote(
  input: Pick<LocalNote, "id" | "title" | "content">,
): Promise<void> {
  const value = localNoteSchema.pick({ id: true, title: true, content: true }).parse(input)
  const changed = await notes.update(value.id, {
    title: value.title,
    content: value.content,
    updatedAt: Date.now(),
  })
  if (!changed) throw new Error("Note not found")
}

export async function deleteLocalNote(id: string): Promise<void> {
  await notes.delete(z.string().min(1).parse(id))
}

/** Imports are additive; an existing local note is never overwritten by a backup. */
export async function importLocalNotes(input: unknown): Promise<number> {
  const backup = localNotesBackupSchema.parse(input)
  const unique = [...new Map(backup.notes.map((note) => [note.id, note])).values()]
  return db.transaction("rw", notes, async () => {
    const existing = await notes.bulkGet(unique.map((note) => note.id))
    const additions = unique.filter((_, index) => !existing[index])
    await notes.bulkAdd(additions)
    return additions.length
  })
}
