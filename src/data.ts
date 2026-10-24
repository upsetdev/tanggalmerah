import type { YearData } from "./model";

import y2023 from "../data/2023.json";
import y2024 from "../data/2024.json";
import y2025 from "../data/2025.json";
import y2026 from "../data/2026.json";

// Holiday data is bundled into the Worker at build time.
// To add a new year: drop data/YYYY.json in place and import it here.
const all = [y2023, y2024, y2025, y2026] as YearData[];

export type Store = Map<number, YearData>;

export const store: Store = new Map(all.map((yd) => [yd.year, yd]));

// availableYears returns every year that has data, in ascending order.
export function availableYears(s: Store): number[] {
  return [...s.keys()].sort((a, b) => a - b);
}
