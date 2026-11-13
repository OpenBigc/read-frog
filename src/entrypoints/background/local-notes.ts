import {
  createLocalNotes,
  deleteLocalNote,
  importLocalNotes,
  listLocalNotes,
  updateLocalNote,
} from "@/utils/local-notes/database"
import { onMessage } from "@/utils/message"

export function setupLocalNotesHandlers() {
  onMessage("listLocalNotes", () => listLocalNotes())
  onMessage("createLocalNotes", ({ data }) => createLocalNotes(data))
  onMessage("updateLocalNote", ({ data }) => updateLocalNote(data))
  onMessage("deleteLocalNote", ({ data }) => deleteLocalNote(data.id))
  onMessage("importLocalNotes", ({ data }) => importLocalNotes(data))
}
