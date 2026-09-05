# CLAUDE.md

Guidance for AI assistants working in this repo.

## What this is

A learning project: the owner's first app for the **Even Realities** platform
(Even G2 smart glasses), built from the
[First App quickstart](https://hub.evenrealities.com/docs/get-started/quickstart/first-app).
It is a single-screen app — a full-width text container that counts touchpad
taps and exits on double-tap. Verified working in the simulator and on real G2
hardware.

## Stack

- **Vite + TypeScript**, no framework. `src/main.ts` is the whole app.
- **`@evenrealities/even_hub_sdk`** (pinned to `0.0.14`). The page runs inside
  the Even App WebView and talks to the glasses through the SDK bridge.
- `app.json` is the Even Hub manifest. `package_id` is `com.infinitespecs.evenfirst`.

## Commands

```bash
npm install
npm run dev                              # Vite dev server on :5173 (host: true)
npm run build                            # tsc + vite build -> dist/
evenhub pack --sdk-ver 0.0.14 -o my-first-app.ehpk app.json dist   # package (.ehpk is gitignored)
```

Simulator (installed globally: `@evenrealities/evenhub-simulator`,
`@evenrealities/evenhub-cli`):

```bash
evenhub-simulator http://localhost:5173
# with automation (headless-drivable):
evenhub-simulator --automation-port 9898 http://localhost:5173
```

Hardware: `evenhub qr --url "http://$(ipconfig getifaddr en0):5173"`, scan from
the Even phone app (developer mode on, same LAN).

## SDK gotchas (learned the hard way — keep these in mind)

1. **Register `bridge.onEvenHubEvent(...)` before `await bridge.createStartUpPageContainer(...)`**,
   or early touchpad input is lost.
2. **Touchpad clicks arrive as `event.sysEvent`, not `event.textEvent`.** Read
   the type from `event.textEvent ?? event.listEvent ?? event.sysEvent`.
3. **Protobuf omits zero-valued fields.** `CLICK_EVENT` is `0`, so a plain click
   has *no* `eventType` field at all — treat a missing type as `CLICK_EVENT`.
4. `OsEventTypeList`: CLICK=0, SCROLL_TOP=1, SCROLL_BOTTOM=2, DOUBLE_CLICK=3,
   FG_ENTER=4, FG_EXIT=5, ABNORMAL_EXIT=6, SYSTEM_EXIT=7, IMU=8, LONG_PRESS=9,
   LONG_PRESS_RELEASE=10.
5. `shutDownPageContainer(1)` pops the foreground exit dialog; `0` exits
   immediately. Docs say silent exits from a root page fail QA — use `1`.
6. Glasses canvas is **576×288**, origin top-left. Exactly one container per
   page should set `isEventCapture: 1`. `textObject` max 8, `containerTotalNum`
   1–12. If any container on a page sets `zOrderIndex`, all must.
7. `textContainerUpgrade` updates text without re-layout; `rebuildPageContainer`
   replaces the page. `updateImageRawData` is required after creating an image
   container.
8. The quickstart's sample `main.ts` does **not** work as written (points 1–3);
   `src/main.ts` here is the corrected version. Don't "restore" it to match the docs.

The upstream SDK README (`node_modules/@evenrealities/even_hub_sdk/README.md`)
is the most complete API reference — check it before guessing.

## Simulator automation API

Base `http://127.0.0.1:<port>`:

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/ping` | returns `pong` |
| GET | `/api/screenshot/glasses` | 576×288 RGBA PNG of the glasses framebuffer |
| GET | `/api/screenshot/webview` | screenshot of the WebView |
| GET | `/api/console` | webview console + uncaught errors + failed fetches; `?since_id=N` |
| DELETE | `/api/console` | clears the buffer |
| POST | `/api/input` | `{"action":"up\|down\|click\|double_click\|long_press\|long_press_release\|context_menu"}` |

Input is ignored unless a container is capturing events. Rapid consecutive
`click`s get coalesced into a `double_click` — space them ~0.5s+ when scripting.

## Conventions

- Keep `src/main.ts` small and dependency-free; this is a reference/learning app.
- Don't commit `dist/`, `node_modules/`, or `*.ehpk` (all gitignored).
- Commit style: imperative subject; the owner commits straight to `main`.
