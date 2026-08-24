export const metadata = { title: "Methodology — SGB Tracker" };

export default function MethodologyPage() {
  return (
    <article className="prose-like max-w-3xl space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-xl font-semibold mb-2">Calculation methodology</h1>
        <p style={{ color: "var(--muted)" }}>
          This page documents exactly how &ldquo;cheapest SGB&rdquo; is defined and computed, and
          every assumption behind the numbers shown in the app.
        </p>
      </div>

      <Section title="How &ldquo;cheapest&rdquo; is defined">
        <p>
          <strong>Cheapest SGB = the reliably-priced, actively-tradable tranche with the highest
          annualized YTM</strong>, where YTM is the internal rate of return (IRR) of the dated cash
          flows from buying one unit today:
        </p>
        <CodeBlock>
{`CF(t=0)        = -marketPrice
CF(coupon_i)   = +semiAnnualCoupon           for each remaining coupon date
CF(maturity)   = +semiAnnualCoupon + redemptionValue   (final coupon + redemption, same date)

redemptionValue = goldReferencePrice   (gold price held FLAT — see below)

Solve for annual rate r such that:  Σ CF(t) / (1+r)^(years to t)  =  0`}
        </CodeBlock>
        <p>
          This is <em>not</em> the same as picking the lowest market price, or the deepest discount
          to gold. Raw price ignores tenure and coupon income; raw discount-to-gold is a useful
          model-free snapshot but ignores the coupons earned while waiting and how much time the
          discount has to close. YTM converts price + coupons + tenure + redemption into one
          annualized number that is directly comparable across tranches with different maturities,
          prices, and coupon schedules.
        </p>
        <p>
          The gold price is held <strong>flat</strong> at today&apos;s reference value for the primary
          ranking (rather than assuming appreciation), specifically so the comparison stays free of
          a speculative gold-price forecast: every tranche is judged under the same neutral
          assumption, so differences in YTM come only from how each tranche is priced today relative
          to its own cash flows.
        </p>
        <p>
          Tranches with stale, missing, illiquid, or suspect price data are excluded from the
          &ldquo;cheapest right now&rdquo; headline even if their computed YTM looks attractive,
          because that number can&apos;t be trusted. They remain visible in the full table with a
          warning badge.
        </p>
      </Section>

      <Section title="Three gold-price lenses">
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <strong>Current discount/premium</strong> — a pure snapshot: (market price − today&apos;s
            gold reference price) ÷ today&apos;s gold reference price. No future assumption at all.
          </li>
          <li>
            <strong>Return assuming gold stays flat</strong> — the primary YTM figure above. The
            redemption leg uses today&apos;s gold reference price, unchanged.
          </li>
          <li>
            <strong>Return assuming a user-defined growth rate</strong> — the &ldquo;projected&rdquo;
            YTM on each detail page. You set an annual gold growth assumption (default 8%/yr,
            adjustable per session); the redemption leg becomes{" "}
            <code>goldPrice × (1 + g)^yearsToMaturity</code>.
          </li>
        </ol>
      </Section>

      <Section title="Other figures on the detail page">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Simple annualized return</strong> — a naive CAGR:{" "}
            <code>(totalCashFlows / purchasePrice)^(1/years) − 1</code>. Easier to read than YTM but
            ignores the timing of individual cash flows (a coupon next month counts the same as one
            in year 7). YTM is the more rigorous figure and is what ranking uses.
          </li>
          <li>
            <strong>Accrued interest</strong> — shown for information only. Unlike conventional
            bonds, SGB secondary-market trades on NSE/BSE settle at the clean quoted price with no
            separate accrued-interest invoice: whoever holds the units on the coupon record date
            gets the full semi-annual coupon. This figure just shows how close you are to that date.
          </li>
          <li>
            <strong>YTM net of costs</strong> — the gold-flat YTM recomputed against the purchase
            price inflated by an assumed 0.25% brokerage + 0.10% other charges (STT/stamp
            duty/GST/DP charges), configurable in <code>src/lib/calc/types.ts</code>. These are
            illustrative defaults, not your broker&apos;s real rates.
          </li>
        </ul>
      </Section>

      <Section title="Data-quality & liquidity rules">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Stale</strong> — latest quote is older than 6 calendar days.</li>
          <li><strong>No recent trade</strong> — zero traded volume across the whole trailing window.</li>
          <li><strong>Wide spread</strong> — (ask − bid) / mid price exceeds 3%.</li>
          <li><strong>Low liquidity / Illiquid</strong> — trailing 6-session average volume below 25g (moderate) or 0 (illiquid).</li>
          <li><strong>Suspect move</strong> — single-session price move vs. the prior snapshot exceeds 15%.</li>
          <li>
            A tranche is <strong>reliable</strong> (eligible for &ldquo;cheapest&rdquo;) only if none
            of Stale / Missing price / No recent trade / Suspect move apply. Wide spread and low
            liquidity are shown as warnings but don&apos;t exclude a tranche on their own.
          </li>
        </ul>
      </Section>

      <Section title="SGB mechanics modeled">
        <ul className="list-disc pl-5 space-y-1">
          <li>8-year maturity from issue date; early-exit window opens at year 5 (not separately modeled — this app assumes hold-to-maturity economics).</li>
          <li>Interest paid semi-annually on the <em>original issue price</em>, at the tranche&apos;s fixed coupon rate (2.75%/yr for the first two tranches, 2.50%/yr thereafter).</li>
          <li>Coupon dates are approximated as exact 6-month steps from the issue date (real RBI-notified dates can shift a few days for weekends/holidays).</li>
          <li>Redemption value methodology mirrors RBI&apos;s (simple average of IBJA 999-purity closing gold price over the preceding business days) — approximated here with the latest available reference price, since the true future average is unknowable in advance.</li>
        </ul>
      </Section>

      <Section title="Data source">
        <p>
          No free, licensed, real-time (or even reliably free EOD) API for Indian SGB
          secondary-market prices was found during research for this app. Real-time quotes require a
          paid broker API (e.g. Zerodha Kite Connect, Upstox, ICICI Breeze) tied to a funded trading
          account. The most realistic free/legal path is downloading NSE/BSE&apos;s daily EOD bhavcopy
          files for personal, non-systematic use — see{" "}
          <code>src/lib/providers/csvBhavcopyProvider.ts</code> for a working parser against NSE&apos;s
          standard bhavcopy layout, ready to wire up once you have a real file source. Until then, this
          app runs entirely on the seeded mock provider, clearly labeled everywhere prices appear.
        </p>
      </Section>

      <Section title="Not investment advice">
        <p>
          This is an educational/research tool. YTM and projected figures are model outputs based on
          the stated assumptions, not guarantees. Always verify prices and dates against an official
          source before trading.
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

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="text-xs rounded-md p-3 overflow-x-auto"
      style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}
    >
      <code>{children}</code>
    </pre>
  );
}
