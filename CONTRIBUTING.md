# Contributing

Thanks for helping improve Tanggal Merah! Pull requests are welcome. The
most valuable contribution is adding or correcting official holiday data.

## Setup

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/upsetdev/tanggalmerah.git
cd tanggalmerah
bun install
bun run dev        # http://localhost:8787
```

Before opening a pull request, make sure both of these pass:

```bash
bun run test
bun run typecheck
```

> Use `bun run test`, not `bun test`. The latter starts Bun's built-in test
> runner instead of Vitest.

## Adding a new year

1. Create `data/YYYY.json` following the schema below.
2. Import it in `src/data.ts` and add it to the `all` array.
3. Add it to the `data/` list under **Project Structure** in `README.md`.
4. Run the tests and open a pull request. Link the official source in the
   pull request description.

### Schema

```json
{
  "year": 2027,
  "holidays": [
    {
      "date": "2027-01-01",
      "day": "Jumat",
      "name": "Tahun Baru 2027 Masehi",
      "type": "holiday"
    }
  ]
}
```

| Field  | Rules                                                                  |
| ------ | ---------------------------------------------------------------------- |
| `year` | Must match the file name                                               |
| `date` | `YYYY-MM-DD`, within the file's year                                   |
| `day`  | Indonesian day name: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu  |
| `name` | Holiday name in Indonesian                                             |
| `type` | `holiday` (hari libur nasional) or `leave` (cuti bersama)              |

### Data guidelines

- **Use official sources only.** Verify every entry against the government
  decree (_Surat Keputusan Bersama_ / SKB 3 Menteri) for that year,
  including any later revisions.
- **One entry per day.** A multi-day holiday such as Idul Fitri gets one
  entry for each date.
- **Include both types.** Add `holiday` and `leave` entries. A leave day uses
  the name of the holiday it accompanies.
- **Sort entries by date**, ascending.
- **Check the `day` field** against the date. A mismatched weekday is the
  most common mistake.
- **Keep names consistent with previous years**, e.g. `Hari Raya Idul Fitri
  1448 Hijriyah`, `Isra Mi'raj Nabi Muhammad SAW`, `Hari Raya Natal`,
  `Hari Kemerdekaan Republik Indonesia`. Update the year numbers (Masehi,
  Hijriyah, Saka, Kongzili, BE) for the new year.
- A holiday can legitimately appear twice in one year (e.g. Isra Mi'raj in
  2027), because the Hijri calendar is shorter than the Gregorian one.

## Correcting existing data

Fix the entry in the relevant `data/YYYY.json` file and link the source
that confirms the correction in your pull request.

## Code changes

- Keep the API backwards compatible. Routes, response shapes and error
  codes are documented in `README.md`; update it when behaviour changes.
- Add or update tests in `test/` for any behaviour change.
- The Worker has no runtime dependencies. Please keep it that way.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(data): add 2028 public holidays and collective leave
fix(data): correct leave day for Tahun Baru Imlek 2577
docs: clarify check endpoint behaviour
```

Keep each commit to one logical change.
