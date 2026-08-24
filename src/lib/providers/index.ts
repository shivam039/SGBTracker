import { MarketDataProvider } from "./types";
import { MockMarketDataProvider } from "./mockProvider";

export * from "./types";
export { MockMarketDataProvider } from "./mockProvider";
export { parseNseBhavcopyCsv } from "./csvBhavcopyProvider";

/**
 * Provider factory. Reads USE_MOCK_PROVIDER (default: true) so the app runs
 * out of the box with no live data source configured. To go live, implement
 * a MarketDataProvider (see csvBhavcopyProvider.ts for the documented path)
 * and return it here instead — nothing else in the app needs to change.
 */
export function getMarketDataProvider(): MarketDataProvider {
  const useMock = process.env.USE_MOCK_PROVIDER !== "false";
  if (!useMock) {
    throw new Error(
      "USE_MOCK_PROVIDER=false but no real MarketDataProvider is wired up yet. " +
        "Implement one (see src/lib/providers/csvBhavcopyProvider.ts) and return it from getMarketDataProvider()."
    );
  }
  return new MockMarketDataProvider();
}
