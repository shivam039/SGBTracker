# Decisions Log — SGBTracker

Short, append-only record of architecture/design decisions and why. A
decision belongs here if a future session (or a future you) would otherwise
have to re-derive it from scratch by reading git history.

## Format

```
### YYYY-MM-DD — short title

**Decision:** what was decided.
**Why:** the constraint or trade-off that drove it.
**Rejected:** what else was considered, and why it lost.
```

<!-- Entries go below this line, newest first. -->

### 2026-08-24 — Switched database provider to Postgres (Neon) for Vercel deployment

**Decision:** Changed `prisma/schema.prisma` datasource from SQLite to
PostgreSQL, regenerated the initial migration for the Postgres dialect,
provisioned a Neon project, and applied that migration to it manually via
the Neon MCP `run_sql_transaction` tool (plus a hand-inserted
`_prisma_migrations` bookkeeping row) instead of `prisma migrate dev/deploy`.
Added `prisma migrate deploy` ahead of `next build` in the `build` script so
future migrations apply automatically on Vercel.

**Why:** Vercel's serverless functions have no writable local filesystem, so
the SQLite setup from earlier in this project can't be hosted there — the
app needed a real network-reachable database to deploy. Applying the
migration via Neon MCP rather than the Prisma CLI was forced, not chosen:
this sandbox's egress proxy explicitly blocks raw-TCP database connections
(confirmed via `/root/.ccr/README.md`), so `prisma migrate dev/deploy`
against the live Neon connection string returns P1001 from here. The Neon
MCP tools route over HTTPS instead, so they work. The bookkeeping row was
inserted manually (matching Prisma's known `_prisma_migrations` schema and
checksum algorithm) so a later `prisma migrate deploy` — which *will* have
real DB connectivity once it's running on Vercel — recognizes this
migration as already applied instead of re-running its `CREATE TABLE`
statements against tables that already exist.

**Rejected:**
- *Keep SQLite for local dev, Postgres only in production* — would require
  maintaining two schema files or a templated one; Prisma's datasource
  `provider` is static per schema, so a dual setup adds real complexity for
  a personal project. Single Postgres provider everywhere was simpler and
  keeps local/prod behavior identical.
- *Run `prisma migrate deploy` from this sandbox* — impossible given the
  raw-TCP restriction; not attempted as a workaround (e.g. tunneling) since
  the proxy docs explicitly say to report this class of failure, not route
  around it.
- *Seed production data from this sandbox* — same TCP restriction rules out
  running `prisma/seed.ts` against the live Neon URL from here. Left as a
  follow-up: call `POST /api/refresh` on the deployed URL once it's live
  (plain HTTPS, unaffected by the restriction) to populate the first day of
  data, then let the Vercel Cron job accumulate history from there.
