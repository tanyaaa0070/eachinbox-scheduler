import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value ?? '';
        const name = profile.displayName ?? 'Unknown';
        const avatarUrl = profile.photos?.[0]?.value ?? null;

        // Upsert user: create if not exists, update if exists
        const user = await prisma.user.upsert({
          where: { googleId },
          update: { name, email, avatarUrl },
          create: { googleId, name, email, avatarUrl },
        });

        // Ensure user has a default active sender configured
        const existingSender = await prisma.sender.findFirst({ where: { userId: user.id } });
        if (!existingSender) {
          await prisma.sender.create({
            data: {
              userId: user.id,
              email: env.ETHEREAL_USER,
              displayName: `${name} (Default Sender)`,
              smtpHost: env.ETHEREAL_HOST,
              smtpPort: env.ETHEREAL_PORT,
              smtpUser: env.ETHEREAL_USER,
              smtpPass: env.ETHEREAL_PASSWORD,
              hourlyLimit: env.DEFAULT_HOURLY_LIMIT,
              isActive: true,
            },
          });
        }

        logger.info({ userId: user.id, email: user.email }, 'User authenticated via Google');
        return done(null, user);
      } catch (error) {
        logger.error({ error }, 'Google OAuth error');
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
