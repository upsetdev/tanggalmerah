import { availableYears, type Store } from "./data";
import type { DateCheckResponse, Holiday, HolidayType, Meta } from "./model";

// --------------------------------------------------------------------------
// Response helpers
// --------------------------------------------------------------------------

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body) + "\n", {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function error(status: number, code: string, message: string): Response {
  return json(status, { success: false, error: message, code });
}

function success(data: unknown, meta?: Meta): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = omitZero(meta);
  return json(200, body);
}

// omitZero mirrors Go's `omitempty`: drops 0 / "" / undefined fields.
function omitZero(meta: Meta): Meta {
  return Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== 0 && v !== "" && v !== undefined));
}

// --------------------------------------------------------------------------
// GET /health
// --------------------------------------------------------------------------

export function health(version: string): Response {
  return json(200, {
    status: "ok",
    version,
    time: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  });
}

// --------------------------------------------------------------------------
// GET /api/years
// --------------------------------------------------------------------------

export function listYears(store: Store): Response {
  const years = availableYears(store);
  return success(years, { total: years.length });
}

// --------------------------------------------------------------------------
// GET /api/holidays
//
// Query params:
//   ?year=YYYY         (required)
//   ?month=1..12       (optional)
//   ?type=holiday|leave|all  (default: all)
// --------------------------------------------------------------------------

export function listHolidays(store: Store, q: URLSearchParams): Response {
  const yearStr = q.get("year");
  if (!yearStr) {
    return error(400, "MISSING_YEAR", "Query parameter 'year' is required (YYYY)");
  }

  const year = parseIntInRange(yearStr, 1900, 2100);
  if (year === null) {
    return error(400, "INVALID_YEAR", "year must be a 4-digit integer between 1900 and 2100");
  }

  const yd = store.get(year);
  if (!yd) {
    return error(404, "YEAR_NOT_FOUND", "No holiday data available for the requested year");
  }

  let holidays = yd.holidays;

  let month = 0;
  const monthStr = q.get("month");
  if (monthStr) {
    const m = parseIntInRange(monthStr, 1, 12);
    if (m === null) {
      return error(400, "INVALID_MONTH", "month must be an integer between 1 and 12");
    }
    month = m;
    holidays = filterByMonth(holidays, month);
  }

  switch (q.get("type") ?? "") {
    case "":
    case "all":
      break;
    case "holiday":
      holidays = filterByType(holidays, "holiday");
      break;
    case "leave":
      holidays = filterByType(holidays, "leave");
      break;
    default:
      return error(400, "INVALID_TYPE", "type must be one of: holiday, leave, all");
  }

  const [ph, cl] = splitCounts(holidays);
  return success(holidays, {
    total: holidays.length,
    total_holidays: ph,
    total_leave: cl,
    year,
    month,
  });
}

// --------------------------------------------------------------------------
// GET /api/check?date=YYYY-MM-DD
// --------------------------------------------------------------------------

export function checkDate(store: Store, q: URLSearchParams): Response {
  const raw = q.get("date");
  if (!raw) {
    return error(400, "MISSING_DATE", "Query parameter 'date' is required (YYYY-MM-DD)");
  }

  if (!isValidDate(raw)) {
    return error(400, "INVALID_DATE", "date must be in YYYY-MM-DD format");
  }

  const resp: DateCheckResponse = { date: raw, is_holiday: false, is_leave: false, is_off_day: false };
  const matches = (store.get(Number(raw.slice(0, 4)))?.holidays ?? []).filter((h) => h.date === raw);
  for (const h of matches) {
    if (h.type === "holiday") resp.is_holiday = true;
    if (h.type === "leave") resp.is_leave = true;
  }
  resp.is_off_day = resp.is_holiday || resp.is_leave;
  if (matches.length > 0) resp.holidays = matches;

  return success(resp);
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function parseIntInRange(s: string, min: number, max: number): number | null {
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

// isValidDate accepts only real calendar dates in strict YYYY-MM-DD form.
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function filterByMonth(holidays: Holiday[], month: number): Holiday[] {
  const prefix = `-${String(month).padStart(2, "0")}-`;
  return holidays.filter((h) => h.date.slice(4, 8) === prefix);
}

export function filterByType(holidays: Holiday[], t: HolidayType): Holiday[] {
  return holidays.filter((h) => h.type === t);
}

export function splitCounts(holidays: Holiday[]): [publicHolidays: number, collectiveLeave: number] {
  let ph = 0;
  let cl = 0;
  for (const h of holidays) {
    if (h.type === "holiday") ph++;
    else if (h.type === "leave") cl++;
  }
  return [ph, cl];
}
