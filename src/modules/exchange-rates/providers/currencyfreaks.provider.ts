import { env } from '../../../config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { ExchangeRateProvider } from './exchange-rate-provider.interface';

interface CurrencyFreaksResponse {
  rates: Record<string, string>;
}

// El plan free de CurrencyFreaks rechaza el parámetro `base` distinto de USD (402 "Feature Not
// Supported Exception", confirmado contra la API real) — así que nunca se pide `base=`, siempre
// se consulta con USD implícito y se arma la conversión a mano si hace falta.
async function fetchUsdRate(currency: string): Promise<number> {
  if (currency === 'USD') {
    return 1;
  }

  const res = await fetchWithTimeout(
    `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${env.currencyFreaksApiKey}&symbols=${currency}`,
  );
  if (!res.ok) {
    throw new Error(`CurrencyFreaks responded with status ${res.status}`);
  }

  const data = (await res.json()) as CurrencyFreaksResponse;
  const rate = data.rates?.[currency];
  if (!rate) {
    throw new Error(`CurrencyFreaks: no rate found for USD->${currency}`);
  }

  return Number(rate);
}

export const currencyFreaksProvider: ExchangeRateProvider = {
  name: 'currencyfreaks',
  async getRate(from, to) {
    const [usdToFrom, usdToTarget] = await Promise.all([fetchUsdRate(from), fetchUsdRate(to)]);
    return usdToTarget / usdToFrom;
  },
};
