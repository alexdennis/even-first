# My First App — Even Realities G2

A minimal Even Hub app built from the [First App quickstart](https://hub.evenrealities.com/docs/get-started/quickstart/first-app).
Shows a text page on the glasses: tap the touchpad to increment a counter,
double-tap to exit.

## Stack

- Vite + TypeScript
- `@evenrealities/even_hub_sdk` (0.0.14)

## Develop

```bash
npm install
npm run dev                              # Vite dev server on :5173
evenhub-simulator http://localhost:5173  # separate terminal
```

Edit `src/main.ts`; Vite hot-reloads and the simulator refreshes.

### Test on hardware

```bash
evenhub qr --url "http://$(ipconfig getifaddr en0):5173"
```

Scan with the Even phone app (developer mode on, phone on the same LAN).

## Build & package

```bash
npm run build                                          # -> dist/
evenhub pack --sdk-ver 0.0.14 -o my-first-app.ehpk app.json dist
```

## Notes

- `src/main.ts` registers the event listener *before* `createStartUpPageContainer`
  so no early touchpad action is lost.
- Touchpad clicks reach the app as a **system event** whose `eventType` is
  omitted (protobuf drops zero values), so the handler treats a missing type as
  `CLICK_EVENT`. This differs from the quickstart snippet, which only inspects
  `event.textEvent` and does not respond in the simulator.
- `app.json` `package_id` is `com.infinitespecs.evenfirst` — change it before publishing.
