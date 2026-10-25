import {
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import type { Hunt } from '../hunts/types'
import { truncate } from '../text'

export const LIST_CONTAINER_ID = 1
export const LIST_CONTAINER_NAME = 'hunt-list'
export const STATUS_CONTAINER_ID = 2
export const STATUS_CONTAINER_NAME = 'hunt-picker-hint'

const LIST_ITEM_MAX_CHARS = 64

export interface PickerContainers {
  containerTotalNum: number
  listObject: ListContainerProperty[]
  textObject: TextContainerProperty[]
}

/** Builds the picker screen's containers. Valid for both create and rebuild. */
export function buildPickerContainers(hunts: Hunt[]): PickerContainers {
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
      itemCount: hunts.length,
      itemName: hunts.map((h) => truncate(h.title, LIST_ITEM_MAX_CHARS)),
    }),
  })

  const hint = new TextContainerProperty({
    xPosition: 0,
    yPosition: 240,
    width: 576,
    height: 48,
    borderWidth: 0,
    paddingLength: 4,
    containerID: STATUS_CONTAINER_ID,
    containerName: STATUS_CONTAINER_NAME,
    content:
      hunts.length > 0
        ? 'Tap to start · Double-tap to exit'
        : 'No hunts bundled — run npm run generate-hunt',
    isEventCapture: 0,
  })

  return {
    containerTotalNum: 2,
    listObject: [list],
    textObject: [hint],
  }
}
