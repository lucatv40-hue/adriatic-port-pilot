<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Listing-photo storage reads are owner-scoped; public photo signing first verifies approved listing membership and uploader prefix through public RLS, then issues five-minute links.
- App-shell offline support uses vite-plugin-pwa generateSW with one preview-safe registration wrapper; push-only workers stay separate, and auth/API/payment responses are never cached.
- PWA output targets the TanStack client directory; public navigations use NetworkFirst with a failure-only precacheFallback, never an always-on navigation fallback.
- Favorites are public port snapshots stored on the device; the offline fallback uses bundled Leaflet and cached visited tiles, never fresh-weather claims or private account data.
- Consent uses the unchanged built-in purpose module and pre-tag defaults; all analytics choices flow through saveChoices so they reach Consent Mode.
- Port seed data and boat-fit logic (`checkFit`, `fitLevel`: size=grey beats depth=orange) live in `src/lib/ports.ts` (pure, tested); map, list, port page and tests share them.
- Boat profile is stored per user in the `boats` table (RLS own-row); `useBoat` reads it, the "only suitable" toggle stays in localStorage.
- Leaflet is only loaded via `React.lazy` behind `<ClientOnly>` (it touches `window` at import).
- Interactive maps import the shared leaflet-rotated module, which binds globalThis.L before leaflet-rotate evaluates (the plugin requires this global); keep touchRotate and rotateWithView markers, and a non-modal route data curtain so uncovered map areas stay usable.
- Aerial port imagery uses attributed public orthophotos through port-aerial; Veneto is WMS view-only (no redistribution), licensed FVG/Croatian snapshots use asset pointers, and unavailable coverage never substitutes generic photos.
- Weather comes from keyless Open-Meteo forecast + marine APIs fetched client-side.
- Route ETA logic lives in the pure tested `route-timing.ts`; use cumulative nautical miles at constant knots and UTC forecast timestamps aligned by time, selecting only a covered nearest hour so local timezone and missing data cannot shift arrival weather.
- Forecast parsing (`src/lib/weather.ts`) never throws: missing values become null and the UI shows "non disponibile"; threshold check lives in `src/lib/thresholds.ts`.
- Roles live in `user_roles` + `has_role()`; notices are public-read, admin-write (RLS) and saved via `saveNotice` server fn, which pushes to users following the zone.
- Web push: VAPID pair derived from secret `VAPID_SEED` in `src/lib/push.server.ts` (WebCrypto lib, Worker-safe); `public/push-sw.js` is push-only, registered with scope `/push/` so it never controls pages.
- Official notices are imported daily by `/api/public/jobs/import-notices` (Firecrawl search + Lovable AI extraction, dedup by source_url); admins can trigger `runNoticeImport`.
- Weather alerts run from an hourly managed schedule calling `/api/public/jobs/weather-alerts` (cron-auth), max one alert per user per 12 h.
- Gestori: `listings` table (owner claims a seed port or a new service; status pending/approved/rejected, guarded by trigger so owners can't self-approve); approval via admin `reviewListing` server fn which also grants the `gestore` role. `applyListing` in `src/lib/listings.ts` (tested) overlays approved data on seed ports. Photos in private bucket `listing-photos` (public buckets blocked) shown via signed URLs; views/contacts logged through `log_listing_event` RPC.
- Plans: Stripe subscriptions (price lookup keys `skipper_monthly`, `gestore_monthly`, `flotta_monthly`) mirrored into `subscriptions` by the webhook at `/api/public/payments/webhook` and by `syncMySubscriptions` (return/account pages, in case the webhook is late). `plans_for`/`my_plans` SQL return active price ids plus `flotta_member` for emails in an active fleet; `access()` in `src/lib/plans.ts` (tested) maps them to features. UI gating uses `usePlan` + `<Upgrade>`; server gating in alert jobs/notice pushes and in the `listings_guard` trigger.

- Notice import prefers free direct HTTP sources (HHI radio notices, pure parser in `src/lib/hhi.ts`) every 6 h and uses Firecrawl only daily for Italian Capitanerie under a monthly credit budget tracked in `notice_sources`; coordinates come only from notice text or known places (marked unverified) because AI must never invent positions.
- Route ↔ notice matching lives in pure tested `src/lib/route-notices.ts` (distance to route + overlap with sailing window; wide zone notices are labelled, never shown as on-route bans).
