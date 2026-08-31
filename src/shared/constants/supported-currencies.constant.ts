export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'ARS', 'CLP', 'COP', 'BRL'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
