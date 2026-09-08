import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY || '',
  currencyFreaksApiKey: process.env.CURRENCY_FREAKS_API_KEY || '',
  exchangeRateCacheTtlMinutes: Number(process.env.EXCHANGE_RATE_CACHE_TTL_MINUTES) || 30,
  awsRegion: process.env.AWS_REGION || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  sesFromEmail: process.env.SES_FROM_EMAIL || '',
};
