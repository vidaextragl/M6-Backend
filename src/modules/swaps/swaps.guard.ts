import { getExchangeRate } from '../exchange-rates/exchange-rates.service';

// Reusa exchange-rates.service: acepta una tasa en vivo, en caché, o guardada hace menos de 1h.
// Si no hay ninguna utilizable, tira ExchangeRateUnavailableError y el swap queda bloqueado.
// (No se llama "ensureLiveRate": el nombre prometía más "en vivo" de lo que a veces entrega.)
export function getUsableRate(from: string, to: string) {
  return getExchangeRate(from, to);
}
