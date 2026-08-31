import { AppError } from './app-error';

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}
