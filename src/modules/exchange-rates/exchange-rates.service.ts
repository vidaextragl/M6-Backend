import { ExchangeRateUnavailableError } from '../../shared/errors';
import { getCachedRate, setCachedRate } from './exchange-rates.cache';
import { fetchRateWithFallback } from './exchange-rates.fallback';
import { findLatestRate, upsertRate } from './exchange-rates.repository';
import type { ExchangeRateResult } from './exchange-rates.types';

const LOCAL_FALLBACK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

export async function getExchangeRate(from: string, to: string): Promise<ExchangeRateResult> {
  const cached = getCachedRate(from, to);
  if (cached) {
    return {
      from,
      to,
      rate: cached.rate,
      provider: cached.provider,
      fetchedAt: cached.fetchedAt,
      source: 'memory_cache',
    };
  }

  const live = await fetchRateWithFallback(from, to).catch(() => null);

  if (live) {
    setCachedRate(from, to, live.rate, live.provider);
    // El persistido en Postgres es "mejor esfuerzo": si falla, no debe convertir una cotización
    // en vivo que sí se obtuvo correctamente en un 503 ni en un fallback a datos viejos.
    try {
      await upsertRate(from, to, live.rate, live.provider);
    } catch (err) {
      console.error(`Failed to persist exchange rate ${from}->${to}:`, err);
    }

    return { from, to, rate: live.rate, provider: live.provider, fetchedAt: new Date(), source: 'live' };
  }

  const lastKnown = await findLatestRate(from, to);
  if (lastKnown) {
    const age = Date.now() - lastKnown.fetched_at.getTime();
    if (age <= LOCAL_FALLBACK_MAX_AGE_MS) {
      return {
        from,
        to,
        rate: Number(lastKnown.rate),
        provider: lastKnown.provider,
        fetchedAt: lastKnown.fetched_at,
        source: 'local_fallback',
      };
    }
  }

  throw new ExchangeRateUnavailableError(
    `No live or recent exchange rate available for ${from}->${to}`,
  );
}
