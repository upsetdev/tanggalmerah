// HolidayType classifies each entry in a year's data file.
//
//   - "holiday" – National public holiday (mandatory day off)
//   - "leave"   – Collective leave / bridge day (cuti bersama)
export type HolidayType = "holiday" | "leave";

// Holiday represents a single entry in a YEAR.json data file.
export interface Holiday {
  date: string; // ISO 8601: YYYY-MM-DD
  day: string; // Indonesian day name, e.g. "Senin"
  name: string; // Holiday name in Indonesian
  type: HolidayType;
}

// YearData is the top-level structure stored in each YEAR.json file.
export interface YearData {
  year: number;
  holidays: Holiday[];
}

// Meta carries informational metadata attached to a successful response.
// Zero-valued fields are omitted from the JSON output.
export interface Meta {
  total?: number;
  total_holidays?: number;
  total_leave?: number;
  year?: number;
  month?: number;
  source?: string;
}

// DateCheckResponse is returned by GET /api/check.
export interface DateCheckResponse {
  date: string;
  is_holiday: boolean;
  is_leave: boolean;
  is_off_day: boolean;
  holidays?: Holiday[];
}
