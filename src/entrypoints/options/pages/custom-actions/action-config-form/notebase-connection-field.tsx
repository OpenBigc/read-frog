import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import { Link } from "react-router"
import { i18n } from "@/utils/i18n"
import { withForm } from "./form"
export const NotebaseConnectionField = withForm({
  defaultValues: {} as SelectionToolbarCustomAction,
  props: { variant: "card" as "card" | "tab" | undefined },
  render: function Render() {
    return (
      <Link to="/notes" className="text-sm text-link">
        {i18n.t("localNotes.title" as never)}
      </Link>
    )
  },
})
