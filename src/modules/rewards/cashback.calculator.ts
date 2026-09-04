// 5% de cashback sobre el monto de la compra, expresado en "puntos" a razón de 100 puntos por
// cada unidad de moneda gastada (mismo criterio con el que se armó el catálogo de canje).
export const CASHBACK_RATE = 0.05;
const POINTS_PER_CURRENCY_UNIT = 100;

export interface CashbackResult {
  cashbackAmount: string;
  points: number;
}

export function calculateCashback(amountSpent: string): CashbackResult {
  const spent = Number(amountSpent);
  const cashbackAmount = (spent * CASHBACK_RATE).toFixed(2);
  const points = Math.floor(spent * CASHBACK_RATE * POINTS_PER_CURRENCY_UNIT);

  return { cashbackAmount, points };
}
