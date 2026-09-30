import { AppError } from './app-error.js';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export class UnprocessableEntityError extends AppError {
  constructor(public readonly errors: readonly FieldError[]) {
    super('Field validation error', 422);
  }
}
