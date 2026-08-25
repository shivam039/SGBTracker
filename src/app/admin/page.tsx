"use client";

import { useEffect, useState } from "react";
import { FreshnessMetaDto } from "@/lib/clientTypes";
import { formatDate } from "@/lib/format";

const SECRET_STORAGE_KEY = "sgbtracker.cronSecret";

interface RefreshResult {
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  tranchesUpdated: number;
  warnings: string[];
  alertsFired: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<FreshnessMetaDto | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SECRET_STORAGE_KEY);
    if (stored) {
      // Hydrating from localStorage on mount is inherently synchronous (no
      // await point) — the standard pattern for this, not an accidental
      // fetch-in-effect the lint rule is meant to catch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecret(stored);
      setSaved(true);
    }
    void loadFreshness();
  }, []);

  async function loadFreshness() {
    try {
      const res = await fetch("/api/rankings");
      if (res.ok) {
        const json = await res.json();
        setFreshness(json.freshness ?? null);
      }
    } catch {
      // best-effort, ignore
    }
  }

  function saveSecret() {
    window.localStorage.setItem(SECRET_STORAGE_KEY, secret);
    setSaved(true);
  }

  function clearSecret() {
    window.localStorage.removeItem(SECRET_STORAGE_KEY);
    setSecret("");
    setSaved(false);
  }

  async function runRefresh() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Refresh failed (${res.status})`);
      }
      setResult(json);
      await loadFreshness();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Manually trigger a data refresh — the same thing the scheduled Vercel Cron job does
          automatically on weekday evenings. Your secret is stored only in this browser
          (localStorage), never sent anywhere except this app&apos;s own <code>/api/refresh</code>{" "}
          endpoint.
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-sm">Refresh secret</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setSaved(false);
            }}
            placeholder="CRON_SECRET"
            className="flex-1 min-w-[220px] rounded-md border px-3 py-1.5 text-sm bg-transparent"
          />
          <button
            onClick={saveSecret}
            disabled={!secret || saved}
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
          >
            {saved ? "Saved" : "Save"}
          </button>
          {saved && (
            <button
              onClick={clearSecret}
              className="text-xs px-2 py-1.5 rounded-md border hover:bg-black/5 dark:hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-sm">Trigger refresh</h2>
        <button
          onClick={runRefresh}
          disabled={loading || !secret}
          className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#1a1305" }}
        >
          {loading ? "Refreshing…" : "Refresh now"}
        </button>

        {error && (
          <p className="text-sm" style={{ color: "var(--negative)" }}>
            {error}
          </p>
        )}

        {result && (
          <div className="text-sm space-y-1 pt-2 border-t">
            <Row label="Status" value={result.status} />
            <Row label="Tranches updated" value={String(result.tranchesUpdated)} />
            <Row label="Alerts fired" value={String(result.alertsFired)} />
            {result.warnings.length > 0 && (
              <Row label="Warnings" value={result.warnings.join("; ")} />
            )}
          </div>
        )}
      </div>

      {freshness && (
        <div className="rounded-xl border p-4 space-y-2 text-sm" style={{ background: "var(--surface)" }}>
          <h2 className="font-semibold">Current freshness</h2>
          <Row label="Provider" value={freshness.providerLabel} />
          <Row label="Gold reference as of" value={formatDate(freshness.goldPriceAsOf)} />
          {freshness.latestRun && (
            <>
              <Row label="Last run status" value={freshness.latestRun.status} />
              <Row label="Last run tranches" value={String(freshness.latestRun.tranchesUpdated)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
