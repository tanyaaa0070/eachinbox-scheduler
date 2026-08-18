import { Router, Request, Response } from 'express';

const router = Router();

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ReachInbox Distributed Scheduler API',
    version: '1.0.0',
    description: 'Production-grade email scheduling platform built with Express, BullMQ, Redis Lua rate limiting, and PostgreSQL.',
    contact: {
      name: 'ReachInbox Engineering Assessment',
      url: 'https://reachinbox.ai',
    },
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local Development Server' },
  ],
  paths: {
    '/api/auth/demo': {
      post: {
        summary: '1-Click Instant Demo Login',
        tags: ['Authentication'],
        description: 'Authenticates as Demo User for evaluator assessment without needing Google OAuth credentials.',
        responses: {
          200: { description: 'Authenticated demo user profile and session cookie' },
        },
      },
    },
    '/api/emails/schedule': {
      post: {
        summary: 'Schedule Batch Email Campaign',
        tags: ['Scheduler & Emails'],
        description: 'Creates a campaign and enqueues delayed email dispatches in BullMQ backed by Redis AOF.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'subject', 'body', 'recipients', 'startTime'],
                properties: {
                  name: { type: 'string', example: 'Q3 Sales Outreach' },
                  senderId: { type: 'string', example: 'round-robin' },
                  subject: { type: 'string', example: 'Quick question regarding your email deliverability' },
                  body: { type: 'string', example: '<p>Hi {{name}}, wanted to connect regarding your cold outreach.</p>' },
                  recipients: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['alex@company.com', 'sarah@startup.io', 'lead@acme.org'],
                  },
                  startTime: { type: 'string', format: 'date-time', example: '2026-08-18T12:00:00.000Z' },
                  delayBetweenEmails: { type: 'integer', example: 2 },
                  hourlyLimit: { type: 'integer', example: 50 },
                  timezone: { type: 'string', example: 'UTC' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Campaign scheduled with BullMQ job IDs' },
        },
      },
    },
    '/api/emails/scheduled': {
      get: {
        summary: 'List Scheduled Emails',
        tags: ['Scheduler & Emails'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Paginated scheduled emails' },
        },
      },
    },
    '/api/emails/sent': {
      get: {
        summary: 'List Sent Emails with Ethereal Previews',
        tags: ['Scheduler & Emails'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Paginated delivered emails with preview URLs and open/click timestamps' },
        },
      },
    },
    '/api/emails/retry-all-failed': {
      post: {
        summary: 'Dead-Letter Queue (DLQ) Replay',
        tags: ['Scheduler & Emails'],
        description: 'Re-enqueues all failed email jobs back into BullMQ delayed queue with exponential backoff.',
        responses: {
          200: { description: 'Count of retried jobs' },
        },
      },
    },
    '/api/dashboard/stats': {
      get: {
        summary: 'Dashboard Metric Aggregates',
        tags: ['Telemetry & Metrics'],
        responses: {
          200: { description: 'Count of scheduled, processing, sent, failed, and rate limited emails' },
        },
      },
    },
    '/api/dashboard/queue-health': {
      get: {
        summary: 'BullMQ Queue Health Status',
        tags: ['Telemetry & Metrics'],
        responses: {
          200: { description: 'Active, delayed, waiting, completed, and failed counts in Redis' },
        },
      },
    },
    '/api/dashboard/live-stream': {
      get: {
        summary: 'Server-Sent Events (SSE) Telemetry Stream',
        tags: ['Telemetry & Metrics'],
        description: 'Real-time event stream emitting live email dispatch transitions and queue health pulses.',
        responses: {
          200: { description: 'text/event-stream real-time SSE pipe' },
        },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

router.get('/', (_req: Request, res: Response) => {
  const html = `<!doctype html>
<html>
  <head>
    <title>ReachInbox Scheduler API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://app.reachinbox.ai/favicon.ico" />
    <style>
      body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <script id="api-reference" data-url="/api/docs/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
  res.send(html);
});

export default router;
