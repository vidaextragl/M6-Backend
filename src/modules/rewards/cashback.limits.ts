import { getExchangeRate } from '../exchange-rates';
import { sumTransactionAmountsByCurrency } from '../transactions/transactions.repository';
import { POINTS_PER_CURRENCY_UNIT } from './cashback.calculator';
import type { CashbackResult } from './cashback.calculator';

export const MAX_CASHBACK_PER_TRANSACTION_USD = 10;
export const MAX_CASHBACK_PER_WEEK_USD = 100;
export const MAX_CASHBACK_PER_MONTH_USD = 200;

export function startOfWeek(date = new Date()): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfMonth(date = new Date()): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Convierte un total por moneda a USD usando la tasa vigente. Si una moneda puntual no tiene
// cotización disponible, se la excluye del total en vez de tirar abajo todo el cálculo — mismo
// criterio "mejor esfuerzo" que ya usaba el dashboard de cashback para este mismo cálculo.
export async function sumByCurrencyToUsd(amountsByCurrency: Record<string, number>): Promise<number> {
  let total = 0;

  for (const [currency, amount] of Object.entries(amountsByCurrency)) {
    if (currency === 'USD') {
      total += amount;
      continue;
    }

    try {
      const { rate } = await getExchangeRate(currency, 'USD');
      total += amount * rate;
    } catch {
      // Sin cotización disponible: se excluye esa moneda del total en vez de romper el cálculo.
    }
  }

  return total;
}

// A diferencia de `sumByCurrencyToUsd` (mejor esfuerzo, usado para el total informativo del
// dashboard), estas dos devuelven `null` si no se puede convertir — la conversión del cashback de
// *esta* compra puntual tiene que ser confiable para poder garantizar el tope, no solo aproximada.
async function convertToUsd(amount: number, currency: string): Promise<number | null> {
  if (currency === 'USD') {
    return amount;
  }
  try {
    const { rate } = await getExchangeRate(currency, 'USD');
    return amount * rate;
  } catch {
    return null;
  }
}

async function convertFromUsd(amountUsd: number, currency: string): Promise<number | null> {
  if (currency === 'USD') {
    return amountUsd;
  }
  try {
    const { rate } = await getExchangeRate('USD', currency);
    return amountUsd * rate;
  } catch {
    return null;
  }
}

async function getCashbackUsedUsd(walletId: string, since: Date): Promise<number> {
  const byCurrency = await sumTransactionAmountsByCurrency(walletId, 'REWARD_CASHBACK', since);
  return sumByCurrencyToUsd(byCurrency);
}

const NO_CASHBACK: CashbackResult = { cashbackAmount: '0.00', points: 0 };

// Recorta el cashback calculado para respetar los 3 topes (todos en equivalente USD): $10 por
// transacción, $100 por semana (lunes a domingo) y $200 por mes (calendario). La compra en sí
// nunca se bloquea por esto — si el tope ya se alcanzó, el cashback de esa compra puntual queda en
// 0, nunca negativo. Si no se puede convertir la moneda de la compra a USD (ej. caída de las 3 APIs
// de tasas), se aplica el criterio más conservador —cashback 0— en vez de dejarlo pasar sin tope.
export async function applyCashbackLimits(
  walletId: string,
  currency: string,
  cashback: CashbackResult,
): Promise<CashbackResult> {
  const rawAmount = Number(cashback.cashbackAmount);
  if (rawAmount <= 0) {
    return cashback;
  }

  const rawUsd = await convertToUsd(rawAmount, currency);
  if (rawUsd === null) {
    return NO_CASHBACK;
  }

  const [weeklyUsedUsd, monthlyUsedUsd] = await Promise.all([
    getCashbackUsedUsd(walletId, startOfWeek()),
    getCashbackUsedUsd(walletId, startOfMonth()),
  ]);

  const weeklyRemainingUsd = Math.max(0, MAX_CASHBACK_PER_WEEK_USD - weeklyUsedUsd);
  const monthlyRemainingUsd = Math.max(0, MAX_CASHBACK_PER_MONTH_USD - monthlyUsedUsd);
  const cappedUsd = Math.min(
    rawUsd,
    MAX_CASHBACK_PER_TRANSACTION_USD,
    weeklyRemainingUsd,
    monthlyRemainingUsd,
  );

  if (cappedUsd >= rawUsd) {
    return cashback;
  }
  if (cappedUsd <= 0) {
    return NO_CASHBACK;
  }

  const cappedInCurrency = await convertFromUsd(cappedUsd, currency);
  if (cappedInCurrency === null) {
    return NO_CASHBACK;
  }

  const cashbackAmount = cappedInCurrency.toFixed(2);
  const points = Math.floor(Number(cashbackAmount) * POINTS_PER_CURRENCY_UNIT);

  return { cashbackAmount, points };
}
