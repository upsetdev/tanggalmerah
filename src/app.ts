import { store as defaultStore, type Store } from "./data";
import { checkDate, error, health, listHolidays, listYears } from "./handler";

export const VERSION = "1.0.0";

const CACHE_CONTROL = "public, max-age=2592000"; // 30 days

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
  "Access-Control-Max-Age": "300",
};

// route dispatches a request to its handler.
export function route(req: Request, store: Store): Response {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return error(405, "METHOD_NOT_ALLOWED", "Method not allowed");
  }

  switch (url.pathname) {
    case "/":
      return Response.redirect("https://upset.dev/tanggalmerah", 308);
    case "/health":
      return health(VERSION);
    case "/api/years":
      return listYears(store);
    case "/api/check":
      return checkDate(store, url.searchParams);
    case "/api/holidays":
      return listHolidays(store, url.searchParams);
    default:
      return error(404, "NOT_FOUND", "Endpoint not found");
  }
}

// handle wraps route with the response headers every endpoint shares.
export function handle(req: Request, store: Store = defaultStore): Response {
  const res = route(req, store);
  // Response.redirect() returns immutable headers; copy into a fresh Response.
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS_HEADERS)) out.headers.set(k, v);
  out.headers.set("X-API-Version", VERSION);
  if (new URL(req.url).pathname !== "/health") {
    out.headers.set("Cache-Control", CACHE_CONTROL);
  }
  return out;
}
