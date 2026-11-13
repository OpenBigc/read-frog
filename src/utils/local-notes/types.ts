import { z } from "zod"

export const localNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  sourceUrl: z.string(),
  actionId: z.string(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
})
export type LocalNote = z.infer<typeof localNoteSchema>
export type NewLocalNote = Pick<LocalNote, "title" | "content" | "sourceUrl" | "actionId">
export const localNotesBackupSchema = z.object({
  version: z.literal(1),
  notes: z.array(localNoteSchema),
})
