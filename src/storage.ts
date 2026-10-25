import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

const keyFor = (huntId: string) => `hunt-progress:${huntId}`

export async function getProgress(bridge: EvenAppBridge, huntId: string): Promise<Set<string>> {
  try {
    const raw = await bridge.getLocalStorage(keyFor(huntId))
    const ids = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    // Empty string / malformed JSON / host error — treat as "nothing found yet".
    return new Set()
  }
}

export async function saveProgress(
  bridge: EvenAppBridge,
  huntId: string,
  foundIds: Set<string>,
): Promise<void> {
  await bridge.setLocalStorage(keyFor(huntId), JSON.stringify([...foundIds]))
}
