import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  redact: {
    paths: [
      'smtpPass',
      'smtpPassword',
      'password',
      'secret',
      'GOOGLE_CLIENT_SECRET',
      'SESSION_SECRET',
      'ETHEREAL_PASSWORD',
    ],
    censor: '[REDACTED]',
  },
});
