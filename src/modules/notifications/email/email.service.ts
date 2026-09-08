import { SendEmailCommand } from '@aws-sdk/client-ses';

import { env } from '../../../config';
import { sesClient } from './ses.client';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const command = new SendEmailCommand({
    Source: env.sesFromEmail,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } },
    },
  });

  await sesClient.send(command);
}
