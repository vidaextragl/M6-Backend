import type { BalanceRecord } from '../balances/balances.types';
import { CURRENCY_METADATA, type SupportedCurrency } from '../../shared/constants';
import { getExchangeRate } from '../exchange-rates';
// Import directo (no al barrel '../transactions'): ese barrel re-exporta transactions.routes,
// que importa authMiddleware de auth — mismo cuidado de ciclo que en el resto del proyecto.
import { getNetChangeByCurrencySince } from '../transactions/transactions.repository';

const HISTORY_DAYS = 7;
const MONTHLY_WINDOW_DAYS = 30;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// No guardamos tipo de cambio histórico (solo la última cotización conocida), así que reconstruir
// "cuánto valía esto en USD hace N días" usa la tasa de HOY, no la de ese momento — una
// simplificación aceptada, no una serie de mercado precisa.
async function convertToUsd(currency: string, amount: number): Promise<number> {
  if (amount === 0) {
    return 0;
  }
  if (currency === 'USD') {
    return amount;
  }

  try {
    const { rate } = await getExchangeRate(currency, 'USD');
    return amount * rate;
  } catch {
    // Si ni siquiera hay una cotización de respaldo disponible, esa moneda no suma al total en
    // vez de tirar abajo todo el dashboard.
    return 0;
  }
}

async function getTotalBalanceAtOffset(
  walletId: string,
  balances: BalanceRecord[],
  daysBack: number,
): Promise<number> {
  const netChanges =
    daysBack === 0 ? {} : await getNetChangeByCurrencySince(walletId, daysAgo(daysBack));

  let total = 0;
  for (const balance of balances) {
    const current = Number(balance.amount);
    const net = netChanges[balance.currency] ?? 0;
    const pastAmount = current - net;
    total += await convertToUsd(balance.currency, pastAmount);
  }

  return total;
}

function percentageChange(current: number, past: number): number {
  if (past === 0) {
    return 0;
  }
  return Number((((current - past) / past) * 100).toFixed(2));
}

export async function computeWalletSummary(walletId: string, balances: BalanceRecord[]) {
  const totalBalance = await getTotalBalanceAtOffset(walletId, balances, 0);
  const totalBalance30dAgo = await getTotalBalanceAtOffset(walletId, balances, MONTHLY_WINDOW_DAYS);

  const netChangeSince7d = await getNetChangeByCurrencySince(walletId, daysAgo(HISTORY_DAYS - 1));

  const currencies = balances.map((balance) => {
    const current = Number(balance.amount);
    const net = netChangeSince7d[balance.currency] ?? 0;
    const past = current - net;
    const meta = CURRENCY_METADATA[balance.currency as SupportedCurrency];

    return {
      code: balance.currency,
      name: meta.name,
      symbol: meta.symbol,
      balance: current,
      changePercentage: percentageChange(current, past),
    };
  });

  // Historial día por día: se recalcula "el total de ese día" restando los movimientos ocurridos
  // desde entonces — son HISTORY_DAYS consultas extra, aceptable a esta escala (proyecto de
  // estudio, no un dashboard con miles de usuarios concurrentes).
  const balanceHistory = [];
  for (let daysBack = HISTORY_DAYS - 1; daysBack >= 0; daysBack--) {
    const total = await getTotalBalanceAtOffset(walletId, balances, daysBack);
    const label = daysAgo(daysBack).toLocaleDateString('en-US', { weekday: 'short' });
    balanceHistory.push({ label, value: Number(total.toFixed(2)) });
  }

  return {
    totalBalance: Number(totalBalance.toFixed(2)),
    monthlyChangePercentage: percentageChange(totalBalance, totalBalance30dAgo),
    balanceHistory,
    currencies,
  };
}
