import type { HostedAiStatus } from "@/utils/hosted-ai/types"
export interface HostedAiStatusResult {
  status: HostedAiStatus | undefined
  isSignedIn: boolean
  isPending: boolean
  isError: boolean
}
export function useHostedAiStatus(_options: { enabled?: boolean } = {}): HostedAiStatusResult {
  return { status: undefined, isSignedIn: false, isPending: false, isError: false }
}
