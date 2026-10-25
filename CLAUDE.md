# CLAUDE.md

Guidance for AI assistants working in this repo.

## What this is

A **location-based treasure hunt** app for the Even Realities platform (Even
G2 smart glasses). The user picks a themed hunt (e.g. "Hot Dog Restaurants —
Downtown Seattle"), sees a checklist of real-world landmarks, and checks each
one off by physically visiting it — the glasses confirm proximity via the
paired phone's GPS. Two halves:

1. **Generator** (`scripts/generate-hunt/`) — a local Node CLI, never shipped
   to the glasses, that calls the Google Places API and writes hunt JSON
   files into `src/hunts/`.
2. **Glasses app** (`src/`) — a two-screen Vite/TS app: hunt picker → hunt
   runner (checklist + GPS check-in).

This grew out of an earlier single-screen "tap counter" demo
(`git log` shows that commit) — the gotchas documented there still apply and
are folded in below.

## Stack

- **Vite + TypeScript**, no framework.
- **`@evenrealities/even_hub_sdk`** (pinned to `0.0.14`). The page runs
  inside the Even App WebView and talks to the glasses through the SDK bridge.
- `app.json` is the Even Hub manifest. `package_id` is
  `com.infinitespecs.evenfirst`. `permissions` includes `location`.

## File layout

- `src/main.ts` — bootstrap + router. One `AppState` (`picker` | `runner`),
  one global `onEvenHubEvent` listener that dispatches on `state.screen`.
- `src/screens/huntPicker.ts`, `src/screens/huntRunner.ts` — pure container
  builders (`buildPickerContainers`, `buildRunnerContainers`); no event
  handling lives here, only "given this data, return this layout."
- `src/geo.ts` — `haversineMeters`, `DEFAULT_RADIUS_METERS` (150).
- `src/storage.ts` — `getProgress`/`saveProgress`, namespaced
  `hunt-progress:<huntId>` keys in `bridge.setLocalStorage`/`getLocalStorage`.
- `src/text.ts` — `truncate` for the list's 64-char/item budget.
- `src/hunts/types.ts` — `Hunt`/`Landmark` types, shared with the generator.
- `src/hunts/index.ts` — **generated**, don't hand-edit. Scans
  `src/hunts/*.json` and exports `HUNTS`/`getHuntById`.
- `src/hunts/*.json` — one file per hunt. `sample-seattle-landmarks.json` is
  hand-written (real public landmark coordinates) so there's always something
  to test with; everything else comes from the generator.
- `scripts/generate-hunt/generate.ts` — the CLI. Has its own
  `scripts/generate-hunt/tsconfig.json` since it's Node-only code outside
  `src/`'s `tsconfig.json` `include`. Run via `tsx`; reads
  `GOOGLE_PLACES_API_KEY` from `.env` (gitignored) via `dotenv`. **Never**
  import anything from here into `src/` — the API key must not reach the
  shipped bundle.

## Commands

```bash
npm install
npm run dev                              # Vite dev server on :5173 (host: true)
npm run build                            # tsc + vite build -> dist/
npm run generate-hunt -- --theme "X" --location "Y"   # writes src/hunts/, regenerates index.ts
evenhub pack --sdk-ver 0.0.14 -o my-first-app.ehpk app.json dist   # package (.ehpk is gitignored)
```

Simulator (installed globally: `@evenrealities/evenhub-simulator`,
`@evenrealities/evenhub-cli`):

```bash
evenhub-simulator --automation-port 9898 http://localhost:5173
```

Hardware: `evenhub qr --url "http://$(ipconfig getifaddr en0):5173"`, scan
from the Even phone app (developer mode on, same LAN).

**Node version gotcha on this machine**: `which node` can resolve to an nvm
`v18` shim that predates `node:util`'s `styleText` export, which this repo's
Vite needs — `vite` then fails with `SyntaxError: ... does not provide an
export named 'styleText'`. Fix: prepend the mise-managed Node 22 to `PATH`
before running dev/build commands:
`export PATH="/Users/alex/.local/share/mise/installs/node/22/bin:$PATH"`.

## SDK gotchas (learned the hard way — keep these in mind)

1. **Register `bridge.onEvenHubEvent(...)` before `await bridge.createStartUpPageContainer(...)`**,
   or early touchpad input is lost.
2. **A touchpad action can arrive as `event.listEvent`, `event.textEvent`,
   or a bare `event.sysEvent`** depending on what's capturing input and how
   the host/simulator routes it. Read whichever is present:
   `event.listEvent ?? event.textEvent ?? event.sysEvent`.
3. **Protobuf omits zero-valued fields — and this bites you twice:**
   - `OsEventTypeList.CLICK_EVENT` is `0`, so a plain click has **no
     `eventType` field at all**. Treat a missing `eventType` as
     `CLICK_EVENT`.
   - Same thing for `List_ItemEvent.currentSelectItemIndex`: tapping the
     **first** list item (index `0`) omits the field too. Don't treat a
     missing index as "no selection" — default it to `0` whenever
     `event.listEvent` is present at all. (This one cost real debugging
     time: a single-item list appeared to not respond to taps at all,
     because `index != null` was false for the valid index `0`.)
4. `OsEventTypeList`: CLICK=0, SCROLL_TOP=1, SCROLL_BOTTOM=2, DOUBLE_CLICK=3,
   FG_ENTER=4, FG_EXIT=5, ABNORMAL_EXIT=6, SYSTEM_EXIT=7, IMU=8, LONG_PRESS=9,
   LONG_PRESS_RELEASE=10.
5. `shutDownPageContainer(1)` pops the foreground exit dialog; `0` exits
   immediately. Docs say silent exits from a root page fail QA — use `1`.
   In the simulator, calling this actually closes the webview — there's no
   further automation API access until you relaunch `evenhub-simulator`.
6. Glasses canvas is **576×288**, origin top-left. Exactly one container per
   page should set `isEventCapture: 1`. `textObject` max 8, `listObject`
   items max **20** (**64 chars** each), `containerTotalNum` 1–12. If any
   container on a page sets `zOrderIndex`, all must.
7. **Lists have no incremental update.** `textContainerUpgrade` updates text
   in place; there is no list equivalent — any change to list content
   (e.g. flipping a checkbox) requires a full `rebuildPageContainer` with a
   freshly built `listObject`. Status-only text changes should go through
   `textContainerUpgrade` on a separate text container instead, to avoid a
   full-list flicker for a one-line message.
8. **Image containers are a dead end for anything photographic.** Max
   288×144px, forced 4-bit grayscale, ~800ms per full update. Fine for a
   small icon, not for a map. This app deliberately uses text/list only.
9. **`bridge.getAppLocation()` is not implemented by the simulator** — it
   rejects with `unknown variant 'getAppLocation'`. Always wrap it in
   try/catch and treat a rejection the same as "no GPS fix" (`null`) rather
   than leaving a "checking…" status stuck forever — this also matters on
   real hardware if the user denies the location permission or the host
   errors for some other reason. `checkInLandmark` in `src/main.ts` is the
   reference implementation.
10. Location comes from the **paired phone's** GPS, not the glasses.
    `getAppLocation`/`startAppLocationUpdates` need the `location` permission
    declared in `app.json`'s `permissions` array:
    `{ "name": "location", "desc": "..." }`. The permission `name` must be
    one of `network`, `location`, `g2-microphone`, `phone-microphone`,
    `album`, `camera`.
11. `setLocalStorage`/`getLocalStorage` are string-only (`JSON.stringify`/
    `parse` yourself), persist across backgrounding, capacity undocumented —
    keep payloads small (this app only stores found-landmark id arrays, not
    whole hunts).

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
`click`s get coalesced into a `double_click` — space them ~0.5s+ when
scripting. A `shutDownPageContainer` call closes the simulator's webview;
relaunch `evenhub-simulator` to get the automation API responding again.
**GPS check-in cannot be exercised this way** (see gotcha #9) — the
simulator can only validate layout and navigation, not the success path.

## Conventions

- Don't commit `dist/`, `node_modules/`, `.env`, or `*.ehpk` (all
  gitignored). Do commit `.env.example` and generated `src/hunts/*.json`.
- Don't hand-edit `src/hunts/index.ts` — it's regenerated by
  `npm run generate-hunt`.
- Keep the generator (`scripts/generate-hunt/`) free of any import from
  `src/` or vice versa beyond the shared `src/hunts/types.ts` — it must never
  end up in the Vite bundle.
- Commit style: imperative subject; the owner commits straight to `main`.
