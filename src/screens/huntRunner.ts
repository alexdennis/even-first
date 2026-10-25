import {
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import type { Hunt, Landmark } from '../hunts/types'
import { truncate } from '../text'

export const LIST_CONTAINER_ID = 1
export const LIST_CONTAINER_NAME = 'landmark-list'
export const STATUS_CONTAINER_ID = 2
export const STATUS_CONTAINER_NAME = 'hunt-status'

const LIST_ITEM_MAX_CHARS = 64
// "[ ] " / "[x] " prefix.
const CHECKBOX_PREFIX_LENGTH = 4

export function formatLandmarkItem(landmark: Landmark, foundIds: Set<string>): string {
  const prefix = foundIds.has(landmark.id) ? '[x] ' : '[ ] '
  return prefix + truncate(landmark.name, LIST_ITEM_MAX_CHARS - CHECKBOX_PREFIX_LENGTH)
}

export interface RunnerContainers {
  containerTotalNum: number
  listObject: ListContainerProperty[]
  textObject: TextContainerProperty[]
}

/** Builds the hunt runner screen's containers. Always used via rebuildPageContainer. */
export function buildRunnerContainers(
  hunt: Hunt,
  foundIds: Set<string>,
  statusMessage: string,
): RunnerContainers {
  const list = new ListContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 240,
    borderWidth: 0,
    paddingLength: 4,
    containerID: LIST_CONTAINER_ID,
    containerName: LIST_CONTAINER_NAME,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: hunt.landmarks.length,
      itemName: hunt.landmarks.map((landmark) => formatLandmarkItem(landmark, foundIds)),
    }),
  })

  const status = new TextContainerProperty({
    xPosition: 0,
    yPosition: 240,
    width: 576,
    height: 48,
    borderWidth: 0,
    paddingLength: 4,
    containerID: STATUS_CONTAINER_ID,
    containerName: STATUS_CONTAINER_NAME,
    content: statusMessage,
    isEventCapture: 0,
  })

  return {
    containerTotalNum: 2,
    listObject: [list],
    textObject: [status],
  }
}
