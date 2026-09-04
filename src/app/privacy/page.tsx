export const metadata = { title: "Privacy Policy — SGB Tracker" };

const LAST_UPDATED = "4 September 2026";

export default function PrivacyPage() {
  return (
    <article className="prose-like max-w-3xl space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-xl font-semibold mb-2">Privacy policy</h1>
        <p style={{ color: "var(--muted)" }}>Last updated: {LAST_UPDATED}</p>
      </div>

      <Section title="Summary">
        <p>
          SGB Tracker is a free, educational tool for tracking Sovereign Gold Bond secondary-market
          tranches. It does not require an account, does not collect personal information, and does
          not sell or share data with third parties. There are no ads and no analytics/tracking
          scripts in the app.
        </p>
      </Section>

      <Section title="What data this app stores">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Bond price and gold price data</strong> — sourced from the app&apos;s own data
            provider (currently a labeled mock/simulated feed; see the{" "}
            <a href="/methodology" className="underline">methodology page</a> for details) and stored
            in the app&apos;s own database. This is market data, not personal data.
          </li>
          <li>
            <strong>Alert rules you create</strong> (e.g. &ldquo;notify me if YTM for tranche X rises
            above Y%&rdquo;) — stored in the app&apos;s database so they persist across visits. These
            contain only the rule parameters you enter (tranche, threshold, condition), not any
            personal or contact information.
          </li>
          <li>
            <strong>An optional admin refresh secret</strong> — if you use the{" "}
            <a href="/admin" className="underline">admin page</a> to trigger data refreshes, the
            secret you enter is stored only in your own browser&apos;s local storage (
            <code>localStorage</code>), never transmitted anywhere except as an authorization header
            to this app&apos;s own refresh endpoint, and never sent to any third party.
          </li>
        </ul>
      </Section>

      <Section title="What this app does not do">
        <ul className="list-disc pl-5 space-y-1">
          <li>No account creation, login, or personal profile data.</li>
          <li>No advertising, ad networks, or ad identifiers.</li>
          <li>No third-party analytics or tracking cookies.</li>
          <li>No sale or sharing of any data with third parties.</li>
          <li>No access to device contacts, location, camera, or microphone.</li>
        </ul>
      </Section>

      <Section title="Service worker and offline storage">
        <p>
          When installed as an app (PWA/Android), a small service worker caches the static app shell
          (page layout and icons) on your device so the app can still open when briefly offline. It
          deliberately never caches live price data from <code>/api/*</code> — every price shown is
          fetched fresh from the network, never served from a stale local cache.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          Alert rules remain stored until you delete them from the{" "}
          <a href="/alerts" className="underline">alerts page</a>. The admin refresh secret can be
          cleared at any time from the admin page, which removes it from your browser&apos;s local
          storage immediately.
        </p>
      </Section>

      <Section title="Not investment advice">
        <p>
          This app is an educational/research tool. Figures shown are model outputs based on stated
          assumptions, not guarantees, and may be based on simulated sample data — always check the
          data-freshness banner before acting on any figure. Nothing in this app constitutes
          investment advice.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or the app can be raised via the project&apos;s{" "}
          <a
            href="https://github.com/shivam039/SGBTracker"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border p-4 space-y-2" style={{ background: "var(--surface)" }}>
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
