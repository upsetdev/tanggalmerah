import { describe, expect, it } from "vitest";

import type { Store } from "../src/data";
import { filterByMonth, filterByType, splitCounts } from "../src/handler";
import { handle, VERSION } from "../src/app";
import type { Holiday, YearData } from "../src/model";

// --------------------------------------------------------------------------
// Test fixture
// --------------------------------------------------------------------------

const fixture: YearData = {
  year: 2026,
  holidays: [
    { date: "2026-01-01", day: "Kamis", name: "New Year's Day", type: "holiday" },
    { date: "2026-03-19", day: "Kamis", name: "Nyepi", type: "holiday" },
    { date: "2026-03-18", day: "Rabu", name: "Nyepi", type: "leave" },
    { date: "2026-03-21", day: "Sabtu", name: "Eid al-Fitr", type: "holiday" },
    { date: "2026-03-22", day: "Minggu", name: "Eid al-Fitr", type: "holiday" },
    { date: "2026-03-20", day: "Jumat", name: "Eid al-Fitr", type: "leave" },
    { date: "2026-03-23", day: "Senin", name: "Eid al-Fitr", type: "leave" },
    { date: "2026-12-25", day: "Jumat", name: "Christmas Day", type: "holiday" },
    { date: "2026-12-24", day: "Kamis", name: "Christmas Day", type: "leave" },
  ],
};

const store: Store = new Map([[2026, fixture]]);

function get(path: string, method = "GET"): Response {
  return handle(new Request(`https://example.test${path}`, { method }), store);
}

async function body(res: Response): Promise<any> {
  return res.json();
}

// --------------------------------------------------------------------------
// Shared headers / routing
// --------------------------------------------------------------------------

describe("headers", () => {
  it("sets X-API-Version and CORS on every response", () => {
    const res = get("/api/years");
    expect(res.headers.get("X-API-Version")).toBe(VERSION);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("answers CORS pre-flight with 204", () => {
    const res = get("/api/holidays", "OPTIONS");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
  });

  it("sets 30-day Cache-Control on API endpoints", () => {
    expect(get("/api/years").headers.get("Cache-Control")).toBe("public, max-age=2592000");
  });

  it("excludes /health from Cache-Control", () => {
    expect(get("/health").headers.get("Cache-Control")).toBeNull();
  });
});

describe("routing", () => {
  it("redirects / permanently", () => {
    const res = get("/");
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe("https://upset.dev/tanggalmerah");
  });

  it("returns JSON 404 for unknown paths", async () => {
    const res = get("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(await body(res)).toEqual({ success: false, error: "Endpoint not found", code: "NOT_FOUND" });
  });

  it("rejects non-GET methods", () => {
    expect(get("/api/years", "POST").status).toBe(405);
  });
});

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

describe("GET /health", () => {
  it("reports status, version and time", async () => {
    const b = await body(get("/health"));
    expect(b.status).toBe("ok");
    expect(b.version).toBe(VERSION);
    expect(b.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});

describe("GET /api/years", () => {
  it("lists available years", async () => {
    expect(await body(get("/api/years"))).toEqual({ success: true, data: [2026], meta: { total: 1 } });
  });
});

describe("GET /api/holidays", () => {
  it("returns all holidays for a year", async () => {
    const b = await body(get("/api/holidays?year=2026"));
    expect(b.data).toHaveLength(9);
    expect(b.meta).toEqual({ total: 9, total_holidays: 5, total_leave: 4, year: 2026 });
  });

  it("filters by month", async () => {
    const b = await body(get("/api/holidays?year=2026&month=3"));
    expect(b.data).toHaveLength(6);
    expect(b.meta.month).toBe(3);
  });

  it("filters by month and type=holiday", async () => {
    const b = await body(get("/api/holidays?year=2026&month=3&type=holiday"));
    expect(b.data).toHaveLength(3);
    expect(b.meta).toEqual({ total: 3, total_holidays: 3, year: 2026, month: 3 });
  });

  it("filters by month and type=leave", async () => {
    const b = await body(get("/api/holidays?year=2026&month=3&type=leave"));
    expect(b.data).toHaveLength(3);
    expect(b.meta).toEqual({ total: 3, total_leave: 3, year: 2026, month: 3 });
  });

  it("returns an empty array when nothing matches", async () => {
    const b = await body(get("/api/holidays?year=2026&month=2"));
    expect(b.data).toEqual([]);
  });

  it.each([
    ["/api/holidays", 400, "MISSING_YEAR"],
    ["/api/holidays?year=abc", 400, "INVALID_YEAR"],
    ["/api/holidays?year=1899", 400, "INVALID_YEAR"],
    ["/api/holidays?year=2026&month=13", 400, "INVALID_MONTH"],
    ["/api/holidays?year=2026&month=0", 400, "INVALID_MONTH"],
    ["/api/holidays?year=2026&type=weekend", 400, "INVALID_TYPE"],
    ["/api/holidays?year=2000", 404, "YEAR_NOT_FOUND"],
  ])("%s → %i %s", async (path, status, code) => {
    const res = get(path);
    expect(res.status).toBe(status);
    expect((await body(res)).code).toBe(code);
  });
});

describe("GET /api/check", () => {
  it("flags a public holiday", async () => {
    const b = await body(get("/api/check?date=2026-01-01"));
    expect(b.data).toMatchObject({ is_holiday: true, is_leave: false, is_off_day: true });
    expect(b.data.holidays).toHaveLength(1);
    expect(b.meta).toBeUndefined();
  });

  it("flags a collective leave day", async () => {
    const b = await body(get("/api/check?date=2026-03-20"));
    expect(b.data).toMatchObject({ is_holiday: false, is_leave: true, is_off_day: true });
  });

  it("returns all flags false for a workday and omits holidays", async () => {
    const b = await body(get("/api/check?date=2026-03-25"));
    expect(b.data).toEqual({ date: "2026-03-25", is_holiday: false, is_leave: false, is_off_day: false });
  });

  it("returns 200 for a year without data", async () => {
    const res = get("/api/check?date=2000-01-01");
    expect(res.status).toBe(200);
    expect((await body(res)).data.is_off_day).toBe(false);
  });

  it.each([
    ["/api/check", "MISSING_DATE"],
    ["/api/check?date=not-a-date", "INVALID_DATE"],
    ["/api/check?date=2026-02-30", "INVALID_DATE"],
    ["/api/check?date=2026-1-01", "INVALID_DATE"],
  ])("%s → 400 %s", async (path, code) => {
    const res = get(path);
    expect(res.status).toBe(400);
    expect((await body(res)).code).toBe(code);
  });
});

// --------------------------------------------------------------------------
// Filter helpers
// --------------------------------------------------------------------------

describe("helpers", () => {
  const short: Holiday[] = [{ date: "2026", day: "", name: "", type: "holiday" }];

  it("filterByMonth ignores malformed dates", () => {
    expect(filterByMonth(short, 1)).toEqual([]);
    expect(filterByMonth(fixture.holidays, 12)).toHaveLength(2);
  });

  it("filterByType", () => {
    expect(filterByType(fixture.holidays, "leave")).toHaveLength(4);
  });

  it("splitCounts", () => {
    expect(splitCounts(fixture.holidays)).toEqual([5, 4]);
    expect(splitCounts([])).toEqual([0, 0]);
  });
});
