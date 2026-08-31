import { AppError } from './app-error';

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds', code = 'INSUFFICIENT_FUNDS') {
    super(422, message, code);
  }
}
