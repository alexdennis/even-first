import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
  AppLocationAccuracy,
} from '@evenrealities/even_hub_sdk'
import { HUNTS } from './hunts/index'
import type { Hunt } from './hunts/types'
import { buildPickerContainers } from './screens/huntPicker'
import {
  buildRunnerContainers,
  STATUS_CONTAINER_ID as RUNNER_STATUS_CONTAINER_ID,
  STATUS_CONTAINER_NAME as RUNNER_STATUS_CONTAINER_NAME,
} from './screens/huntRunner'
import { haversineMeters, DEFAULT_RADIUS_METERS } from './geo'
import { getProgress, saveProgress } from './storage'

type AppState =
  | { screen: 'picker' }
  | { screen: 'runner'; hunt: Hunt; foundIds: Set<string>; isCheckingIn: boolean }

const bridge = await waitForEvenAppBridge()

let state: AppState = { screen: 'picker' }

function runnerStatusMessage(hunt: Hunt, foundIds: Set<string>): string {
  if (foundIds.size === hunt.landmarks.length) {
    return `Hunt complete! ${foundIds.size}/${hunt.landmarks.length} found`
  }
  return `Tap a landmark to check in · ${foundIds.size}/${hunt.landmarks.length} found`
}

async function enterPicker(): Promise<void> {
  state = { screen: 'picker' }
  await bridge.rebuildPageContainer(new RebuildPageContainer(buildPickerContainers(HUNTS)))
}

async function enterRunner(hunt: Hunt): Promise<void> {
  const foundIds = await getProgress(bridge, hunt.id)
  state = { screen: 'runner', hunt, foundIds, isCheckingIn: false }
  await bridge.rebuildPageContainer(
    new RebuildPageContainer(buildRunnerContainers(hunt, foundIds, runnerStatusMessage(hunt, foundIds))),
  )
}

async function checkInLandmark(index: number): Promise<void> {
  if (state.screen !== 'runner' || state.isCheckingIn) return
  const huntId = state.hunt.id
  const landmark = state.hunt.landmarks[index]
  if (!landmark || state.foundIds.has(landmark.id)) return

  state.isCheckingIn = true
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: RUNNER_STATUS_CONTAINER_ID,
      containerName: RUNNER_STATUS_CONTAINER_NAME,
      content: 'Checking your location…',
    }),
  )

  let loc: Awaited<ReturnType<typeof bridge.getAppLocation>> = null
  try {
    loc = await bridge.getAppLocation({ accuracy: AppLocationAccuracy.High, timeoutMs: 8000 })
  } catch (err) {
    // The host can reject this call (permission not granted, no location
    // support on this build, etc.) — treat it the same as "no fix" rather
    // than leaving isCheckingIn stuck true and the screen frozen.
    console.log('[hunt] getAppLocation failed:', String(err))
  }

  // The user may have left the runner screen (or switched hunts) while the
  // location request was in flight — bail out rather than touch stale state.
  if (state.screen !== 'runner' || state.hunt.id !== huntId) return
  state.isCheckingIn = false

  if (!loc) {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: RUNNER_STATUS_CONTAINER_ID,
        containerName: RUNNER_STATUS_CONTAINER_NAME,
        content: 'No GPS fix — try again outdoors.',
      }),
    )
    return
  }

  const distance = haversineMeters(loc.latitude, loc.longitude, landmark.lat, landmark.lng)
  const radius = landmark.radiusMeters ?? DEFAULT_RADIUS_METERS

  if (distance <= radius) {
    state.foundIds.add(landmark.id)
    await saveProgress(bridge, state.hunt.id, state.foundIds)
    const message = runnerStatusMessage(state.hunt, state.foundIds)
    await bridge.rebuildPageContainer(
      new RebuildPageContainer(buildRunnerContainers(state.hunt, state.foundIds, message)),
    )
  } else {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: RUNNER_STATUS_CONTAINER_ID,
        containerName: RUNNER_STATUS_CONTAINER_NAME,
        content: `${Math.round(distance)}m away from ${landmark.name} — keep going`,
      }),
    )
  }
}

// Register the listener before creating the startup page so no early
// touchpad action is missed. A tap can arrive on the capturing list
// container or as a bare system event (the simulator delivers clicks that
// way) — read whichever is present. A plain click (OsEventTypeList
// CLICK_EVENT, value 0) has its eventType field omitted by protobuf, so a
// missing eventType is treated as a click.
bridge.onEvenHubEvent((event) => {
  const source = event.listEvent ?? event.textEvent ?? event.sysEvent
  if (!source) return
  const eventType = source.eventType ?? OsEventTypeList.CLICK_EVENT

  // Same protobuf quirk as eventType: currentSelectItemIndex is omitted when
  // its value is 0 (the default/first-item selection), not just when there's
  // no selection at all. Default to 0 whenever a listEvent is present.
  const listIndex = event.listEvent ? event.listEvent.currentSelectItemIndex ?? 0 : undefined

  if (state.screen === 'picker') {
    if (eventType === OsEventTypeList.CLICK_EVENT) {
      const hunt = listIndex != null ? HUNTS[listIndex] : undefined
      if (hunt) void enterRunner(hunt)
    } else if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // Mode 1 pops the foreground exit dialog; silent exits fail QA.
      void bridge.shutDownPageContainer(1)
    }
    return
  }

  // Runner screen.
  if (eventType === OsEventTypeList.CLICK_EVENT) {
    if (listIndex != null) void checkInLandmark(listIndex)
  } else if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    // Back to the picker — not an app exit. Only the root (picker) page exits.
    void enterPicker()
  }
})

await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(buildPickerContainers(HUNTS)))
