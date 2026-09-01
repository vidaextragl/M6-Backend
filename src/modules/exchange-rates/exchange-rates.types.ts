export interface ExchangeRateDbRecord {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  provider: string;
  fetched_at: Date;
}

export type ExchangeRateSource = 'live' | 'memory_cache' | 'local_fallback';

export interface ExchangeRateResult {
  from: string;
  to: string;
  rate: number;
  provider: string;
  fetchedAt: Date;
  source: ExchangeRateSource;
}
