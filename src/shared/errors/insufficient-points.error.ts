import { AppError } from './app-error';

export class InsufficientPointsError extends AppError {
  constructor(message = 'Insufficient points', code = 'INSUFFICIENT_POINTS') {
    super(422, message, code);
  }
}
