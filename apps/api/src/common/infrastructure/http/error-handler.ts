import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../../domain/errors/app-error.js';
import { UnprocessableEntityError } from '../../domain/errors/unprocessable-entity-error.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    reply.status(422).send({
      status: 422,
      message: 'Field validation error',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof UnprocessableEntityError) {
    reply.status(422).send({
      status: 422,
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      status: error.statusCode,
      message: error.message,
    });
    return;
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    reply.status(error.statusCode).send({
      status: error.statusCode,
      message: error.message,
    });
    return;
  }

  request.log.error({ err: error }, 'Unhandled request error');
  reply.status(500).send({
    status: 500,
    message: 'Internal server error',
  });
}
