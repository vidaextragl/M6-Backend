import { currencyFreaksProvider } from './currencyfreaks.provider';
import { exchangeRateApiProvider } from './exchangerate-api.provider';
import { frankfurterProvider } from './frankfurter.provider';

// Orden de la cascada: Plan A -> Plan B -> Plan C
export const PROVIDERS = [frankfurterProvider, exchangeRateApiProvider, currencyFreaksProvider];

export type { ExchangeRateProvider } from './exchange-rate-provider.interface';
