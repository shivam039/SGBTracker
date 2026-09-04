# SGB Tracker

Tracks Sovereign Gold Bond (SGB) tranches trading in the Indian secondary
market and ranks them by **economic value**, not raw price — answering
"which SGB tranche is the best value to buy right now?" with a proper
cash-flow-based yield calculation instead of "whichever number is smallest."

Ships fully runnable out of the box on **simulated sample data**, clearly
labeled everywhere it appears, with the data layer built as a swappable
interface so a real market-data feed can be plugged in later without
touching the calculation engine, API, or UI.

> Educational/research tool. Not investment advice.

---

## How "cheapest" is defined

**Cheapest SGB = the reliably-priced, actively-tradable tranche with the
highest annualized YTM** — the internal rate of return (IRR) of the dated
cash flows from buying one unit today:

```
CF(t=0)      = -marketPrice
CF(coupon)   = +semiAnnualCoupon         for each remaining coupon date
CF(maturity) = +semiAnnualCoupon + redemptionValue

redemptionValue = today's gold reference price   (held FLAT — see below)

Solve for annual rate r such that:  Σ CF(t) / (1+r)^(years to t)  =  0
```

Raw market price ignores tenure and coupon income; raw discount-to-gold is a
useful snapshot but ignores income earned while waiting and how much time a
discount has to close. YTM folds price + coupons + tenure + redemption into
one annualized, apples-to-apples number across tranches with different
maturities and prices. The gold price is held **flat** for this primary
metric (rather than assuming appreciation) so the ranking stays free of a
speculative forecast — every tranche is judged under the same neutral
assumption. Tranches with stale/missing/suspect price data are excluded from
the "cheapest" headline even if their YTM looks attractive.

Full derivation, every formula, and every assumption: see the in-app
**Methodology** page (`/methodology`, `src/app/methodology/page.tsx`).

---

## Data sources — research findings

No free, licensed, real-time (or reliably free EOD) API for Indian SGB
secondary-market prices exists as a documented public product:

- **NSE / BSE**: both publish daily **EOD bhavcopy** files (CSV) that
  include the SGB trading segment. Free to download for personal,
  non-systematic use — the most realistic free/legal path. **Delayed,
  end-of-day only.**
- **RBI**: publishes official tranche terms and redemption-price
  notifications at each tranche's actual maturity (using the IBJA gold-price
  methodology this app approximates) — reference data, not secondary-market
  quotes.
- **Broker APIs** (Zerodha Kite Connect, Upstox, ICICI Breeze, etc.): can
  provide real-time quotes, but require a funded trading account, developer
  registration, and acceptance of a paid data-license — out of scope for a
  free personal app by default.

Given that, this app ships with:
1. A **mock provider** (default) generating realistic, clearly-labeled
   sample data — the app is fully usable with zero configuration.
2. A **documented, working NSE bhavcopy CSV parser**
   (`src/lib/providers/csvBhavcopyProvider.ts`) against NSE's standard
   column layout, unit-tested, ready to wire up once you have a real file
   source (manual download, your own scraper, or a paid vendor). It is not
   auto-fetching by default — see that file's header comment for why and how
   to complete the wiring.

Every provider implements one interface (`MarketDataProvider` in
`src/lib/providers/types.ts`); swapping providers means writing one new
class and changing `getMarketDataProvider()` — nothing else in the app
changes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js App Router (single deployable)                             │
│                                                                       │
│  UI (React, client components)        API routes (route handlers)   │
│  /            dashboard               /api/sgbs, /api/sgbs/[isin]   │
│  /sgb/[isin]  detail page             /api/rankings                 │
│  /alerts      alert rules + feed      /api/gold-price               │
│  /methodology static docs             /api/alerts, /api/alerts/[id] │
│                                        /api/refresh  (cron target)   │
│                                                                       │
│           ┌───────────────────────────────────────────┐            │
│           │  Calculation engine (src/lib/calc)         │            │
│           │  cash flows → XIRR → data quality → ranking│            │
│           │  pure functions, fully unit tested          │            │
│           └───────────────────────────────────────────┘            │
│                                                                       │
│  MarketDataProvider (src/lib/providers)      Ingestion (lib/ingest) │
│  MockMarketDataProvider (default) ─┐         upsert tranches,       │
│  CsvBhavcopyProvider (NSE, stub)  ─┼───────► append PriceSnapshot,  │
│  <your real provider here>       ─┘         write IngestionRun,     │
│                                              evaluate alerts         │
│                                                                       │
│  Prisma ORM ──► Postgres (Neon free tier, or any hosted Postgres)    │
└─────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS v4, Recharts
  for charts. Client components fetch from the API routes.
- **Backend**: Next.js Route Handlers (`src/app/api/**`) — no separate
  server process needed.
- **Database**: Postgres via Prisma. Deployed on [Neon](https://neon.tech)'s
  free tier so both local dev and the Vercel deployment point at the same
  kind of database (Vercel's serverless functions have no writable local
  disk, which rules out SQLite for hosting). Swapping to another Postgres
  host, or a different engine entirely, is a `provider`/`DATABASE_URL`
  change in `prisma/schema.prisma` — no application code depends on it.
- **Market-data ingestion**: `src/lib/ingest.ts` — one function
  (`runIngestion`) that fetches from the configured provider, upserts
  tranche master data, appends a price snapshot + gold price snapshot,
  logs an `IngestionRun`, and evaluates alerts. Used by both `POST
  /api/refresh` and the seed script.
- **Calculation engine**: `src/lib/calc/**` — pure, dependency-free
  functions (cash-flow construction, XIRR solver, data-quality/liquidity
  heuristics, ranking). No I/O, fully unit tested.
- **Scheduler**: `POST /api/refresh` (secret-guarded) is the trigger point.
  Point any scheduler at it: [Vercel
  Cron](https://vercel.com/docs/cron-jobs), a GitHub Actions
  `schedule:` workflow doing `curl`, or a plain OS cron job. Not baked into
  the app process itself, to keep the deployable simple and
  platform-agnostic.
- **Caching**: none beyond Postgres itself — the dataset is small (dozens of
  tranches, one row per session) and query cost is negligible for a
  personal app. Every API response also carries a `freshness` block so the
  UI can show a "data may be stale" banner instead of silently caching
  something wrong.
- **Alert system**: `AlertRule` rows evaluated by `src/lib/alerts.ts` at
  the end of every ingestion run; matches become `AlertEvent` rows shown in
  the `/alerts` feed. Optional browser push notifications (Web Push, see
  below) fire alongside each event; no email/webhook delivery is wired up.
- **Deployment**: any Node.js host that runs Next.js (Vercel is the path
  of least resistance). See "Deploying" below.
- **Monitoring/logging**: every ingestion run is logged to
  `IngestionRun` (status, tranches updated, error count/messages) and
  surfaced in the UI's freshness banner — no external observability
  service required for a personal deployment.

---

## Database schema

Defined in `prisma/schema.prisma`:

| Model | Purpose |
|---|---|
| `Tranche` | Master/reference data for one SGB series (unique symbol/ISIN, dates, issue price, coupon rate). Rarely changes. |
| `PriceSnapshot` | One point-in-time secondary-market quote per tranche per ingestion run — this *is* the price-history series. Carries `dataQuality`/`isStale`/`staleDays`. |
| `GoldPriceSnapshot` | Reference gold price (INR/gram, 999 purity) per day. |
| `IngestionRun` | Audit log of each refresh: provider, status, tranches updated, errors. |
| `AlertRule` | A user-configured condition (type + optional tranche scope + threshold). |
| `AlertEvent` | A concrete firing of a rule — the notification feed. |

---

## Calculation methodology (summary)

See `/methodology` in the running app for the full write-up. Key points:

- **8-year maturity**, semi-annual coupons on the **original issue price**
  (2.75%/yr for the first two tranches, 2.50%/yr thereafter), coupon dates
  approximated as exact 6-month steps from issue date.
- **No separate accrued-interest settlement** is modeled, matching how SGBs
  actually trade on NSE/BSE (buyer on the coupon record date gets the full
  coupon). An `accruedInterestInr` figure is shown for information only.
- **Three gold-price lenses**, always kept distinct in the UI:
  1. **Current discount/premium** — pure snapshot, no future assumption.
  2. **YTM, gold flat** — primary ranking metric.
  3. **YTM, projected** — user sets an annual gold-growth assumption
     (default 8%/yr) on the detail page; only affects that page's
     "projected" figures, never the dashboard ranking.
- **Transaction costs** (illustrative 0.25% brokerage + 0.10% other
  charges, `src/lib/calc/types.ts`) feed a net-of-costs YTM variant.
- **Data-quality gating**: stale (>6 days old), missing price, zero
  trailing volume, or a >15% single-session move all mark a quote
  unreliable and exclude it from the "cheapest" headline (still shown,
  flagged, in the full table). Wide spread (>3%) and low liquidity are
  shown as warnings but don't exclude a tranche on their own.

All of the above is implemented in `src/lib/calc/` and unit tested in
`src/lib/calc/*.test.ts` (33 tests covering XIRR correctness, discount/
premium/par pricing, maturity edge cases, and every data-quality flag).

---

## API reference

All routes are under `/api`, JSON in/out.

| Route | Method | Purpose |
|---|---|---|
| `/api/sgbs` | GET | All tranches with computed economics. Query: `goldGrowth`, `includeMatured`, `q` (search). |
| `/api/sgbs/:isin` | GET | Full detail: economics, cash-flow timeline, price history, gold history. Query: `goldGrowth`. |
| `/api/rankings` | GET | Pre-sliced dashboard lists: cheapest, top-5 by YTM/discount/return, most liquid, premium/discount. |
| `/api/gold-price` | GET | Gold reference price history. |
| `/api/refresh` | POST | Triggers one ingestion cycle. Guarded by `CRON_SECRET` (`Authorization: Bearer <secret>` or `?secret=`) when set. |
| `/api/alerts` | GET/POST | List / create alert rules. |
| `/api/alerts/:id` | PATCH/DELETE | Toggle active / delete a rule. |
| `/api/alerts/events` | GET | Triggered-alert feed. |
| `/api/alerts/events/:id` | PATCH | Acknowledge an event. |

---

## Setup

Requires Node.js 20+ and a Postgres database — a free
[Neon](https://neon.tech) project takes under a minute to create and gives
you a `DATABASE_URL` to paste in.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL (see above) and CRON_SECRET
npm run db:migrate            # apply migrations (creates the tables)
npm run db:seed               # load ~3 weeks of sample history + sample alert rules
npm run dev                   # http://localhost:3000
```

Run the test suite (pure calculation-engine tests, no database needed):

```bash
npm test
```

Type-check / lint:

```bash
npx tsc --noEmit
npm run lint
```

Reset the database at any time with `npm run db:reset` (re-runs migrations
+ seed — **destructive**, drops all data first).

---

## Deployment

Deployed at **https://sgbtracker-shivam-dixits-projects-6af37175.vercel.app**
(Vercel, auto-deploying from this repo's `main` branch; database is a Neon
Postgres project). To deploy your own copy:

1. **Database**: provision a Postgres instance (Neon, Supabase, Render,
   etc.) and grab its connection string.
2. **Vercel project**: import this repo in the Vercel dashboard (or `vercel
   link` / the Vercel MCP `create_git_project` tool) — it auto-detects
   Next.js. `npm run build` already runs `prisma migrate deploy` before
   `next build`, so every deploy applies any new migrations automatically.
3. **Environment variables** (Vercel dashboard → Project → Settings →
   Environment Variables, scope: all environments):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Postgres connection string |
   | `CRON_SECRET` | a random secret (`openssl rand -hex 32`) |
   | `USE_MOCK_PROVIDER` | `true` (until a real provider is wired up) |
   | `DEFAULT_GOLD_GROWTH_RATE_PCT` | `8` (or your preferred default) |

   Redeploy after adding them so the build/runtime picks them up.
4. **Seed data**: run `npm run db:seed` once against the production
   `DATABASE_URL` (locally, with `.env` pointed at it), or just call `POST
   /api/refresh` on the live URL once — the app will otherwise start empty
   and accumulate one day of data per scheduled refresh.
5. **Scheduler**: `vercel.json` in this repo already defines a Vercel Cron
   job hitting `/api/refresh` on weekday evenings; Vercel automatically
   sends `CRON_SECRET` as the request's Bearer token when that env var is
   set, matching what `/api/refresh` expects — no extra wiring needed once
   the env var above is in place. For any other host, point a scheduler
   (GitHub Actions `schedule:` + `curl`, a plain cron job, etc.) at `POST
   /api/refresh` with `Authorization: Bearer $CRON_SECRET`.

   `CRON_SECRET` also guards the endpoint from being triggered by anyone
   who finds the URL — never deploy to production without setting it.

---

## Publishing as an Android app (Indus Appstore / Oppo App Market)

The app is a installable PWA (`app/manifest.ts`, `public/sw.js`, icons in
`public/icons/`) — Lighthouse's installability checks (manifest + icons +
service worker + HTTPS) all pass against the deployed URL. That's the one
artifact both stores below need; skip Google Play and Apple App Store
entirely since neither was requested. Registration is free on both:

- **Indus Appstore** (PhonePe, India-focused): free developer registration,
  free app listing for the first year, 0% commission — [developer
  portal](https://developer.indusappstore.com/).
- **Oppo App Market**: free developer registration — [developer
  portal](https://developers.oppomobile.com/).

Steps:

1. **Package it**: [pwabuilder.com](https://www.pwabuilder.com) generates
   the Android package (it reads the manifest above automatically) — this
   was already done once; PWABuilder's own Android build produced an
   unsigned `.apk`/`.aab` (no signing options selected).
2. **Sign it**: an unsigned APK can't be installed or submitted anywhere.
   This one was signed (JAR/v1 signing scheme) with a fresh self-signed
   25-year app-signing key, generated and applied locally rather than via
   PWABuilder's own signer — verified independently with `jarsigner
   -verify`. The signed APK, the `.p12` keystore, and a text file with the
   password/fingerprint/instructions were sent directly to the app owner
   (never committed to this repo — it's public). Whoever holds that
   keystore file can publish updates to this exact app listing, so it must
   be kept somewhere durable outside this repo.
3. **Verify domain ownership**: `public/.well-known/assetlinks.json` in
   this repo is already populated with the real signing certificate's
   SHA-256 fingerprint (package `app.vercel.sgbtracker.twa`), so the
   installed app opens as a full-screen app instead of falling back to a
   browser tab.
4. **Submit** the signed APK to each store's developer portal (signup →
   create app listing → upload package → store listing assets [icon,
   screenshots, description] → privacy policy URL → submit for review).
   This step needs the app owner's own developer account on each store —
   it can't be done by an AI agent.
5. A **privacy policy page** is required by both stores — this repo ships
   one at `/privacy` (linked from the footer on every page), live at
   `https://sgbtracker.vercel.app/privacy`. Use that URL directly in each
   store's submission form.

If you ever regenerate the Android package (e.g. a future PWABuilder run
after a manifest change), re-sign it with the *same* keystore + password
so the store treats it as an update rather than a new app — never
generate a second keystore for this package name.

## Extending to a real data provider

1. Implement `MarketDataProvider` (`src/lib/providers/types.ts`) —
   `fetchAll(asOf?)` returning tranches, quotes, and a gold price.
   `csvBhavcopyProvider.ts` has a working NSE bhavcopy CSV parser to build
   on; wire in however you obtain the file (download, scraper, vendor API).
2. Return your provider from `getMarketDataProvider()`
   (`src/lib/providers/index.ts`) and set `USE_MOCK_PROVIDER=false`.
3. Nothing else changes — the calculation engine, API routes, and UI all
   consume `MarketDataProvider` output through the same shape.

Browser push notifications (Web Push) are already wired up — see
"Browser push notifications" below. To add another delivery channel
(email/webhook), follow the same pattern: hook into `evaluateAlerts` in
`src/lib/alerts.ts` at the point each `AlertEvent` is created (see the
`notifySubscribers(...)` calls already there).

---

## Browser push notifications

Alert rules can push a native browser notification the moment they fire,
via the [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
— no third-party notification service, just VAPID-signed pushes sent
directly from `src/lib/push.ts`. Off by default; turns on per-browser from
a toggle on the `/alerts` page.

Setup:

1. Generate a VAPID key pair: `npx web-push generate-vapid-keys`.
2. Set three env vars (locally in `.env`, and on Vercel under Project →
   Settings → Environment Variables):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the public key (safe to expose; it's
     bundled into the client).
   - `VAPID_PRIVATE_KEY` — the private key (server-only, keep secret).
   - `VAPID_SUBJECT` — a `mailto:` or `https:` URL identifying who's
     sending the pushes (required by the Web Push spec).
3. Redeploy. The "Browser notifications" toggle on `/alerts` only appears
   once `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set — until then the feature is
   fully absent client-side, and `notifySubscribers()` server-side is a
   silent no-op so alert evaluation is never affected either way.

How it works: `PushSubscription` rows (one per opted-in browser) are
created via `POST /api/push/subscribe` when a visitor clicks "Turn on",
and removed automatically if the push service reports the subscription as
expired (HTTP 404/410) the next time a send is attempted. The service
worker (`public/sw.js`) handles the `push` event (shows the notification)
and `notificationclick` (focuses or opens `/alerts`).

---

## Known limitations

- Coupon dates are approximated (exact 6-month steps), not the precise
  RBI-notified dates, which can shift a few days for weekends/holidays.
- Early redemption (allowed from year 5) is not separately modeled — all
  return figures assume hold-to-maturity.
- Transaction-cost assumptions are illustrative defaults, not any specific
  broker's real rates.
- Tranche identity is real, not synthetic: all 56 tranches in
  `src/lib/sampleData/realTranches.ts` (FY2017-18 through FY2023-24) —
  their true NSE symbol, official RBI series name, and maturity month/year
  — were sourced from live secondary-market data via the INDmoney MCP
  connector, a one-time snapshot captured 2026-08-25 (not an automated
  feed — see "Data sources" above for why). The very first two fiscal
  years (2015-16, 2016-17) aren't included: those tranches had already
  matured and dropped out of that data source's live-trading search index
  by the time this snapshot was taken.
- Still approximate: exact issue day-of-month (only month/year is encoded
  in the real symbol, so both issue and maturity dates are fixed at the
  5th), and issue price (not exposed by the data source, modeled from an
  illustrative gold-price curve). Each active tranche's current price
  starts from its real captured value and then follows a small simulated
  daily walk — see `mockProvider.ts` — so it drifts further from reality
  the longer this snapshot goes unrefreshed. Re-run the INDmoney pull
  (or wire up a real provider per "Extending" below) before relying on
  this for actual trading decisions.
