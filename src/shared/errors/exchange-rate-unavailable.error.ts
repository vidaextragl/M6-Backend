import { AppError } from './app-error';

export class ExchangeRateUnavailableError extends AppError {
  constructor(
    message = 'Exchange rate service is temporarily unavailable',
    code = 'EXCHANGE_RATE_UNAVAILABLE',
  ) {
    super(503, message, code);
  }
}
