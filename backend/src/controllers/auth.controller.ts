import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { env } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';

export const authController = {
  /**
   * Initiates Google OAuth flow.
   * GET /api/auth/google
   */
  googleLogin: passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),

  /**
   * Google OAuth callback handler.
   * GET /api/auth/google/callback
   */
  googleCallback: [
    passport.authenticate('google', { failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed` }),
    (_req: Request, res: Response) => {
      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    },
  ],

  /**
   * Get current authenticated user.
   * GET /api/auth/me
   */
  me(req: Request, res: Response) {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
      return;
    }

    sendSuccess(res, {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
    });
  },

  /**
   * Logout user and destroy session.
   * POST /api/auth/logout
   */
  logout(req: Request, res: Response, next: NextFunction) {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        sendSuccess(res, { message: 'Logged out successfully' });
      });
    });
  },
};
