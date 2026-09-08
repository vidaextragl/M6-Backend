import { findUserById } from '../../users/users.repository';
import type { RewardCatalogItemRecord, RewardRecord } from '../../rewards/rewards.types';
import type { TransactionRecord } from '../../transactions/transactions.types';
import { sendEmail } from './email.service';
import { buildRedemptionReceiptEmail } from './templates/redemption.template';
import { buildTransactionReceiptEmail } from './templates/receipt.template';

// El comprobante es un efecto secundario de una operación de dinero que ya quedó confirmada en la
// base de datos: si SES falla (sandbox, destinatario no verificado, credenciales, etc.) eso no debe
// tirar abajo la respuesta del depósito/retiro/swap/canje, por eso el try/catch atrapa todo acá
// adentro en vez de dejar que el error se propague al caller.
export async function sendTransactionReceiptEmail(
  userId: string,
  transaction: TransactionRecord,
): Promise<void> {
  try {
    const user = await findUserById(userId);
    if (!user) {
      return;
    }

    const email = buildTransactionReceiptEmail(transaction);
    await sendEmail({ to: user.email, subject: email.subject, html: email.html });
  } catch (error) {
    console.error('Failed to send transaction receipt email', error);
  }
}

export async function sendRedemptionReceiptEmail(
  userId: string,
  reward: RewardRecord,
  catalogItem: RewardCatalogItemRecord,
): Promise<void> {
  try {
    const user = await findUserById(userId);
    if (!user) {
      return;
    }

    const email = buildRedemptionReceiptEmail(reward, catalogItem);
    await sendEmail({ to: user.email, subject: email.subject, html: email.html });
  } catch (error) {
    console.error('Failed to send redemption receipt email', error);
  }
}
