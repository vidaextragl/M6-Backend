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
      return { rate, provider: provider.name };
    } catch (err) {
      errors.push(`${provider.name}: ${(err as Error).message}`);
    }
  }

  throw new Error(`All exchange rate providers failed for ${from}->${to}: ${errors.join(' | ')}`);
}
