# Treasure Hunt — Even Realities G2

A location-based treasure hunt for Even G2 smart glasses. Pick a themed hunt
(e.g. "Hot Dog Restaurants — Downtown Seattle"), see a checklist of real-world
landmarks, and tick each one off by physically visiting it — the glasses
confirm you're close enough using the paired phone's GPS. It's a way to
explore a new local area, built around checking off real places, not finding
hidden objects.

## How it works

1. **Generate a hunt** on your Mac with a small CLI script that calls the
   Google Places API for a theme + location and writes a hunt JSON file into
   the repo.
2. **Rebuild and republish** the app — hunts are bundled in at build time,
   there's no backend or runtime fetch.
3. **On the glasses**: pick a hunt from the list, tap a landmark to check in
   (GPS proximity, default 150m), double-tap to go back to the hunt list.
   Progress is saved on-device and survives app restarts.

## Stack

- Vite + TypeScript, no framework.
- `@evenrealities/even_hub_sdk` (0.0.14).
- Generator: a standalone Node/TypeScript script (`scripts/generate-hunt/`),
  run with `tsx`, never bundled into the app.

## Generate a hunt

### One-time setup: a Google Places API key

1. [console.cloud.google.com](https://console.cloud.google.com) → **New
   Project**.
2. **Enable billing** on the project — the Places API requires an active
   billing account even under free-tier credits. This is the most common
   first-time blocker.
3. APIs & Services → Library → enable **"Places API (New)"** specifically
   (not the legacy "Places API" — this script uses the New API's Text Search
   endpoint).
4. APIs & Services → Credentials → **Create API key**, then immediately
   restrict it:
   - **API restrictions**: Places API (New) only.
   - **Application restrictions**: IP address, pinned to your current public
     IP if it's stable; otherwise skip this and rely on the API restriction
     alone (there's no HTTP referrer to restrict by — this is a local script).
5. `cp .env.example .env` and paste the key in as `GOOGLE_PLACES_API_KEY=...`.
   `.env` is gitignored.

### Run it

```bash
npm run generate-hunt -- --theme "Hot Dog Restaurants" --location "Downtown Seattle, WA"
# options: [--count 8] [--radius 150] [--id some-slug]
```

Writes `src/hunts/<slug>.json` and regenerates `src/hunts/index.ts` (the
registry the app imports — don't hand-edit it, it's overwritten on every
run). Open the new hunt file afterward to add a per-landmark `hint` or
`radiusMeters` override if you want — those aren't set by the generator.

A hand-written example, `src/hunts/sample-seattle-landmarks.json`, ships in
the repo so there's always at least one hunt to test with.

## Develop

```bash
npm install
npm run dev                              # Vite dev server on :5173
evenhub-simulator http://localhost:5173  # separate terminal
```

Edit files under `src/`; Vite hot-reloads and the simulator refreshes.

**Simulator limitation:** the simulator does not implement
`bridge.getAppLocation()` — calling it rejects with "unknown variant
`getAppLocation`". That means the simulator is good for checking navigation,
list rendering, and layout, but the actual GPS check-in (the "you're close
enough" success path) can only be verified on real hardware.

### Test on hardware

```bash
evenhub qr --url "http://$(ipconfig getifaddr en0):5173"
```

Scan with the Even phone app (developer mode on, phone on the same LAN). The
first time the app calls `getAppLocation`, the phone should prompt for the
**location** permission declared in `app.json` — grant it, then check in on a
nearby landmark to confirm the full flow end-to-end. A throwaway one-landmark
test hunt placed at your actual location is the fastest way to validate both
the "too far" and "found it" paths.

## Build & package

```bash
npm run build                                          # -> dist/
evenhub pack --sdk-ver 0.0.14 -o my-first-app.ehpk app.json dist
```

"Uploading" a new hunt to the glasses = generate it, commit the JSON, rebuild,
repack, reload.

## Notes

- `app.json` declares the `location` permission — required before calling
  any location API.
- `src/main.ts` is a tiny two-screen router (`picker` → `runner`) over a
  single global `onEvenHubEvent` listener; see `CLAUDE.md` for the SDK
  quirks that shape it.
- `app.json` `package_id` is `com.infinitespecs.evenfirst` — change it before
  publishing.
