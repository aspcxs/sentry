// lib/currency.ts
//
// Live FX conversion via Frankfurter (https://frankfurter.dev) — free,
// open-source, no API key required, backed by European Central Bank
// reference rates. Good fit for a one-week build: zero signup friction.
//
// Rates update once daily (~16:00 CET) — cached in-memory for 1 hour per
// process so we're not re-fetching on every request, but this cache is
// PER SERVERLESS INSTANCE and resets on cold start. Fine for a demo; for
// production-grade caching, move this to Redis/Vercel KV.

const FRANKFURTER_BASE = "https://api.frankfurter.app";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type RatesResponse = { base: string; date: string; rates: Record<string, number> };

const cache = new Map<string, { data: RatesResponse; fetchedAt: number }>();

export class UnsupportedCurrencyError extends Error {}

async function fetchRates(base: string, symbols?: string[]): Promise<RatesResponse> {
  const cacheKey = `${base}:${symbols?.join(",") ?? "all"}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = new URL(`${FRANKFURTER_BASE}/latest`);
  url.searchParams.set("base", base);
  if (symbols?.length) url.searchParams.set("symbols", symbols.join(","));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Frankfurter API error (${res.status}) fetching rates for base=${base}`);
  }
  const data = (await res.json()) as RatesResponse;
  cache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}

/**
 * Convert an amount from one currency to another using today's rate.
 * Throws UnsupportedCurrencyError if either currency isn't in Frankfurter's set.
 */
export async function convert(amount: number, from: string, to: string): Promise<{ amount: number; rate: number; date: string }> {
  from = from.toUpperCase();
  to = to.toUpperCase();

  if (from === to) {
    return { amount, rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const data = await fetchRates(from, [to]);
  const rate = data.rates[to];
  if (rate === undefined) {
    throw new UnsupportedCurrencyError(`No rate available for ${from} -> ${to}`);
  }
  return { amount: Math.round(amount * rate * 100) / 100, rate, date: data.date };
}

/** Fetch the full list of currencies Frankfurter supports, for populating a <select>. */
export async function listSupportedCurrencies(): Promise<Record<string, string>> {
  const res = await fetch(`${FRANKFURTER_BASE}/currencies`);
  if (!res.ok) throw new Error(`Frankfurter API error (${res.status}) fetching currency list`);
  return res.json();
}
