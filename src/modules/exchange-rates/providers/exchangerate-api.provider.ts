import { env } from '../../../config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { ExchangeRateProvider } from './exchange-rate-provider.interface';

interface ExchangeRateApiResponse {
  result: string;
  'error-type'?: string;
  conversion_rate: number;
}

export const exchangeRateApiProvider: ExchangeRateProvider = {
  name: 'exchangerate-api',
  async getRate(from, to) {
    const res = await fetchWithTimeout(
      `https://v6.exchangerate-api.com/v6/${env.exchangeRateApiKey}/pair/${from}/${to}`,
      3000,
    );
    if (!res.ok) {
      throw new Error(`ExchangeRate-API responded with status ${res.status}`);
    }

    const data = (await res.json()) as ExchangeRateApiResponse;
    if (data.result !== 'success') {
      throw new Error(`ExchangeRate-API error: ${data['error-type']}`);
    }

    return data.conversion_rate;
  },
};
