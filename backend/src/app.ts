import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import dashboardRoutes from './routes/dashboard.routes';
import campaignRoutes from './routes/campaign.routes';
import senderRoutes from './routes/sender.routes';

export function createApp() {
  const app = express();

  // ── Security ──
  app.use(helmet({
    contentSecurityPolicy: false, // Let frontend handle CSP
  }));

  // ── CORS ──
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Body parsing ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Sessions (PostgreSQL-backed) ──
  const PgSession = connectPgSimple(session);
  app.use(session({
    store: new PgSession({
      conString: env.DATABASE_URL,
      tableName: 'Session',
      createTableIfMissing: false, // Managed by Prisma migrations
      schemaName: 'public',
      pruneSessionInterval: 60 * 15, // Prune every 15 min
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    name: 'reachinbox.sid',
  }));

  // ── Passport ──
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Health check ──
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ──
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/senders', senderRoutes);

  // ── Error handler (must be last) ──
  app.use(errorHandler);

  return app;
}
