import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400
): void {
  const response: ApiResponse = {
    success: false,
    error: { code, message },
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
