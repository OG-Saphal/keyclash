# keyclash-server

## 🆕 Changelog

- **Fixed room-cleanup bug**: `roomManager.leaveRoom()` and `sweepStaleRooms()`
  now treat a room with zero *active* (non-spectator) players as empty and
  destroy it immediately, instead of only destroying when the player map was
  literally empty. Previously, a host leaving while a spectator remained left
  a broken room (stale host, no active players) alive until the 20-minute
  idle sweep. Remaining spectators now get a `room:closed` event when this
  happens instead of being silently stranded. See `socket/handlers.ts`'s
  `room:leave` and `disconnect` handlers for the corresponding notification
  fix.

Node.js + Socket.io backend for KeyClash multiplayer. Separate deployable
service from the Vite frontend — the frontend stays static on GitHub Pages
and just points at this server's URL.

## Run locally

```bash
npm install
cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Server listens on `PORT` (default 4000). Health check: `GET /health`.

## Deploying

Any Node host that supports long-lived WebSocket connections works: Render,
Fly.io, Railway, a plain VPS. **Do not** deploy this to a serverless
function platform (Vercel/Netlify functions) — Socket.io needs a persistent
process, not a request/response function.

Set the same env vars from `.env.example` in your host's dashboard. Update
`CORS_ORIGIN` to include your actual GitHub Pages origin, and update the
frontend's `VITE_MULTIPLAYER_SERVER_URL` to point at wherever this ends up
(e.g. `https://keyclash-server.onrender.com`).

## Storage: in-memory (MVP) vs Redis

Implemented: **in-memory**, one process (`src/rooms/roomStore.ts`). Simplest
possible thing, zero extra infra, fine for a single Node instance.

Tradeoff, called out per the original spec — please confirm before scaling:
- In-memory: a restart/redeploy drops every live room; cannot run more than
  one server instance (no horizontal scaling, no sticky-session juggling).
- Redis (e.g. Upstash): restart-safe, horizontally scalable, adds one piece
  of infra + a network hop per room mutation.

`RoomStore` in `roomStore.ts` is a narrow interface specifically so swapping
in a Redis-backed implementation later is a single new file, not a rewrite
of `roomManager.ts`.

## Deviations from the original spec (flagged, please review)

1. **Word lists are duplicated, not shared.** `src/game/wordLists.ts` only
   includes `ENGLISH_200` for all three word sets in this scaffold. Copy the
   full `ENGLISH_1K` / `COMMON_WORDS` arrays from the frontend's
   `src/data/words.ts` verbatim before this goes live — otherwise word-set
   choice in Create Room has no visible effect. Longer term, consider a
   small shared npm package (`@keyclash/shared`) published to a private
   registry or a git submodule, so word lists and the metrics formula live
   in exactly one place instead of two hand-synced copies.
2. **Bot fallback (Quick Match ~15s timeout) is stubbed, not implemented.**
   `handlers.ts` broadens the match to any settings group after 15s, but if
   *that* also fails there's no actual bot player wired into the race loop
   (a bot needs synthetic progress ticks, a plausible WPM curve, and a seat
   in the room). Flagging this as its own follow-up task — it's a small
   simulated-player subsystem, not a one-liner.
3. **Chat is not implemented.** Listed as spec section 4 "Polish" — no chat
   events exist yet. Adding a `room:chat_message` broadcast is
   straightforward once the rest of this is working.
4. **Spectator mode is minimal.** Joining a full/racing public room correctly
   marks you a spectator (read-only, excluded from `canStart`/ready checks),
   but there's no spectator-specific UI guidance here — that's a frontend
   concern (see `frontend-additions/`).
5. **Outlier detection is heuristic, not a full anti-cheat system.** Per
   spec: "flagged silently for review, not blocked." `game/metrics.ts` flags
   on implausible WPM, suspiciously perfect accuracy at high speed, and
   client/server clock drift. This is a starting point, not a complete
   cheat-detection pipeline — no persistence/review queue exists yet since
   there's no admin surface in the app to review flags from.
6. **No test runner**, per the ground rules (singleplayer doesn't have one
   either, and this MVP doesn't introduce the need for one on its own). If
   the room-state-machine logic in `roomManager.ts` grows more edge cases,
   that's the first place I'd add one.

## Socket protocol summary

Client → Server events: `room:create`, `room:join`, `room:rejoin`,
`room:leave`, `room:list_request`, `lobby:ready`, `lobby:update_settings`,
`lobby:kick`, `lobby:transfer_host`, `lobby:start`, `race:progress`,
`race:finish`, `quickmatch:join`, `quickmatch:cancel`.

Server → Client events: `room:updated`, `room:list_updated`, `room:closed`,
`lobby:kicked`, `race:words`, `race:progress_broadcast`, `race:results`,
`quickmatch:searching`, `quickmatch:found`, `quickmatch:cancelled`,
`quickmatch:timeout_no_bot`, `error`.

See `frontend-additions/src/services/multiplayer.service.ts` for the typed
client-side wrapper around all of these.
