import { describe, expect, it } from "vitest";
import { assessDataQuality } from "./dataQuality";
import { LatestMarketData, RecentSnapshot } from "./types";

const NOW = new Date("2024-06-20");

function window(days: number, price = 100, volume = 50): RecentSnapshot[] {
  return Array.from({ length: days }, (_, i) => ({
    asOf: new Date(NOW.getTime() - i * 24 * 3600 * 1000),
    lastTradedPrice: price,
    volumeUnits: volume,
  }));
}

describe("assessDataQuality", () => {
  it("marks a fresh, liquid, tight-spread quote as fully reliable", () => {
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: 100, bidPrice: 99.5, askPrice: 100.5, volumeUnits: 50, exchange: "MOCK" };
    const result = assessDataQuality(latest, window(6), NOW);
    expect(result.isReliable).toBe(true);
    expect(result.flags).toHaveLength(0);
    expect(result.liquidityTier).toBe("LIQUID");
  });

  it("flags a quote older than the staleness threshold", () => {
    const oldDate = new Date(NOW.getTime() - 10 * 24 * 3600 * 1000);
    const latest: LatestMarketData = { asOf: oldDate, lastTradedPrice: 100, bidPrice: 99, askPrice: 101, volumeUnits: 50, exchange: "MOCK" };
    const result = assessDataQuality(latest, window(6), NOW);
    expect(result.flags).toContain("STALE");
    expect(result.isReliable).toBe(false);
  });

  it("flags a missing price", () => {
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: null, bidPrice: null, askPrice: null, volumeUnits: 0, exchange: "MOCK" };
    const result = assessDataQuality(latest, [], NOW);
    expect(result.flags).toContain("MISSING_PRICE");
    expect(result.isReliable).toBe(false);
  });

  it("flags zero traded volume across the whole window as no recent trade / illiquid", () => {
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: 100, bidPrice: 99, askPrice: 101, volumeUnits: 0, exchange: "MOCK" };
    const result = assessDataQuality(latest, window(6, 100, 0), NOW);
    expect(result.flags).toContain("NO_RECENT_TRADE");
    expect(result.liquidityTier).toBe("ILLIQUID");
    expect(result.isReliable).toBe(false);
  });

  it("flags a wide bid/ask spread but does not by itself mark data unreliable", () => {
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: 100, bidPrice: 90, askPrice: 110, volumeUnits: 50, exchange: "MOCK" };
    const result = assessDataQuality(latest, window(6), NOW);
    expect(result.flags).toContain("WIDE_SPREAD");
    expect(result.spreadPct).toBeCloseTo(20, 0);
    expect(result.isReliable).toBe(true); // wide spread alone doesn't disqualify
  });

  it("flags a suspect single-session move vs. the prior snapshot", () => {
    const priorWindow: RecentSnapshot[] = [
      { asOf: new Date(NOW.getTime() - 24 * 3600 * 1000), lastTradedPrice: 100, volumeUnits: 50 },
      { asOf: new Date(NOW.getTime() - 2 * 24 * 3600 * 1000), lastTradedPrice: 99, volumeUnits: 50 },
    ];
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: 130, bidPrice: 129, askPrice: 131, volumeUnits: 50, exchange: "MOCK" };
    const result = assessDataQuality(latest, priorWindow, NOW);
    expect(result.flags).toContain("SUSPECT_MOVE");
    expect(result.isReliable).toBe(false);
  });

  it("classifies liquidity tiers by trailing average volume", () => {
    const latest: LatestMarketData = { asOf: NOW, lastTradedPrice: 100, bidPrice: 99, askPrice: 101, volumeUnits: 10, exchange: "MOCK" };
    const moderate = assessDataQuality(latest, window(6, 100, 10), NOW);
    expect(moderate.liquidityTier).toBe("MODERATE");

    const low = assessDataQuality(latest, window(6, 100, 2), NOW);
    expect(low.liquidityTier).toBe("LOW");
  });
});
