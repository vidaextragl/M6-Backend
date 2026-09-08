import type { RewardCatalogItemRecord, RewardRecord } from '../../../rewards/rewards.types';
import { wrapEmailLayout } from './layout.template';

export function buildRedemptionReceiptEmail(
  reward: RewardRecord,
  catalogItem: RewardCatalogItemRecord,
): { subject: string; html: string } {
  const rows: Array<[string, string]> = [
    ['Fecha', reward.created_at.toLocaleString('es-AR')],
    ['Recompensa', catalogItem.name],
    ['Puntos utilizados', Math.abs(reward.points).toString()],
    ['ID de canje', reward.id],
  ];

  return {
    subject: 'Comprobante de canje de recompensa - Vida Extra',
    html: wrapEmailLayout('Comprobante de canje de recompensa', rows),
  };
}
