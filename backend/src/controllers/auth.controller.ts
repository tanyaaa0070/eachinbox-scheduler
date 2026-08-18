import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
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
   * 1-Click Demo Login for immediate live testing without Google OAuth config.
   * POST /api/auth/demo
   */
  async demoLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const demoEmail = 'tanya.demo@reachinbox.ai';
      const demoGoogleId = 'demo-user-reachinbox-scheduler-001';

      let user = await prisma.user.findUnique({
        where: { googleId: demoGoogleId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: demoGoogleId,
            name: 'Tanya Singh (Admin)',
            email: demoEmail,
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          },
        });

        // Create default active sender with Ethereal SMTP credentials
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: env.ETHEREAL_USER,
            displayName: 'Tanya @ ReachInbox (Default Sender)',
            smtpHost: env.ETHEREAL_HOST,
            smtpPort: env.ETHEREAL_PORT,
            smtpUser: env.ETHEREAL_USER,
            smtpPass: env.ETHEREAL_PASSWORD,
            hourlyLimit: env.DEFAULT_HOURLY_LIMIT,
            isActive: true,
          },
        });
      } else {
        // Ensure default sender exists
        const sender = await prisma.sender.findFirst({ where: { userId: user.id } });
        if (!sender) {
          await prisma.sender.create({
            data: {
              userId: user.id,
              email: env.ETHEREAL_USER,
              displayName: 'Tanya @ ReachInbox (Default Sender)',
              smtpHost: env.ETHEREAL_HOST,
              smtpPort: env.ETHEREAL_PORT,
              smtpUser: env.ETHEREAL_USER,
              smtpPass: env.ETHEREAL_PASSWORD,
              hourlyLimit: env.DEFAULT_HOURLY_LIMIT,
              isActive: true,
            },
          });
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        sendSuccess(res, {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        });
      });
    } catch (error) {
      next(error);
    }
  },

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
