import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';

import { getRewardsSummary } from '../../rewards/rewards.service';

export const getRewardsDeclaration: FunctionDeclaration = {
  name: 'get_rewards_summary',
  description:
    'Devuelve los puntos gamer disponibles del usuario y el catálogo de recompensas canjeables ' +
    'con su costo en puntos.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export async function getRewardsHandler(userId: string): Promise<Record<string, unknown>> {
  const summary = await getRewardsSummary(userId);
  return {
    pointsBalance: summary.pointsBalance,
    catalog: summary.catalog.map((item) => ({
      id: item.id,
      name: item.name,
      costPoints: item.costPoints,
    })),
  };
}
