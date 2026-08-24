import { describe, expect, it } from "vitest";
import { parseNseBhavcopyCsv } from "./csvBhavcopyProvider";

const SAMPLE_CSV = `SYMBOL,SERIES,DATE1,PREV_CLOSE,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,LAST_PRICE,CLOSE_PRICE,AVG_PRICE,TTL_TRD_QNTY,TURNOVER_LACS,NO_OF_TRADES,DELIV_QTY,DELIV_PER,ISIN,TRADE_DATE
SGB2018I,GB,05-JAN-2024,5100.00,5110.00,5150.00,5090.00,5132.11,5130.00,5120.00,317,16.23,42,300,94.6,INSGB010SAMPLE,05-JAN-2024
SGB2020II,GB,05-JAN-2024,5200.00,5205.00,5210.00,5195.00,5201.00,5200.00,5202.00,0,0,0,0,0,INSGB999OTHER,05-JAN-2024
`;

describe("parseNseBhavcopyCsv", () => {
  it("parses whitelisted ISIN rows into PriceQuote objects", () => {
    const quotes = parseNseBhavcopyCsv(SAMPLE_CSV, new Set(["INSGB010SAMPLE"]));
    expect(quotes).toHaveLength(1);
    const q = quotes[0];
    expect(q.isin).toBe("INSGB010SAMPLE");
    expect(q.lastTradedPrice).toBeCloseTo(5132.11);
    expect(q.volumeUnits).toBe(317);
    expect(q.numTrades).toBe(42);
    expect(q.exchange).toBe("NSE");
    expect(q.asOf.getFullYear()).toBe(2024);
    expect(q.asOf.getMonth()).toBe(0); // January
    expect(q.asOf.getDate()).toBe(5);
  });

  it("skips ISINs not in the whitelist", () => {
    const quotes = parseNseBhavcopyCsv(SAMPLE_CSV, new Set(["SOME_OTHER_ISIN"]));
    expect(quotes).toHaveLength(0);
  });

  it("returns an empty array for a header-only or empty file", () => {
    expect(parseNseBhavcopyCsv("", new Set(["X"]))).toHaveLength(0);
    expect(parseNseBhavcopyCsv("SYMBOL,ISIN\n", new Set(["X"]))).toHaveLength(0);
  });

  it("falls back to CLOSE_PRICE when LAST_PRICE is blank", () => {
    const csv = `SYMBOL,LAST_PRICE,CLOSE_PRICE,TTL_TRD_QNTY,NO_OF_TRADES,ISIN,TRADE_DATE
SGBX,,5250.50,10,2,INSGBX,05-JAN-2024
`;
    const quotes = parseNseBhavcopyCsv(csv, new Set(["INSGBX"]));
    expect(quotes).toHaveLength(1);
    expect(quotes[0].lastTradedPrice).toBeCloseTo(5250.5);
  });
});
