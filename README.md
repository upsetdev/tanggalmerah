<div align="center">

# 📅 Tanggal Merah API

**A fast, free REST API for Indonesian public holidays and collective leave days.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/runs%20on-Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[API Reference](#api-reference) · [Data Coverage](#data-coverage) · [Self-Hosting](#self-hosting) · [Contributing](CONTRIBUTING.md)

</div>

> **Tanggal merah** (lit. _red date_) is the Indonesian term for a public holiday: the days printed in red on a calendar.

```bash
curl "https://tanggalmerah.upset.dev/api/check?date=2026-08-17"
```

```json
{
  "success": true,
  "data": {
    "date": "2026-08-17",
    "is_holiday": true,
    "is_leave": false,
    "is_off_day": true,
    "holidays": [
      {
        "date": "2026-08-17",
        "day": "Senin",
        "name": "Hari Kemerdekaan Republik Indonesia",
        "type": "holiday"
      }
    ]
  }
}
```

## Features

- 📅 **Holidays and collective leave.** Covers both _hari libur nasional_ and _cuti bersama_, sourced from the official government decree.
- ✅ **One-call date check.** Ask whether any date is a day off, with `is_holiday`, `is_leave` and `is_off_day` flags.
- 🔎 **Flexible filters.** Query by year, month and type.
- ⚡ **Fast at the edge.** Runs on Cloudflare Workers with the data bundled in, so no database lookups at request time.
- 🌐 **Browser-ready.** CORS enabled for any origin, with 30-day `Cache-Control` headers.
- 🪶 **Zero runtime dependencies.** Only Workers platform APIs.
- 🔓 **Free and open source.** No API key, no sign-up, MIT licensed.

## Used By

- [TanggalanJawa.com](https://tanggalanjawa.com)

_Using Tanggal Merah in your project? [Open a pull request](https://github.com/upsetdev/tanggalmerah/pulls) to add it here._

---

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Conventions](#conventions)
  - [`GET /api/holidays`](#get-apiholidays)
  - [`GET /api/check`](#get-apicheck)
  - [`GET /api/years`](#get-apiyears)
  - [`GET /health`](#get-health)
  - [Errors](#errors)
- [Data Coverage](#data-coverage)
- [Self-Hosting](#self-hosting)
- [Development](#development)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

## Quick Start

The public API is available at **`https://tanggalmerah.upset.dev`**. No authentication is required.

**JavaScript**

```js
const res = await fetch("https://tanggalmerah.upset.dev/api/holidays?year=2026");
const { data } = await res.json();

for (const h of data) {
  console.log(h.date, h.name, h.type);
}
```

**Python**

```python
import requests

r = requests.get("https://tanggalmerah.upset.dev/api/check", params={"date": "2026-03-20"})
print(r.json()["data"]["is_off_day"])  # True
```

---

## API Reference

| Method | Endpoint        | Description                                    |
| ------ | --------------- | ---------------------------------------------- |
| `GET`  | `/api/holidays` | List holidays for a year, optionally filtered  |
| `GET`  | `/api/check`    | Check whether a specific date is a day off     |
| `GET`  | `/api/years`    | List years with available data                 |
| `GET`  | `/health`       | Service health check                           |
| `GET`  | `/`             | Redirects to the project page                  |

### Conventions

**Success envelope**

```json
{
  "success": true,
  "data": "…",
  "meta": { "total": 4, "total_leave": 4, "year": 2026, "month": 3 }
}
```

`meta` is present on list endpoints only. Fields with a value of zero are omitted.

**Error envelope**

```json
{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE" }
```

**Holiday object**

| Field  | Type   | Description                                        |
| ------ | ------ | -------------------------------------------------- |
| `date` | string | ISO 8601 date, `YYYY-MM-DD`                        |
| `day`  | string | Indonesian day name, e.g. `Senin`                  |
| `name` | string | Holiday name in Indonesian                         |
| `type` | string | `holiday` or `leave`                               |

**Holiday types**

| `type`    | Indonesian          | Description                                   |
| --------- | ------------------- | --------------------------------------------- |
| `holiday` | Hari Libur Nasional | National public holiday, a mandatory day off  |
| `leave`   | Cuti Bersama        | Government-designated collective leave day    |

**Response headers**

| Header                        | Value                                         |
| ----------------------------- | --------------------------------------------- |
| `Access-Control-Allow-Origin` | `*`                                           |
| `Cache-Control`               | `public, max-age=2592000` (except `/health`)  |
| `X-API-Version`               | API version, e.g. `1.0.0`                     |

---

### `GET /api/holidays`

List all holidays for a year, optionally filtered by month and type.

| Parameter | Required | Values                        | Default |
| --------- | -------- | ----------------------------- | ------- |
| `year`    | **Yes**  | `1900`–`2100`                 | –       |
| `month`   | No       | `1`–`12`                      | –       |
| `type`    | No       | `holiday` \| `leave` \| `all` | `all`   |

```bash
# All holidays in 2026
curl "https://tanggalmerah.upset.dev/api/holidays?year=2026"

# August 2026 only
curl "https://tanggalmerah.upset.dev/api/holidays?year=2026&month=8"

# Collective leave days in March 2026
curl "https://tanggalmerah.upset.dev/api/holidays?year=2026&month=3&type=leave"
```

<details>
<summary><b>Example response</b></summary>

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-03-18",
      "day": "Rabu",
      "name": "Hari Suci Nyepi Tahun Baru Saka 1948",
      "type": "leave"
    },
    {
      "date": "2026-03-20",
      "day": "Jumat",
      "name": "Hari Raya Idul Fitri 1447 Hijriyah",
      "type": "leave"
    },
    {
      "date": "2026-03-23",
      "day": "Senin",
      "name": "Hari Raya Idul Fitri 1447 Hijriyah",
      "type": "leave"
    },
    {
      "date": "2026-03-24",
      "day": "Selasa",
      "name": "Hari Raya Idul Fitri 1447 Hijriyah",
      "type": "leave"
    }
  ],
  "meta": {
    "total": 4,
    "total_leave": 4,
    "year": 2026,
    "month": 3
  }
}
```

</details>

---

### `GET /api/check`

Check whether a date is a public holiday, a collective leave day or a regular day.

| Parameter | Required | Values       |
| --------- | -------- | ------------ |
| `date`    | **Yes**  | `YYYY-MM-DD` |

```bash
curl "https://tanggalmerah.upset.dev/api/check?date=2026-03-20"
```

<details>
<summary><b>Example responses</b></summary>

A collective leave day:

```json
{
  "success": true,
  "data": {
    "date": "2026-03-20",
    "is_holiday": false,
    "is_leave": true,
    "is_off_day": true,
    "holidays": [
      {
        "date": "2026-03-20",
        "day": "Jumat",
        "name": "Hari Raya Idul Fitri 1447 Hijriyah",
        "type": "leave"
      }
    ]
  }
}
```

A regular day (`holidays` is omitted):

```json
{
  "success": true,
  "data": {
    "date": "2026-03-25",
    "is_holiday": false,
    "is_leave": false,
    "is_off_day": false
  }
}
```

</details>

> [!NOTE]
> `is_off_day` covers holidays and collective leave only. Weekends are not flagged.
> For a year without data, this endpoint returns `200` with all flags `false` rather than `404`.

---

### `GET /api/years`

List every year that has holiday data.

```bash
curl "https://tanggalmerah.upset.dev/api/years"
```

```json
{ "success": true, "data": [2023, 2024, 2025, 2026, 2027], "meta": { "total": 5 } }
```

---

### `GET /health`

```bash
curl "https://tanggalmerah.upset.dev/health"
```

```json
{ "status": "ok", "version": "1.0.0", "time": "2026-01-01T00:00:00Z" }
```

---

### Errors

| Code                 | HTTP | Endpoint        | When                                      |
| -------------------- | ---- | --------------- | ----------------------------------------- |
| `MISSING_YEAR`       | 400  | `/api/holidays` | `year` is missing                         |
| `INVALID_YEAR`       | 400  | `/api/holidays` | `year` is not an integer from 1900–2100   |
| `INVALID_MONTH`      | 400  | `/api/holidays` | `month` is not an integer from 1–12       |
| `INVALID_TYPE`       | 400  | `/api/holidays` | `type` is not `holiday`, `leave` or `all` |
| `YEAR_NOT_FOUND`     | 404  | `/api/holidays` | No data exists for the requested year     |
| `MISSING_DATE`       | 400  | `/api/check`    | `date` is missing                         |
| `INVALID_DATE`       | 400  | `/api/check`    | `date` is not a valid `YYYY-MM-DD` date   |
| `NOT_FOUND`          | 404  | any             | Unknown endpoint                          |
| `METHOD_NOT_ALLOWED` | 405  | any             | Method other than `GET`, `HEAD`, `OPTIONS` |

---

## Data Coverage

| Year | Status       |
| ---- | ------------ |
| 2027 | ✅ Available |
| 2026 | ✅ Available |
| 2025 | ✅ Available |
| 2024 | ✅ Available |
| 2023 | ✅ Available |

Data comes from the annual joint ministerial decree (_Surat Keputusan Bersama_ / SKB 3 Menteri) that sets national holidays and collective leave in Indonesia. Each year lives in [`data/YYYY.json`](data):

```json
{
  "year": 2026,
  "holidays": [
    { "date": "2026-01-01", "day": "Kamis", "name": "Tahun Baru 2026 Masehi", "type": "holiday" },
    { "date": "2026-12-24", "day": "Kamis", "name": "Hari Raya Natal", "type": "leave" }
  ]
}
```

Spotted a mistake or a missing year? See [Contributing](#contributing).

---

## Self-Hosting

Want your own instance? Tanggal Merah runs on [Cloudflare Workers](https://workers.cloudflare.com), and the free plan is more than enough. Pick whichever deploy method suits you, then optionally add a custom domain.

**Prerequisites:** [Bun](https://bun.sh) and a [Cloudflare account](https://dash.cloudflare.com/sign-up).

### Option A: Deploy from your terminal

1. **Clone and install**

   ```bash
   git clone https://github.com/upsetdev/tanggalmerah.git
   cd tanggalmerah
   bun install
   ```

2. **Log in to Cloudflare.** This opens a browser window to authorize Wrangler.

   ```bash
   bunx wrangler login
   ```

3. **Deploy**

   ```bash
   bun run deploy
   ```

   Wrangler prints your Worker's URL when it finishes, e.g. `https://tanggalmerah.<your-subdomain>.workers.dev`. Your API is live there.

### Option B: Deploy from the Cloudflare dashboard

Best if you want every push to deploy automatically.

1. Fork this repository on GitHub.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages → Create → Import a repository** and pick your fork.
3. Use these build settings:

   | Setting        | Value            |
   | -------------- | ---------------- |
   | Build command  | `bun run build`  |
   | Deploy command | `bun run deploy` |

4. Click **Deploy**. Later pushes to your production branch redeploy automatically.

### Adding a custom domain

By default the API is served on `*.workers.dev`. To use your own domain, such as `holidays.example.com`, the domain's DNS must be managed by Cloudflare. Then choose one of these:

**From the dashboard (simplest).** Open your Worker, go to **Settings → Domains & Routes → Add → Custom domain**, and enter the hostname. Cloudflare creates the DNS record and TLS certificate for you.

**From `wrangler.jsonc` (kept in code).** Add a `routes` entry, then redeploy:

```jsonc
{
  "name": "tanggalmerah",
  // …
  "routes": [{ "pattern": "holidays.example.com", "custom_domain": true }]
}
```

> [!IMPORTANT]
> The hostname must not already have a DNS record. If it does, for example because it points at an old server, delete that record first. Otherwise deployment fails with _"Hostname already has externally managed DNS records"_.

Once your custom domain works, you can turn off the `workers.dev` URL by adding `"workers_dev": false` to `wrangler.jsonc`.

### Updating your instance

New holiday data lands in this repository as new years are announced. To pick it up, pull the latest changes, or sync your fork, and redeploy:

```bash
git pull
bun run deploy
```

With Option B, syncing your fork on GitHub is enough.

---

## Development

```bash
bun install
bun run dev         # local server at http://localhost:8787
bun run test        # run the test suite (Vitest)
bun run typecheck   # type-check with tsc
bun run build       # bundle into dist/ without deploying
```

<details>
<summary><b>Project structure</b></summary>

```
tanggalmerah/
├── src/
│   ├── index.ts         # Worker entry point
│   ├── app.ts           # Router and shared response headers
│   ├── handler.ts       # Endpoint handlers and filter helpers
│   ├── data.ts          # Bundled holiday data
│   └── model.ts         # Domain types and response shapes
├── test/
│   └── app.test.ts      # Test suite
├── data/
│   └── YYYY.json        # One file per year
├── wrangler.jsonc       # Cloudflare Workers config
├── tsconfig.json
└── package.json
```

</details>

---

## Contributing

Contributions are welcome! The most valuable help is adding official data for new years and correcting existing entries. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the data guidelines, development setup and commit conventions.

## Disclaimer

This project is not affiliated with the Government of Indonesia. The data is compiled from official decrees and checked carefully, but decrees are sometimes revised after publication. For legal, payroll or other critical decisions, verify against the latest official announcement.

## License

[MIT](LICENSE) © 2026 Frans Allen
