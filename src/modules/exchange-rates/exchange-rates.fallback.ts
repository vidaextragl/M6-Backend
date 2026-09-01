import { PROVIDERS } from './providers';

export interface FallbackResult {
  rate: number;
  provider: string;
}

export async function fetchRateWithFallback(from: string, to: string): Promise<FallbackResult> {
  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    try {
      const rate = await provider.getRate(from, to);
      // Una API que devuelve 0, negativo, NaN o Infinity es tan inútil como una que no responde —
      // se trata igual que una falla, para que la cascada pruebe el siguiente proveedor en vez de
      // dejar pasar un valor que después rompería la aritmética del swap (o llegaría crudo al SQL).
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`invalid rate received: ${rate}`);
      }
      return { rate, provider: provider.name };
    } catch (err) {
      errors.push(`${provider.name}: ${(err as Error).message}`);
    }
  }

  throw new Error(`All exchange rate providers failed for ${from}->${to}: ${errors.join(' | ')}`);
}
