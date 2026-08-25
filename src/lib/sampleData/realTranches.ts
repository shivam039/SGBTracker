/**
 * REAL SGB tranche reference data — sourced from live secondary-market data
 * (INDmoney) on 2026-08-25, not synthetically generated.
 *
 * Each entry is a real, currently- or recently-listed SGB tranche: its true
 * NSE trading symbol, official RBI series name, and maturity month/year
 * (derived from the symbol, cross-checked against each entry's official
 * name). `anchorPriceInr`/`anchorAsOf`/`anchorVolumeUnits` are the real
 * last-traded price and volume captured at that moment — used by the mock
 * provider as a realistic starting point for day-to-day simulation, since
 * this app has no automated live feed (see README "Data sources": MCP
 * connectors are scoped to an agent chat session, not to a deployed web
 * server, so this list is a manually-refreshed snapshot, not a live feed).
 *
 * NOT real: issuePriceInr (not exposed by the data source; approximated
 * from the gold-price curve in tranches.ts, same caveat as before) and the
 * exact issue day-of-month (the symbol only encodes month+year of
 * maturity; day is fixed at the 5th as an approximation). Coupon rate is
 * uniformly 2.5%/yr, correct for every tranche here (all postdate the two
 * 2.75% tranches from Nov 2015/Jan 2016, which are not in this list — they
 * already matured and dropped out of the live-trading data source's
 * search index, so no verified real data was available for them or for
 * the rest of FY2015-16/FY2016-17).
 */

export interface RealTrancheDef {
  symbol: string;
  officialName: string; // e.g. "Sovereign Gold Bond Scheme 2018-19 - Series III"
  maturityYear: number;
  maturityMonth: number; // 1-12
  anchorPriceInr: number;
  anchorAsOf: string; // ISO-ish timestamp as returned by the data source
  anchorVolumeUnits: number;
}

export const REAL_SGB_TRANCHES: RealTrancheDef[] = [
  // FY2017-18
  { symbol: "SGBJUL25", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series II", maturityYear: 2025, maturityMonth: 7, anchorPriceInr: 9970.01, anchorAsOf: "2025-07-23T16:02:17", anchorVolumeUnits: 128 },
  { symbol: "SGBOCT25", officialName: "Sovereign Gold Bond 2017-18 - Series III", maturityYear: 2025, maturityMonth: 10, anchorPriceInr: 12585, anchorAsOf: "2025-10-13T16:01:07", anchorVolumeUnits: 21 },
  { symbol: "SGBOCT25IV", officialName: "Sovereign Gold Bond 2017-18 - Series IV", maturityYear: 2025, maturityMonth: 10, anchorPriceInr: 12850, anchorAsOf: "2025-10-16T16:01:08", anchorVolumeUnits: 34 },
  { symbol: "SGBOCT25V", officialName: "Sovereign Gold Bond 2017-18 - Series V", maturityYear: 2025, maturityMonth: 10, anchorPriceInr: 12262, anchorAsOf: "2025-10-27T16:01:09", anchorVolumeUnits: 3 },
  { symbol: "SGBNOV25VI", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series VI", maturityYear: 2025, maturityMonth: 11, anchorPriceInr: 12500, anchorAsOf: "2025-10-31T16:01:15", anchorVolumeUnits: 15 },
  { symbol: "SGBNOV25", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series VII", maturityYear: 2025, maturityMonth: 11, anchorPriceInr: 12410.01, anchorAsOf: "2025-11-10T16:01:33", anchorVolumeUnits: 0 },
  { symbol: "SGBNOV258", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series VIII", maturityYear: 2025, maturityMonth: 11, anchorPriceInr: 12900, anchorAsOf: "2025-11-17T16:01:11", anchorVolumeUnits: 3 },
  { symbol: "SGBNOV25IX", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series IX", maturityYear: 2025, maturityMonth: 11, anchorPriceInr: 12250, anchorAsOf: "2025-11-24T16:01:17", anchorVolumeUnits: 32 },
  { symbol: "SGBDEC25", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series X", maturityYear: 2025, maturityMonth: 12, anchorPriceInr: 12690, anchorAsOf: "2025-12-01T16:01:23", anchorVolumeUnits: 18 },
  { symbol: "SGBDEC25XI", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series XI", maturityYear: 2025, maturityMonth: 12, anchorPriceInr: 13400, anchorAsOf: "2025-12-08T16:01:07", anchorVolumeUnits: 0 },
  { symbol: "SGBDEC2512", officialName: "Sovereign Gold Bond Scheme 2017-18 - Series XII", maturityYear: 2025, maturityMonth: 12, anchorPriceInr: 13400, anchorAsOf: "2025-12-15T16:01:08", anchorVolumeUnits: 6 },

  // FY2018-19
  { symbol: "SGBMAY26", officialName: "Sovereign Gold Bond Scheme 2018-19 - Series I", maturityYear: 2026, maturityMonth: 5, anchorPriceInr: 14799.22, anchorAsOf: "2026-04-29T16:01:18", anchorVolumeUnits: 74 },
  { symbol: "SGBOCT26", officialName: "Sovereign Gold Bond Scheme 2018-19 - Series II", maturityYear: 2026, maturityMonth: 10, anchorPriceInr: 16005, anchorAsOf: "2026-08-25T09:30:27", anchorVolumeUnits: 4 },
  { symbol: "SGBNOV26", officialName: "Sovereign Gold Bond Scheme 2018-19 - Series III", maturityYear: 2026, maturityMonth: 11, anchorPriceInr: 15900, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 10 },
  { symbol: "SGBDEC26", officialName: "Sovereign Gold Bond Scheme 2018-19 - Series IV", maturityYear: 2026, maturityMonth: 12, anchorPriceInr: 15949, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 46 },
  { symbol: "SGBJAN27", officialName: "Sovereign Gold Bond Scheme 2018-19 - Series V", maturityYear: 2027, maturityMonth: 1, anchorPriceInr: 15948, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 16 },
  { symbol: "SGBFEB27", officialName: "Sovereign Gold Bonds 2018-19 Series VI", maturityYear: 2027, maturityMonth: 2, anchorPriceInr: 15899, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 1 },

  // FY2019-20
  { symbol: "SGBJUN27", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series I", maturityYear: 2027, maturityMonth: 6, anchorPriceInr: 15905.01, anchorAsOf: "2026-08-25T09:42:31", anchorVolumeUnits: 3 },
  { symbol: "SGBJUL27", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series II", maturityYear: 2027, maturityMonth: 7, anchorPriceInr: 15892.22, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 36 },
  { symbol: "SGBAUG27", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series III", maturityYear: 2027, maturityMonth: 8, anchorPriceInr: 15945, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 87 },
  { symbol: "SGBSEP27", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series IV", maturityYear: 2027, maturityMonth: 9, anchorPriceInr: 16175, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 30 },
  { symbol: "SGBOCT27", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series V", maturityYear: 2027, maturityMonth: 10, anchorPriceInr: 16060, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 129 },
  { symbol: "SGBDC27VII", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series VI", maturityYear: 2027, maturityMonth: 12, anchorPriceInr: 16010, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 39 },
  { symbol: "SGBJ28VIII", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series VIII", maturityYear: 2028, maturityMonth: 1, anchorPriceInr: 15830, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 16 },
  { symbol: "SGBFEB28IX", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series IX", maturityYear: 2028, maturityMonth: 2, anchorPriceInr: 15920, anchorAsOf: "2026-08-25T09:23:24", anchorVolumeUnits: 14 },
  { symbol: "SGBMAR28X", officialName: "Sovereign Gold Bond Scheme 2019-20 - Series X", maturityYear: 2028, maturityMonth: 3, anchorPriceInr: 16200, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 41 },

  // FY2020-21
  { symbol: "SGBAPR28I", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series I", maturityYear: 2028, maturityMonth: 4, anchorPriceInr: 16006, anchorAsOf: "2026-08-25T09:33:24", anchorVolumeUnits: 7 },
  { symbol: "SGBMAY28", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series II", maturityYear: 2028, maturityMonth: 5, anchorPriceInr: 15971.54, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 230 },
  { symbol: "SGBJUN28", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series III", maturityYear: 2028, maturityMonth: 6, anchorPriceInr: 15910, anchorAsOf: "2026-08-25T09:23:34", anchorVolumeUnits: 1 },
  { symbol: "SGBJUL28IV", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series IV", maturityYear: 2028, maturityMonth: 7, anchorPriceInr: 15940.01, anchorAsOf: "2026-08-25T09:49:29", anchorVolumeUnits: 1 },
  { symbol: "SGBAUG28V", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series V", maturityYear: 2028, maturityMonth: 8, anchorPriceInr: 15899.99, anchorAsOf: "2026-08-25T09:46:31", anchorVolumeUnits: 213 },
  { symbol: "SGBSEP28VI", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series VI", maturityYear: 2028, maturityMonth: 9, anchorPriceInr: 16121, anchorAsOf: "2026-08-25T09:45:26", anchorVolumeUnits: 36 },
  { symbol: "SGBOC28VII", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series VII", maturityYear: 2028, maturityMonth: 10, anchorPriceInr: 16110, anchorAsOf: "2026-08-25T09:18:24", anchorVolumeUnits: 10 },
  { symbol: "SGBN28VIII", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series VIII", maturityYear: 2028, maturityMonth: 11, anchorPriceInr: 16028, anchorAsOf: "2026-08-25T09:22:28", anchorVolumeUnits: 1 },
  { symbol: "SGBJAN29IX", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series IX", maturityYear: 2029, maturityMonth: 1, anchorPriceInr: 15950.6, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 278 },
  { symbol: "SGBJAN29X", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series X", maturityYear: 2029, maturityMonth: 1, anchorPriceInr: 15863.99, anchorAsOf: "2026-08-25T09:40:33", anchorVolumeUnits: 2 },
  { symbol: "SGBFEB29XI", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series XI", maturityYear: 2029, maturityMonth: 2, anchorPriceInr: 15900, anchorAsOf: "2026-08-25T09:20:19", anchorVolumeUnits: 12 },
  { symbol: "SGBMR29XII", officialName: "Sovereign Gold Bond Scheme 2020-21 - Series XII", maturityYear: 2029, maturityMonth: 3, anchorPriceInr: 16100, anchorAsOf: "2026-08-25T09:40:19", anchorVolumeUnits: 490 },

  // FY2021-22
  { symbol: "SGBMAY29I", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series I", maturityYear: 2029, maturityMonth: 5, anchorPriceInr: 15991, anchorAsOf: "2026-08-25T09:24:22", anchorVolumeUnits: 1 },
  { symbol: "SGBJUN29II", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series II", maturityYear: 2029, maturityMonth: 6, anchorPriceInr: 15897.42, anchorAsOf: "2026-08-25T09:49:33", anchorVolumeUnits: 112 },
  { symbol: "SGBJU29III", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series III", maturityYear: 2029, maturityMonth: 6, anchorPriceInr: 16000, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 207 },
  { symbol: "SGBJUL29IV", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series IV", maturityYear: 2029, maturityMonth: 7, anchorPriceInr: 15900, anchorAsOf: "2026-08-25T09:49:30", anchorVolumeUnits: 270 },
  { symbol: "SGBAUG29V", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series V", maturityYear: 2029, maturityMonth: 8, anchorPriceInr: 15925.8, anchorAsOf: "2026-08-25T09:44:23", anchorVolumeUnits: 39 },
  { symbol: "SGBSEP29VI", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series VI", maturityYear: 2029, maturityMonth: 9, anchorPriceInr: 16101, anchorAsOf: "2026-08-25T09:49:29", anchorVolumeUnits: 39 },
  { symbol: "SGBNV29VII", officialName: "Sovereign Gold Bonds Scheme 2021-22 - Series VII", maturityYear: 2029, maturityMonth: 11, anchorPriceInr: 15919.01, anchorAsOf: "2026-08-25T09:49:33", anchorVolumeUnits: 13 },
  { symbol: "SGBD29VIII", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series VIII", maturityYear: 2029, maturityMonth: 12, anchorPriceInr: 15950, anchorAsOf: "2026-08-25T09:31:25", anchorVolumeUnits: 3 },
  { symbol: "SGBJAN30IX", officialName: "Sovereign Gold Bond Scheme 2021-22 - Series IX", maturityYear: 2030, maturityMonth: 1, anchorPriceInr: 16038.13, anchorAsOf: "2026-08-25T09:49:21", anchorVolumeUnits: 28 },
  { symbol: "SGBMAR30X", officialName: "Sovereign Gold Bonds Scheme 2021-22 - Series X", maturityYear: 2030, maturityMonth: 3, anchorPriceInr: 16047, anchorAsOf: "2026-08-24T16:01:10", anchorVolumeUnits: 307 },

  // FY2022-23
  { symbol: "SGBJUN30", officialName: "Sovereign Gold Bond Scheme 2022-23 - Series I", maturityYear: 2030, maturityMonth: 6, anchorPriceInr: 15998, anchorAsOf: "2026-08-25T09:48:25", anchorVolumeUnits: 14 },
  { symbol: "SGBAUG30", officialName: "Sovereign Gold Bond Scheme 2022-23 - Series II", maturityYear: 2030, maturityMonth: 8, anchorPriceInr: 16080.05, anchorAsOf: "2026-08-25T09:49:32", anchorVolumeUnits: 105 },
  { symbol: "SGBDE30III", officialName: "Sovereign Gold Bond Scheme 2022-23 - Series III", maturityYear: 2030, maturityMonth: 12, anchorPriceInr: 16179.99, anchorAsOf: "2026-08-25T09:30:26", anchorVolumeUnits: 3 },
  { symbol: "SGBMAR31IV", officialName: "Sovereign Gold Bond Scheme 2022-23 - Series IV", maturityYear: 2031, maturityMonth: 3, anchorPriceInr: 16170, anchorAsOf: "2026-08-25T09:36:31", anchorVolumeUnits: 8 },

  // FY2023-24
  { symbol: "SGBJUN31I", officialName: "Sovereign Gold Bond Scheme 2023-24 - Series I", maturityYear: 2031, maturityMonth: 6, anchorPriceInr: 16150.01, anchorAsOf: "2026-08-25T09:43:21", anchorVolumeUnits: 53 },
  { symbol: "SGBSEP31II", officialName: "Sovereign Gold Bond Scheme 2023-24 - Series II", maturityYear: 2031, maturityMonth: 9, anchorPriceInr: 16201, anchorAsOf: "2026-08-25T09:49:26", anchorVolumeUnits: 85 },
  { symbol: "SGBDE31III", officialName: "Sovereign Gold Bond Scheme 2023-24 - Series III", maturityYear: 2031, maturityMonth: 12, anchorPriceInr: 16290, anchorAsOf: "2026-08-25T09:49:26", anchorVolumeUnits: 493 },
  { symbol: "SGBFEB32IV", officialName: "Sovereign Gold Bond Scheme 2023-24 - Series IV", maturityYear: 2032, maturityMonth: 2, anchorPriceInr: 16334, anchorAsOf: "2026-08-25T09:49:21", anchorVolumeUnits: 1358 },
];
