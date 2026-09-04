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
          Rules are checked after every data refresh. Triggered alerts always show up in the feed
          below — turn on browser notifications too if you want a push alert the moment one fires.
        </p>
      </div>

      <PushNotificationToggle />

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

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

function PushNotificationToggle() {
  const [status, setStatus] = useState<"unsupported" | "unconfigured" | "denied" | "off" | "on" | "checking">(
    "checking"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;
  if (status === "unsupported") return null;
  if (status === "unconfigured") return null;

  return (
    <div className="rounded-xl border p-3 flex items-center justify-between gap-3 text-sm" style={{ background: "var(--surface)" }}>
      <div>
        <div className="font-medium">Browser notifications</div>
        <div style={{ color: "var(--muted)" }}>
          {status === "denied"
            ? "Blocked in your browser's site settings — enable notifications for this site to turn this on."
            : status === "on"
              ? "You'll get a push notification the moment an alert fires."
              : "Get a push notification the moment an alert fires, even if this tab isn't open."}
        </div>
      </div>
      {status !== "denied" && (
        <button
          onClick={status === "on" ? disable : enable}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/10 shrink-0 disabled:opacity-50"
        >
          {busy ? "…" : status === "on" ? "Turn off" : "Turn on"}
        </button>
      )}
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
