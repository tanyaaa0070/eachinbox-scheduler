# Scheduled Email Automation System

A full-stack, distributed email scheduling platform and real-time dashboard built with **Express.js**, **TypeScript**, **BullMQ**, **Redis**, **PostgreSQL**, and **React**. Built for Outbox Labs technical assessment.

---

## 🎯 Architecture & Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                       React Frontend                        │
│   Dashboard · Compose · Scheduled · Sent · Queue Monitor    │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js Backend                       │
│    Auth · Validation · Scheduling Engine · Reconciliation   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     PostgreSQL Database     ││   Redis (AOF Persistence)    │
│  Users, Senders, Campaigns, ││  BullMQ Delayed Queue (ZSET) │
│      Scheduled Emails       ││   Atomic Sliding Rate Limits │
└─────────────────────────────┘└──────────────┬───────────────┘
                                              │
                               ┌──────────────▼───────────────┐
                               │        BullMQ Worker         │
                               │ Concurrency · Rate Limiting  │
                               │ Idempotency · Rescheduling   │
                               └──────────────┬───────────────┘
                                              │ SMTP
                               ┌──────────────▼───────────────┐
                               │        Ethereal Email        │
                               │  Fake SMTP · Webmail Preview │
                               └──────────────────────────────┘
```

---

## ✨ Features & Technical Implementation

### Backend Architecture
- **Queue-Based Delayed Scheduling (No Cron / No `setTimeout`)**:
  - Scheduled emails calculate exact timestamp offsets: `delay = Math.max(0, scheduledAt.getTime() - Date.now())`.
  - Jobs are enqueued into BullMQ using Redis Sorted Sets (`ZSET`).
  - Worker processes jobs when the timer fires without database polling.
- **Persistence Across Restarts**:
  - Redis configured with Append-Only File (`--appendonly yes --appendfsync everysec`).
  - BullMQ stores delayed jobs with deterministic job IDs in Redis.
  - If the worker or server stops or crashes, jobs remain intact in Redis and resume immediately upon restart.
- **Atomic Sliding Rate Limiting**:
  - Enforced per-sender per-hour via an atomic Redis Lua script.
  - Checks current quota against hourly limit before incrementing; returns `-1` if exceeded with zero race conditions.
  - Rate-limited jobs are moved back to delayed state using `job.moveToDelayed()` and BullMQ's native `DelayedError`, rescheduling for the start of the next UTC hour.
- **Worker Concurrency & Throttling**:
  - Configurable concurrency (`WORKER_CONCURRENCY`, default `5`).
  - Built-in limiter to throttle sends per second.
  - Sequential send delays (`delayBetweenEmails`) ensure staggered delivery per recipient.
- **Database / Redis Reconciliation**:
  - Prevents split-brain state if Redis fails after PostgreSQL transaction.
  - Automatically reconciles orphaned scheduled records on startup and via `/api/emails/reconcile`.
- **Idempotency Safeguards**:
  - Deterministic idempotency keys (`campaignId:recipient:sequenceNumber`).
  - Optimistic locking via DB status transitions (`SCHEDULED` -> `PROCESSING` -> `SENT`).
  - If a job is picked up and already marked `SENT`, it is safely skipped.
- **Failed Email Retry**:
  - Exponential backoff retry for transient network/SMTP failures.
  - API endpoints to retry individual or all failed emails on demand.
- **Safe Open & Click Tracking**:
  - Injected 1x1 transparent tracking pixel for open events.
  - Validated link redirect endpoint with strict protocol checks preventing open-redirect abuse.
- **Ethereal SMTP Integration**:
  - Emails dispatched via Ethereal fake SMTP.
  - Generates direct test webmail preview URLs (`nodemailer.getTestMessageUrl`).

### Frontend Dashboard
- **Authentication**: Google OAuth with 1-click Demo Login for instant review.
- **Dashboard**: Real-time metrics (Scheduled, Processing, Sent, Failed, Rate Limited), queue health gauges, sender hourly quotas.
- **Compose Campaign**: Multi-recipient scheduling, CSV/TXT file drag-and-drop parser with auto-header detection, custom start times, staggered delays, and sender selection (with round-robin rotation).
- **Deliverability & Spintax Assistant**: Live spam trigger keyword analyzer and Spintax syntax preview.
- **Email Tables**: Dedicated paginated views for Scheduled and Sent emails with search, filters, countdown timers, and direct preview links to Ethereal webmail.
- **Queue Inspector Drawer**: Live inspection of BullMQ queue counts (Waiting, Active, Delayed, Completed, Failed).

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose (or local PostgreSQL and Redis)

---

### Option 1: Run with Docker Compose (Full Stack)

Start all 5 services (PostgreSQL, Redis, Backend, Worker, Frontend) with a single command:

```bash
docker compose up --build
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **API Health Check**: `http://localhost:3001/api/health`
- **API Documentation**: `http://localhost:3001/api/docs`

---

### Option 2: Local Manual Setup

#### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
# If using Docker for just databases:
docker compose up postgres redis -d
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Generate free Ethereal SMTP test credentials (auto-saved or logged)
npm run setup:ethereal

# Run database migrations and seed demo data
npm run db:push
npm run db:seed

# Start the API server
npm run dev

# In a separate terminal, start the email worker
npm run worker
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` and click **"Demo Login"** for instant access.

---

## 🧪 Testing & Verification

### 1. Unit Tests
Verifies CSV lead parsing, idempotency keys, schedule preview math, and UTC rate-limit logic:
```bash
cd backend
npm test
```

### 2. Restart Recovery Test (Crash Simulation)
Proves that scheduled BullMQ delayed jobs survive worker crashes and process reliably after restart:
```bash
cd backend
npm run test:chaos
```
*What it does:*
1. Enqueues 5 delayed jobs spread over future timestamps.
2. Starts Worker #1 to process the initial jobs.
3. Kills Worker #1 (simulating process crash/downtime).
4. Verifies delayed jobs remain safely stored in Redis.
5. Spawns Worker #2 (simulating restart).
6. Verifies that all remaining jobs are processed to 100% completion with zero lost jobs.

### 3. Load & Enqueue Benchmark
Tests enqueue throughput across 1,000 delayed jobs:
```bash
cd backend
npm run benchmark:load
```

### 4. Worker Throughput Benchmark
Tests actual worker processing speed and latency:
```bash
cd backend
npm run benchmark:throughput
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://reachinbox:reachinbox_dev@localhost:5432/reachinbox_scheduler` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | API server port | `3001` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Required for Google Auth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Required for Google Auth |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | `http://localhost:3001/api/auth/google/callback` |
| `SESSION_SECRET` | Express session secret key (>= 16 chars) | - |
| `ETHEREAL_HOST` | Ethereal SMTP host | `smtp.ethereal.email` |
| `ETHEREAL_PORT` | Ethereal SMTP port | `587` |
| `ETHEREAL_USER` | Ethereal SMTP username | - |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password | - |
| `WORKER_CONCURRENCY` | Worker concurrency level | `5` |
| `DEFAULT_EMAIL_DELAY_SECONDS` | Default stagger delay between emails | `2` |
| `DEFAULT_HOURLY_LIMIT` | Default sender hourly quota | `50` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001` |
| `VITE_ENABLE_DEV_TOOLS` | Show dev inspect drawer | `true` |

---

## 📂 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Redis, Database, Logger, Passport config
│   │   ├── controllers/     # Express route handlers
│   │   ├── middleware/      # Auth, error, and validation middleware
│   │   ├── queues/          # BullMQ queue definitions & health checks
│   │   ├── repositories/    # Prisma data access layer
│   │   ├── routes/          # API route definitions
│   │   ├── schemas/         # Zod request validation schemas
│   │   ├── scripts/         # Chaos test, benchmarks, seed scripts
│   │   ├── services/        # Email, Rate-limit, Mail, Reconciliation services
│   │   ├── workers/         # BullMQ email worker process
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point + startup reconciliation
│   ├── prisma/              # Prisma ORM schema & migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI, Compose, Dashboard, Dev tools
│   │   ├── hooks/           # Auth and keyboard shortcut hooks
│   │   ├── layouts/         # Dashboard layout with navigation
│   │   ├── pages/           # Dashboard, Compose, Scheduled, Sent, Senders
│   │   ├── services/        # Axios API client
│   │   └── types/           # TypeScript interfaces
│   └── package.json
├── docker-compose.yml       # Full-stack Compose (5 services)
├── docker-compose.prod.yml  # Production deployment Compose
└── README.md
```

---

## 🔍 Assumptions & Trade-offs

1. **Ethereal Fake SMTP**: Ethereal is used by design so all emails can be verified in real time without sending spam to real addresses. Switching to Amazon SES, SendGrid, or Resend only requires updating SMTP credentials in the Sender configuration.
2. **Redis AOF vs RDB**: Redis is configured with `--appendonly yes --appendfsync everysec` ensuring durable job queues across restarts with at most 1 second of potential data window loss under hard hardware failure.
3. **Effectively-Once Delivery**: Because there is a distributed boundary between external SMTP delivery and PostgreSQL commit, we use optimistic status locking (`PROCESSING`) and idempotent keys to safeguard against duplicates.
4. **Atomic Rate Limiter**: The rate limiter evaluates quota and increments in a single atomic Lua script, preventing concurrency race conditions across multiple worker processes.
