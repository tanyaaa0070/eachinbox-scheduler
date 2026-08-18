import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
}
