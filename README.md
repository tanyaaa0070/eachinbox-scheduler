# Email Job Scheduler
[eachinbox-scheduler.vercel.app](https://eachinbox-scheduler.vercel.app/)

A full-stack email scheduler service and dashboard built with Express.js, TypeScript, BullMQ, Redis, PostgreSQL, and React.

## 🌐 Live Deployment & Links

| Service | Live Link | Status |
| :--- | :--- | :--- |
| **Frontend Web App (Vercel)** | [https://eachinbox-scheduler.vercel.app](https://eachinbox-scheduler.vercel.app) | 🟢 Live & Connected |
| **Backend API & Swagger Docs** | [https://disposal-battery-seniors-spirit.trycloudflare.com/api/docs](https://disposal-battery-seniors-spirit.trycloudflare.com/api/docs) | 🟢 Live & Active |
| **Backend Health Check** | [https://disposal-battery-seniors-spirit.trycloudflare.com/api/health](https://disposal-battery-seniors-spirit.trycloudflare.com/api/health) | 🟢 Healthy (`ok`) |
| **GitHub Repository** | [https://github.com/tanyaaa0070/eachinbox-scheduler](https://github.com/tanyaaa0070/eachinbox-scheduler) | 🟢 Up to date |

---





## Features


### Backend
- **Queue-based Scheduling**: Schedules emails using BullMQ delayed jobs backed by Redis (no cron jobs used).
- **Persistent State**: Scheduled emails and delayed jobs persist across server and worker restarts without data loss.
- **Rate Limiting**: Sliding hourly rate limits per sender enforced atomically using Redis Lua scripts.
- **Concurrency & Throttling**: Configurable worker concurrency and minimum delay between consecutive email sends.
- **Idempotency**: Prevents duplicate email sending using deterministic idempotency keys and database status locks.
- **Ethereal SMTP Integration**: Sends test emails via Ethereal fake SMTP with viewable preview links.
- **Dead-Letter Queue (DLQ)**: Automatic exponential backoff for failed dispatches and batch retry support.
- **Open & Click Tracking**: Injected tracking pixels and redirection links to capture email engagement timestamps.

### Frontend
- **Google OAuth Login**: Real Google OAuth authentication (with 1-click instant demo login option).
- **Dashboard**: Overview of scheduled and sent email metrics, queue health gauges, and sender hourly limits.
- **Compose Email Campaign**: Multi-recipient scheduling with CSV/TXT file upload, dynamic lead parsing, custom start time, delays, and hourly limits.
- **Deliverability & Spintax Assistant**: Real-time spam keyword scanner, deliverability health score, and Spintax variation preview.
- **Scheduled & Sent Tables**: Paginated tables with countdown timers, search, status badges, and direct links to view sent emails in Ethereal webmail.
- **Queue Inspector Drawer**: Real-time drawer showing BullMQ queue counts and Redis hourly quotas.

---

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript, BullMQ, ioredis, Prisma ORM, PostgreSQL, Nodemailer, Passport.js
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Lucide Icons
- **Database & Cache**: PostgreSQL, Redis
- **Testing & Mail**: Vitest, Ethereal Email

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Redis, DB, logger, passport config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth & validation middlewares
│   │   ├── queues/          # BullMQ queue producer
│   │   ├── repositories/    # Database query layer (Prisma)
│   │   ├── routes/          # Express API route definitions
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── scripts/         # Benchmark, chaos test, and seed scripts
│   │   ├── services/        # Business logic (email, rate-limit, mail)
│   │   ├── workers/         # BullMQ email worker process
│   │   ├── app.ts           # Express app configuration
│   │   └── server.ts        # API server entry point
│   ├── prisma/              # Database schema & migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI, compose, dashboard & dev components
│   │   ├── pages/           # Page routes (Dashboard, Compose, Sent, Scheduled, etc.)
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript interfaces
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL and Redis (local or cloud instances)

---

### Option 1: Run with Docker (Recommended)

To start the entire full-stack application (PostgreSQL, Redis, Backend API, Worker, and Frontend) in one command:

```bash
docker compose up --build
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **API Documentation**: `http://localhost:3001/api/docs`

---

### Option 2: Manual Local Setup

#### 1. Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your PostgreSQL, Redis, and Ethereal credentials. (To generate a free Ethereal SMTP account, run `npm run setup:ethereal`).

4. Push database schema and seed demo data:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the API server:
   ```bash
   npm run dev
   ```

6. In a separate terminal, start the background worker:
   ```bash
   npm run worker
   ```

#### 2. Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

---

## Architecture & How It Works

### 1. Scheduling (No Cron Jobs)
When a campaign is scheduled, the backend calculates the delay for each recipient:
`delay = Math.max(0, scheduledAt.getTime() - Date.now())`

Jobs are enqueued into BullMQ using Redis sorted sets (`ZSET`). The worker processes each job exactly when its timer expires without database polling or cron libraries.

### 2. Rate Limiting & Throttling
- **Sliding Hourly Limits**: An atomic Redis Lua script increments hourly keys (`ratelimit:sender:{id}:hour:{YYYY-MM-DD-HH}`). If a sender reaches their quota, the worker calculates the time remaining until the next hour and moves the job back to delayed status (`job.moveToDelayed()`) instead of dropping it.
- **Consecutive Delays**: Sequential sends are staggered based on `delayBetweenEmails`. Worker concurrency is controlled via `WORKER_CONCURRENCY`.

### 3. Persistence & Idempotency
- **Crash Recovery**: Delayed jobs reside in Redis AOF storage. If the worker or server crashes, pending jobs remain queued in Redis and resume when the worker restarts.
- **Idempotency**: Each job has a deterministic key (`campaignId:recipient:sequenceNumber`). If an email is already marked `SENT` in PostgreSQL, the worker skips sending to avoid duplicate deliveries.

---

## Testing & Benchmarks

Run unit tests:
```bash
cd backend
npm test
```

Run the 1,000-job load benchmark:
```bash
cd backend
npm run benchmark:load
```

Run the worker crash & restart test:
```bash
cd backend
npm run test:chaos
```

---

## Assumptions, Shortcuts & Trade-offs

### Assumptions
- **Ethereal SMTP for demo**: All emails are sent through Ethereal fake SMTP, which captures mail without delivering to real inboxes. This is intentional for safe demonstration — swapping to a production SMTP provider (SendGrid, SES, etc.) requires only changing the transporter config in [`mail.service.ts`](file:///e:/Outbox/backend/src/services/mail.service.ts).
- **Single Redis instance**: The system assumes a single Redis instance for BullMQ and rate limiting. In production, a Redis Sentinel or Cluster setup would be needed for high availability.
- **UTC-based scheduling**: While the UI allows timezone selection, all scheduling internally uses UTC timestamps. This simplifies cross-timezone consistency but means the user must trust the frontend's timezone conversion.

### Shortcuts
- **Demo login bypass**: A 1-click "Demo Login" button is provided alongside real Google OAuth to make evaluation easier. This creates/reuses a seeded demo user and should be removed in production.
- **No email templating engine**: The compose form accepts raw HTML body. A production system would integrate a template builder (MJML, React Email, etc.).
- **Session store in PostgreSQL**: Express sessions are stored in PostgreSQL (`connect-pg-simple`) rather than Redis for simplicity. For high-traffic production, Redis-backed sessions would be preferred.
- **No real-time WebSocket push**: The frontend polls via TanStack Query refetching. A production version could use WebSocket/SSE for live dashboard updates (the backend already emits events via `appEvents`).

### Trade-offs
- **"Effectively-once" vs exactly-once delivery**: There is an unavoidable window between "SMTP accepted the email" and "PostgreSQL records SENT". If the worker crashes in this window, the email was sent but not recorded. On restart, the idempotency check sees PROCESSING (not SENT), and may re-send. True exactly-once would require an outbox pattern or 2PC, which was deemed over-engineering for this scope.
- **Rate limiting with INCR/DECR**: The Lua-based rate limiter uses atomic INCR and DECR on hourly keys. If the worker crashes after INCR but before DECR (on a rate-limited rejection), the counter could be slightly inflated. The 2-hour TTL on keys ensures this self-heals.
- **BullMQ delayed jobs in Redis**: Scheduled emails live as delayed jobs in Redis sorted sets. Redis AOF persistence ensures they survive restarts, but Redis is fundamentally an in-memory store. For millions of scheduled jobs, a database-driven scheduling approach with Redis as a short-horizon buffer would scale better.
- **Worker concurrency vs throughput**: `WORKER_CONCURRENCY` is set to 5 by default with a 1-second limiter window. This provides controlled throughput but limits burst capacity. The value is configurable via environment variables.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `PORT` | API server port (default: `3001`) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |
| `SESSION_SECRET` | Express session secret key |
| `ETHEREAL_USER` | Ethereal SMTP username |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password |
| `WORKER_CONCURRENCY` | Worker concurrency level (default: `5`) |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (default: `http://localhost:3001`) |
