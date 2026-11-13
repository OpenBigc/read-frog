// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { createDefaultDictionaryAction } from "@/utils/constants/config"
import { useAppForm } from "../form"
import { NotebaseConnectionField } from "../notebase-connection-field"
function Harness() {
  const form = useAppForm({ defaultValues: createDefaultDictionaryAction() })
  return <NotebaseConnectionField form={form} variant="tab" />
}
describe("local notes settings", () => {
  it("links to local notes without account selection or remote mappings", () => {
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link")).toHaveAttribute("href", "/notes")
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })
})
