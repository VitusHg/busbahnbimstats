# BusBahnBimStats

A small dashboard for the trips saved by the [BusBahnBim](https://verkehrsauskunft.verbundlinie.at) app (Verbundlinie Steiermark) into a published iCloud/CalDAV calendar. Paste your calendar link and get statistics on your public-transit usage: mode share, most-used lines and stops, when you travel, trip history, and more.

## How it works

1. You paste a published calendar link (`webcal://...` or `https://.../published/2/...`).
2. The server fetches that ICS feed (server-side, so iCloud's CORS restrictions don't apply to your browser) and parses each calendar event's `DESCRIPTION` text.
3. Walking segments ("Fußweg") and interchange notes ("Übergang") are dropped; only the actual vehicle rides ("Abfahrt ... mit ... Ankunft") become "legs".
4. Legs are chained into "trips": all legs from one calendar event always belong together, and two separate calendar events are joined into one trip when the second departs from (about) where the first arrived, soon enough after, and doesn't double back to a stop the trip already passed through (so an outbound ride and its later return trip stay separate).
5. Statistics are computed from the resulting trips and rendered as a dashboard.

Nothing is stored server-side. The calendar link is only kept in your own browser's `localStorage` so you don't have to paste it again next time.

## Development

```bash
npm install
npm run dev      # start the dev server on http://localhost:3000
npm test         # run the unit tests (vitest)
npm run lint      # eslint
npm run build     # production build
```

The parsing/linking/statistics logic lives in `src/lib/` and is covered by unit tests in `src/lib/*.test.ts`, including fixtures for walk-wrapped trips, multi-leg transfers, and cross-event linking. No real personal data is used in the fixtures.
