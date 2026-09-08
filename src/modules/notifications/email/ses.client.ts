import { SESClient } from '@aws-sdk/client-ses';

import { env } from '../../../config';

export const sesClient = new SESClient({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});
