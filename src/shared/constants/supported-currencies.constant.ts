export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ARS', 'CLP', 'COP', 'BRL'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_METADATA: Record<SupportedCurrency, { name: string; symbol: string }> = {
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  ARS: { name: 'Argentine Peso', symbol: '$' },
  CLP: { name: 'Chilean Peso', symbol: '$' },
  COP: { name: 'Colombian Peso', symbol: '$' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
};
