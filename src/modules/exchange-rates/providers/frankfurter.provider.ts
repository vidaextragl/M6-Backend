import type { ExchangeRateProvider } from './exchange-rate-provider.interface';

interface FrankfurterResponse {
  rates: Record<string, number>;
}

export const frankfurterProvider: ExchangeRateProvider = {
  name: 'frankfurter',
  async getRate(from, to) {
    const res = await fetch(`https://api.frankfurter.app/latest?amount=1&from=${from}&to=${to}`);
    if (!res.ok) {
      throw new Error(`Frankfurter responded with status ${res.status}`);
    }

    const data = (await res.json()) as FrankfurterResponse;
    const rate = data.rates?.[to];
    if (typeof rate !== 'number') {
      throw new Error(`Frankfurter: no rate found for ${from}->${to}`);
    }

    return rate;
  },
};
