import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const message = err.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    sendError(res, 'VALIDATION_ERROR', message, 400);
    return;
  }

  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');

  const statusCode = 'statusCode' in err ? (err as { statusCode: number }).statusCode : 500;
  const message =
    process.env['NODE_ENV'] === 'production'
      ? 'Internal server error'
      : err.message;

  sendError(res, 'INTERNAL_ERROR', message, statusCode);
}
