import { env } from '../../../config';
import type { ExchangeRateProvider } from './exchange-rate-provider.interface';

interface CurrencyFreaksResponse {
  rates: Record<string, string>;
}

export const currencyFreaksProvider: ExchangeRateProvider = {
  name: 'currencyfreaks',
  async getRate(from, to) {
    const res = await fetch(
      `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${env.currencyFreaksApiKey}&base=${from}&symbols=${to}`,
    );
    if (!res.ok) {
      throw new Error(`CurrencyFreaks responded with status ${res.status}`);
    }

    const data = (await res.json()) as CurrencyFreaksResponse;
    const rate = data.rates?.[to];
    if (!rate) {
      throw new Error(`CurrencyFreaks: no rate found for ${from}->${to}`);
    }

    return Number(rate);
  },
};
