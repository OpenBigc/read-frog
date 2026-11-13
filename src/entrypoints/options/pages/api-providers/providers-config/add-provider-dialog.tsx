import type { APIProviderTypes } from "@/types/config/provider"
import { useSetAtom, useStore } from "jotai"
import { requestEditorNavigationAtom } from "@/components/form/autosave-navigation"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/base-ui/dialog"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import {
  API_PROVIDER_ITEMS,
  LOCAL_PROVIDER_TYPES,
  getProviderItemName,
} from "@/utils/constants/providers"
import { i18n } from "@/utils/i18n"
import { selectedProviderIdAtom } from "./atoms"
import { addProvider } from "./utils"

export default function AddProviderDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const requestNavigation = useSetAtom(requestEditorNavigationAtom)
  const setProvidersConfig = useSetAtom(configFieldsAtomMap.providersConfig)
  const setSelectedProviderId = useSetAtom(selectedProviderIdAtom)

  const handleAddProvider = async (providerType: APIProviderTypes) => {
    await requestNavigation(async () => {
      await addProvider(
        providerType,
        store.get(configFieldsAtomMap.providersConfig),
        setProvidersConfig,
        setSelectedProviderId,
      )
      onClose()
    })
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{i18n.t("options.apiProviders.dialog.title")}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-4">
        {LOCAL_PROVIDER_TYPES.map((providerType) => (
          <ProviderButton
            key={providerType}
            providerType={providerType}
            handleAddProvider={handleAddProvider}
          />
        ))}
      </div>
    </DialogContent>
  )
}

function ProviderButton({
  providerType,
  handleAddProvider,
}: {
  providerType: APIProviderTypes
  handleAddProvider: (providerType: APIProviderTypes) => void
}) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      key={providerType}
      className="relative flex h-auto flex-col items-center space-y-1.5 rounded-lg p-2 hover:bg-muted/70"
      onClick={() => handleAddProvider(providerType)}
    >
      <ProviderIcon logo={API_PROVIDER_ITEMS[providerType].logo(theme)} size="md" />
      <span className="line-clamp-2 flex w-full flex-1 items-center justify-center text-xs font-light">
        {getProviderItemName(providerType)}
      </span>
    </button>
  )
}
