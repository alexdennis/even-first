import {
  waitForEvenAppBridge,
  TextContainerProperty,
  TextContainerUpgrade,
  CreateStartUpPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

const CONTAINER_ID = 1
const CONTAINER_NAME = 'main'

const render = (count: number) =>
  `Hello from G2!\n\nTap to count: ${count}\nDouble-tap to exit`

const bridge = await waitForEvenAppBridge()

let count = 0

// Register the listener before creating the page so no early touchpad action
// is missed. A tap reaches us on the captured text container or as a system
// event (the simulator delivers clicks that way).
bridge.onEvenHubEvent((event) => {
  const source = event.textEvent ?? event.listEvent ?? event.sysEvent
  if (!source) return
  if (event.textEvent && event.textEvent.containerID !== CONTAINER_ID) return

  // Protobuf omits zero-valued fields, so a plain click arrives with no
  // eventType; treat a missing type as CLICK_EVENT (value 0).
  const eventType = source.eventType ?? OsEventTypeList.CLICK_EVENT

  switch (eventType) {
    case OsEventTypeList.CLICK_EVENT:
      count += 1
      bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: CONTAINER_ID,
          containerName: CONTAINER_NAME,
          content: render(count),
        }),
      )
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      // Mode 1 pops the foreground exit dialog; silent exits fail QA.
      bridge.shutDownPageContainer(1)
      break
  }
})

const mainText = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: CONTAINER_ID,
  containerName: CONTAINER_NAME,
  content: render(0),
  isEventCapture: 1,
})

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [mainText],
  }),
)
