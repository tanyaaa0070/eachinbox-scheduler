import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/response';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  // Cross-domain fallback: Support Bearer token or x-user-id header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-user-id'] as string);

  if (token) {
    try {
      const user = await prisma.user.findUnique({ where: { id: token } });
      if (user) {
        req.user = user;
        return next();
      }
    } catch {
      // Fall through to 401
    }
  }

  sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
}
