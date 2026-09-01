import { getExchangeRate } from '../exchange-rates/exchange-rates.service';

// Reusa exchange-rates.service: si no hay cotización en vivo ni una guardada de menos de 1h,
// tira ExchangeRateUnavailableError y el swap queda bloqueado automáticamente.
export function ensureLiveRate(from: string, to: string) {
  return getExchangeRate(from, to);
}
