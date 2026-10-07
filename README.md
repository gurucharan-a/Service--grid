# ServiceGrid — activity management for industrial equipment servicing

Hackathon-ready demo: multi-site ops command center with real-time exceptions,
allocation engine, hash-chained audit, and extensible adapters.

## Quick start (this repo — Vite demo, runnable now)

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check + production build
```

Seed: 3 sites (Guindy/Ambattur/Sriperumbudur), 12 machines (hero **M-104** Conveyor C-4),
10 technicians, 30 part SKUs. Data persists in `localStorage`; **Reset demo** restores it.

## Demo script (2 minutes)

1. Log in as **Ops** → Command center: live Leaflet/OSM map, KPIs, SSE activity feed.
2. **Demo controls** → *Simulate technician dropout* → real `TECH_DROPOUT` flow:
   exception panel → **One-click reassign** (new best candidate + why).
3. *Deplete reserved part* → `PART_UNAVAILABLE` + nearest-site transfer suggestion.
4. *Fast-forward SLA* / *Run SLA check* → `SLA_BREACH` at 100% (warn at 80%).
5. Requests tab → `SR-1041`: validation report, allocation scoreboard
   (`0.4·skill + 0.25·proximity + 0.2·availability + 0.15·(1−workload)`),
   atomic part reservation, task log, attachments, audit trail.
6. Audit tab → **Verify integrity** (recomputes hash chain).
7. Customer tab → free-text + **AI parse** (Claude API, deterministic fallback).
8. Technician PWA tab → accept / status / photo proof; `scripts/simulate_iot.py` for IoT P1.

## Architecture

```
UI (Ops/Customer/Tech/Inventory/Audit)
  → services/store.ts (state machine + transactions + RBAC call-sites)
  → lib/{validation,allocation,stateMachine,sse} + EventBus (domain events:
     RequestCreated, RequestApproved, TechnicianAssigned, ExceptionRaised, RequestClosed)
  → adapters/{notification, ai, iot, map, ledger} (typed interfaces)
  → stubs: mobile native app, cloud queue (Kafka/SQS) — interfaces + docs only
```

- **State machine** (`lib/stateMachine.ts`): `CREATED→VALIDATED→PENDING_APPROVAL→
  APPROVED→ASSIGNED→IN_PROGRESS→PENDING_VERIFICATION→CLOSED` + `EXCEPTION`;
  illegal transitions throw (server-side in Next.js route handlers).
- **RBAC** matrix in same file; demo uses persona switcher (Customer/Ops/Tech/Admin).
- **Allocation**: haversine proximity, score breakdown, top-3, atomic part reserve
  (check-then-reserve, no oversell), notification to technician.
- **Exception engine**: dropout / part shortage / SLA breach → alert (SSE+notification),
  re-run allocation excluding failed resource, one-click reassign, timeline update.
- **Ledger**: `chainHash(prev, body)` per audit entry; Verify recomputes chain.
  Blockchain anchoring documented as `LedgerAdapter` extension.

## Next.js 14 deploy path (Vercel + Supabase)

This Vite app mirrors the production shape 1:1 so judges see working software *and*
a credible ship path:

- `prisma/schema.prisma` — Postgres (Supabase), full data model.
- App Router mapping: `app/(ops)/page.tsx`→OpsDashboard, `app/requests/[id]`→RequestDetail,
  `app/portal`→CustomerPortal, `app/tech`→TechPWA (PWA), `app/api/*`→thin Zod-validated
  route handlers calling the same `lib/*` + `store` logic with Prisma transactions.
- Auth: NextAuth credentials + JWT with `role` in token; middleware enforces the
  `RBAC` matrix on every `/api/*` route.
- Real-time: `/api/events` SSE route subscribing to the EventBus (hook `lib/sse.ts`
  already speaks the same event names); swap transport for Kafka/SQS via `QueueAdapter`.
- AI: `AIAdapter` calls Claude API server-side; deterministic fallback included.
- IoT: `POST /api/telemetry` (Zod `telemetrySchema`); breach auto-creates P1 —
  test with `python scripts/simulate_iot.py --machine M-104 --metric vibration --value 128`.
- Maps: `MapAdapter` = Leaflet + OpenStreetMap (`components/MapView.tsx` as-is).

```bash
# production sketch
npx prisma migrate dev && npx prisma db seed
vercel --prod
```

## Extensibility (architecture proof)

| Adapter | Now | Later |
|---|---|---|
| Notification | in-app + webhook (`VITE_NOTIFY_WEBHOOK` → Telegram/email) | per-user prefs |
| AI | Claude parse + why-this-tech, fallback parser | fine-tuned priority |
| IoT | threshold ingest + auto-P1 | MQTT connector |
| Map | Leaflet/OSM | geofence dispatch |
| Ledger | hash chain + verify | anchor root hash on-chain |
| Mobile / Queue | **stub interfaces** (`adapters/stubs.ts`) | Capacitor app / Kafka-SQS |

## Quality

Typed end-to-end, Zod on inputs, transactions for reservations, optimistic UI where
safe, loading/empty/error states on every panel, PWA manifest included.
