"use client";

import { useEffect, useState } from "react";
import { AlertEventDto, AlertRuleDto, SgbEconomicsDto } from "@/lib/clientTypes";
import { formatDate } from "@/lib/format";

const ALERT_TYPE_LABELS: Record<AlertRuleDto["type"], string> = {
  DISCOUNT_BELOW: "Discount to gold falls below X%",
  YTM_ABOVE: "YTM exceeds X%",
  PRICE_BELOW: "Price falls below ₹X",
  SPREAD_BELOW: "Bid/ask spread falls below X%",
  NEW_CHEAPEST: "A new tranche becomes the cheapest SGB",
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRuleDto[]>([]);
  const [events, setEvents] = useState<AlertEventDto[]>([]);
  const [tranches, setTranches] = useState<SgbEconomicsDto[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [rulesRes, eventsRes, sgbsRes] = await Promise.all([
      fetch("/api/alerts"),
      fetch("/api/alerts/events"),
      fetch("/api/sgbs"),
    ]);
    setRules((await rulesRes.json()).data);
    setEvents((await eventsRes.json()).data);
    setTranches((await sgbsRes.json()).data);
    setLoading(false);
  }

  useEffect(() => {
    // Fetch-on-mount, reusing the same loader the mutation handlers below call
    // to refresh after a change. eslint-disable: the loader's setState calls
    // all happen after an awaited fetch, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, []);

  async function toggleRule(id: string, isActive: boolean) {
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    loadAll();
  }

  async function deleteRule(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function acknowledgeEvent(id: string) {
    await fetch(`/api/alerts/events/${id}`, { method: "PATCH" });
    loadAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Rules are checked after every data refresh. There is no email/push delivery in this
          build — triggered alerts show up in the feed below (see Methodology for how to extend
          this to real notifications).
        </p>
      </div>

      <CreateRuleForm tranches={tranches} onCreated={loadAll} />

      <div>
        <h2 className="text-lg font-semibold mb-2">Your rules</h2>
        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : rules.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No alert rules yet — create one above.</p>
        ) : (
          <div className="rounded-xl border divide-y" style={{ background: "var(--surface)" }}>
            {rules.map((r) => (
              <div key={r.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">{r.label || ALERT_TYPE_LABELS[r.type]}</div>
                  <div style={{ color: "var(--muted)" }}>
                    {ALERT_TYPE_LABELS[r.type]}
                    {r.thresholdValue !== null && ` · threshold ${r.thresholdValue}`}
                    {r.tranche ? ` · ${r.tranche.seriesName}` : " · all tranches"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                    <input type="checkbox" checked={r.isActive} onChange={(e) => toggleRule(r.id, e.target.checked)} />
                    Active
                  </label>
                  <button
                    onClick={() => deleteRule(r.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Triggered alerts</h2>
        {events.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No alerts have fired yet.</p>
        ) : (
          <div className="rounded-xl border divide-y" style={{ background: "var(--surface)" }}>
            {events.map((e) => (
              <div key={e.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className={e.acknowledged ? "" : "font-medium"}>{e.message}</div>
                  <div style={{ color: "var(--muted)" }}>{formatDate(e.triggeredAt)}</div>
                </div>
                {!e.acknowledged && (
                  <button
                    onClick={() => acknowledgeEvent(e.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRuleForm({ tranches, onCreated }: { tranches: SgbEconomicsDto[]; onCreated: () => void }) {
  const [type, setType] = useState<AlertRuleDto["type"]>("YTM_ABOVE");
  const [isin, setIsin] = useState("");
  const [threshold, setThreshold] = useState("8");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsThreshold = type !== "NEW_CHEAPEST";
  const canScope = type !== "NEW_CHEAPEST";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          isin: canScope && isin ? isin : null,
          thresholdValue: needsThreshold ? Number(threshold) : null,
          label: label || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.formErrors?.join(", ") ?? body.error ?? "Failed to create alert");
      }
      setLabel("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end" style={{ background: "var(--surface)" }}>
      <Field label="Condition">
        <select value={type} onChange={(e) => setType(e.target.value as AlertRuleDto["type"])} className="w-full rounded-md border px-2 py-1.5 text-sm bg-transparent">
          {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>

      {needsThreshold && (
        <Field label="Threshold">
          <input
            type="number"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full rounded-md border px-2 py-1.5 text-sm bg-transparent"
          />
        </Field>
      )}

      {canScope && (
        <Field label="Scope">
          <select value={isin} onChange={(e) => setIsin(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm bg-transparent">
            <option value="">All tranches</option>
            {tranches.map((t) => (
              <option key={t.isin} value={t.isin}>
                {t.seriesName}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Label (optional)">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Watch for a good entry"
          className="w-full rounded-md border px-2 py-1.5 text-sm bg-transparent"
        />
      </Field>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#1a1305" }}
        >
          {submitting ? "Creating…" : "Create alert"}
        </button>
      </div>

      {error && <p className="text-xs sm:col-span-2 lg:col-span-5" style={{ color: "var(--negative)" }}>{error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
