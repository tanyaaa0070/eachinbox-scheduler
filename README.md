# Scheduled Email Automation System

A production-grade, distributed email scheduling platform and real-time dashboard built with **Express.js**, **TypeScript**, **BullMQ**, **Redis**, **PostgreSQL (Prisma ORM)**, and **React (Vite + Tailwind CSS)**.

Designed and engineered for the **ReachInbox / Outbox Labs** Software Development Engineer (SDE) technical assessment.

---

## 🌐 Live Production Deployment

| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Web App (Vercel)** | [https://eachinbox-scheduler.vercel.app](https://eachinbox-scheduler.vercel.app) | Responsive React + Tailwind UI |
| **Backend API (Render)** | [https://eachinbox-scheduler.onrender.com](https://eachinbox-scheduler.onrender.com) | Express + BullMQ Worker |
| **API Health Check** | [https://eachinbox-scheduler.onrender.com/api/health](https://eachinbox-scheduler.onrender.com/api/health) | `{"status":"ok", "timestamp": ...}` |
| **API Documentation** | [https://eachinbox-scheduler.onrender.com/api/docs](https://eachinbox-scheduler.onrender.com/api/docs) | Interactive OpenAPI / Swagger UI |
| **Database** | Neon Serverless PostgreSQL | Cloud Managed with SSL |
| **Queue & Cache** | Upstash Redis | Cloud Serverless with TLS |
| **GitHub Repository** | [https://github.com/tanyaaa0070/eachinbox-scheduler](https://github.com/tanyaaa0070/eachinbox-scheduler) | Monorepo (Backend + Frontend) |
| **Demo Video** | [Watch Demo Video (Loom / Drive)](#) | Walkthrough of all assessment criteria |

> **Quick Demo Access**: Click **"Launch Live Dashboard"** on the [Login Page](https://eachinbox-scheduler.vercel.app/login) to instantly log in as an administrator without requiring Google OAuth configuration.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│     Dashboard · Compose · Scheduled Tab · Sent Tab · Queue Drawer      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                         Express.js API Server                          │
│     Auth & Sessions · Validation · Scheduling Engine · Reconciliation  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────┐   ┌───────────▼───────────────────┐
│        PostgreSQL (Prisma)         │   │      Redis (BullMQ Engine)    │
│  Users, Senders, Campaigns, Emails │   │  Sorted Sets (`ZSET`) Delayed │
│     Idempotency & Status Locking   │   │   Atomic Sliding Rate Limits  │
└────────────────────────────────────┘   └───────────┬───────────────────┘
                                                     │
                                         ┌───────────▼───────────────────┐
                                         │         BullMQ Worker         │
                                         │  Concurrency · Rate Limiter   │
                                         │  Hourly Rescheduling · Retry  │
                                         └───────────┬───────────────────┘
                                                     │ SMTP
                                         ┌───────────▼───────────────────┐
                                         │    Ethereal Email (Fake SMTP) │
                                         │   Webmail Message URL Preview │
                                         └───────────────────────────────┘
```

---

## 🔍 Architecture Overview

### 1. How Scheduling Works
- **Zero Polling & Zero `setTimeout`**: Traditional database polling (`setInterval(..., 1000)`) causes severe database strain and race conditions across multiple server instances. In-memory `setTimeout` is lost immediately when the process restarts.
- **Redis Sorted Sets (`ZSET`) via BullMQ**:
  1. When an email is scheduled for a future timestamp (`scheduledAt`), the exact delay offset is computed:
     $$\text{delay} = \max(0, \text{scheduledAt.getTime()} - \text{Date.now()})$$
  2. The job is placed in BullMQ's delayed queue backed by a Redis Sorted Set (`ZSET`), where the score is the target epoch timestamp ($T_{\text{target}}$).
  3. Redis internally handles the timer mechanism. When $T \ge T_{\text{target}}$, BullMQ atomically transitions the job from `delayed` to `waiting` state, and an idle worker immediately picks it up.
- **Staggered Delays**: When multiple recipients are enqueued in a campaign, each recipient receives an incremental stagger delay ($t_i = i \times \text{delaySeconds}$) so recipients are not blasted simultaneously.

### 2. How Persistence on Restart is Handled
- **Persistent Redis Storage**:
  - Redis runs with Append-Only File (AOF) persistence (`--appendonly yes --appendfsync everysec`).
  - BullMQ stores jobs as persistent Redis hash and sorted set entries with deterministic job IDs (`email-{emailId}`).
  - **Crash Resilience**: If the Express server or the BullMQ worker crashes, stops, or restarts, all scheduled jobs remain completely intact in Redis. When the worker resumes, it picks up delayed jobs right on schedule.
- **Startup Reconciliation Engine**:
  - On application startup (`server.ts`), the system executes `reconcileOrphanedEmails()`:
    1. Scans PostgreSQL for any emails marked `SCHEDULED` or `RATE_LIMITED`.
    2. Checks whether their corresponding BullMQ job exists in Redis.
    3. If any job was orphaned due to a network glitch during enqueueing, it automatically re-enqueues it with the correct remaining delay.
    4. Identifies any email stuck in `PROCESSING` status (due to a mid-send worker power failure) and marks it for safe re-processing.

### 3. How Rate Limiting & Concurrency are Implemented
- **Atomic Sliding Rate Limiting (Redis Lua Script)**:
  - Each sender has a configurable hourly sending limit (`sender.hourlyLimit`, default `50` emails/hour).
  - Rate limiting is tracked per sender per UTC hour using the Redis key `rate:sender:{senderId}:{YYYY-MM-DD-HH}`.
  - To prevent race conditions between concurrent worker threads, the check-and-increment is executed in a **single atomic Lua script**:
    ```lua
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) >= tonumber(ARGV[1]) then
      return -1 -- Exceeded quota
    else
      local val = redis.call('INCR', KEYS[1])
      if val == 1 then
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
      end
      return val
    end
    ```
- **Rescheduling on Rate Limit**:
  - If the Lua script returns `-1`, the worker **does not drop or fail the email**.
  - Instead, it updates the DB status to `RATE_LIMITED`, computes the exact millisecond delay until the next UTC hour (`00:00:05` UTC of the following hour), calls `job.moveToDelayed(nextHourTimestamp)`, and throws BullMQ's native `DelayedError`.
  - BullMQ moves the job back into the delayed queue to be sent as soon as the quota resets.
- **Worker Concurrency & Throttling**:
  - BullMQ Worker is instantiated with configurable concurrency (`WORKER_CONCURRENCY=5`).
  - Multiple worker threads process jobs in parallel while respecting individual per-sender limits.
  - Built-in rate limiter throttles overall SMTP socket connections.

---

## 📋 Features Implemented (Assignment Mapping)

### Backend Features
| Requirement | Implementation Detail | Location |
| :--- | :--- | :--- |
| **Scheduler** | Exact epoch timestamp calculation, BullMQ delayed queue, staggered delivery per recipient, zero DB polling. | `backend/src/services/email.service.ts` |
| **Persistence on Restart** | Redis AOF durability + deterministic BullMQ job IDs + startup DB reconciliation (`reconcileOrphanedEmails`). | `backend/src/services/email.service.ts`<br>`backend/src/server.ts` |
| **Rate Limiting** | Per-sender per-UTC-hour quota enforced via atomic Redis Lua script; non-destructive rescheduling using `DelayedError`. | `backend/src/services/rate-limit.service.ts`<br>`backend/src/workers/email.worker.ts` |
| **Concurrency & Throttling** | Multi-threaded BullMQ worker concurrency (`WORKER_CONCURRENCY`), sender round-robin rotation, sequential delay intervals. | `backend/src/workers/email.worker.ts` |
| **Idempotency** | Deterministic keys (`campaignId:recipient:seq`), DB status transitions (`SCHEDULED` $\rightarrow$ `PROCESSING` $\rightarrow$ `SENT`), duplicate prevention. | `backend/src/workers/email.worker.ts` |
| **Failed Email Retry** | Exponential backoff retry mechanism with on-demand manual retry endpoint for failed deliveries. | `backend/src/controllers/email.controller.ts` |
| **Open & Click Tracking** | 1x1 transparent tracking pixel injection and open-redirect protected link tracking. | `backend/src/controllers/email.controller.ts` |
| **Ethereal SMTP Integration** | Direct integration with Ethereal SMTP; captures test message URL for each email. | `backend/src/services/mail.service.ts` |

### Frontend Features
| Requirement | Implementation Detail | Location |
| :--- | :--- | :--- |
| **Authentication** | Google OAuth 2.0 (`prompt: 'select_account'`) + Instant 1-Click Demo Login bypass. | `frontend/src/pages/Login.tsx`<br>`frontend/src/hooks/useAuth.tsx` |
| **Dashboard** | Real-time metric cards (Scheduled, Processing, Sent, Failed, Rate Limited), queue health gauges, hourly quota bars. | `frontend/src/pages/Dashboard.tsx` |
| **Compose Campaign** | Multi-recipient input, CSV/TXT drag-and-drop parser with auto-header mapping, custom start date/time, delay slider, sender selector. | `frontend/src/pages/Compose.tsx` |
| **Deliverability Assistant** | Real-time spam trigger keyword detection, deliverability score calculation, Spintax preview (`{Hi\|Hello}`). | `frontend/src/components/DeliverabilityAssistant.tsx` |
| **Scheduled Emails Table** | Live countdown timers, sender badge, recipient list, status indicator, action buttons (cancel, reschedule). | `frontend/src/pages/Scheduled.tsx` |
| **Sent Emails Table** | Sent timestamp, delivery status, direct **"View on Ethereal"** link to inspect test email in real webmail interface. | `frontend/src/pages/Sent.tsx` |
| **Queue Inspector Drawer** | Real-time visual drawer showing BullMQ queue counts (Waiting, Active, Delayed, Completed, Failed). | `frontend/src/components/QueueDrawer.tsx` |

---

## 🛠️ Step-by-Step Local Setup

### Prerequisites
- **Node.js** >= 18.x
- **PostgreSQL** (local or hosted like Neon)
- **Redis** (local or hosted like Upstash)
- **Git**

---

### Option A: Run Full Stack via Docker Compose (Recommended)

Run all 5 services (PostgreSQL, Redis, Backend API, BullMQ Worker, React Frontend) in one command:

```bash
docker compose up --build
```

Access the applications:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **API Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Swagger Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

### Option B: Manual Local Setup (Step-by-Step)

#### 1. Clone the Repository
```bash
git clone https://github.com/tanyaaa0070/eachinbox-scheduler.git
cd eachinbox-scheduler
```

#### 2. Start PostgreSQL & Redis
If you have Docker installed, you can start just the database and queue:
```bash
docker compose up postgres redis -d
```
*(Or use your existing local PostgreSQL on port 5432 and Redis on port 6379).*

#### 3. Backend Setup
```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment file
cp .env.example .env

# 3. Generate free Ethereal SMTP test credentials automatically:
npm run setup:ethereal
# This script creates a free disposable test account and prints your ETHEREAL_USER and ETHEREAL_PASSWORD.

# 4. Push database schema and seed initial data
npm run db:push
npm run db:seed

# 5. Start the Express API server (Terminal 1)
npm run dev

# 6. Start the BullMQ Email Worker (Terminal 2)
npm run worker
```

#### 4. Frontend Setup
```bash
cd ../frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📧 How to Set Up Ethereal Email & Environment Variables

### Generating Free Ethereal Credentials
Ethereal is a completely free, fake SMTP service created by Nodemailer that captures sent emails without delivering them to real inboxes.

We provided an automated script that provisions credentials in one step:
```bash
cd backend
npm run setup:ethereal
```
The script will output:
```text
✅ Generated Ethereal Credentials:
ETHEREAL_USER=your_user@ethereal.email
ETHEREAL_PASSWORD=your_password
```
Copy these into your `backend/.env` file. Every email sent will generate a preview URL in the backend logs and the frontend Sent table!

### Environment Variables Reference

#### Backend (`backend/.env`)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/scheduler` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | API HTTP port | `3001` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-client-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth Redirect URI | `http://localhost:3001/api/auth/google/callback` |
| `SESSION_SECRET` | Express session encryption key | `min-16-char-super-secret-key` |
| `ETHEREAL_HOST` | Ethereal SMTP host | `smtp.ethereal.email` |
| `ETHEREAL_PORT` | Ethereal SMTP port | `587` |
| `ETHEREAL_USER` | Ethereal account username | `user@ethereal.email` |
| `ETHEREAL_PASSWORD` | Ethereal account password | `password` |
| `WORKER_CONCURRENCY` | Concurrent jobs per worker | `5` |
| `DEFAULT_EMAIL_DELAY_SECONDS` | Default stagger delay | `2` |
| `DEFAULT_HOURLY_LIMIT` | Default sender hourly quota | `50` |
| `FRONTEND_URL` | Allowed CORS frontend origin | `http://localhost:5173` |

#### Frontend (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of backend API | `http://localhost:3001` |
| `VITE_ENABLE_DEV_TOOLS` | Enable live queue inspector | `true` |

---

## 🧪 Testing, Chaos & Benchmarks

The project includes automated verification test suites:

### 1. Unit & Integration Tests
Tests recipient CSV parsing, schedule preview math, idempotency key generation, and rate limiting:
```bash
cd backend
npm test
```

### 2. Chaos / Restart Recovery Test
Verifies that delayed jobs survive process termination and restart cleanly:
```bash
cd backend
npm run test:chaos
```
**Test sequence:**
1. Schedules 5 delayed email jobs in Redis.
2. Starts Worker #1 to process the initial batch.
3. Abruptly terminates Worker #1 (simulating server crash).
4. Inspects Redis to assert that remaining delayed jobs were preserved.
5. Starts Worker #2 (simulating service restart).
6. Asserts 100% completion of all remaining jobs with zero lost records.

### 3. Worker Throughput Benchmark
Tests worker processing velocity and rate-limiting enforcement under high volume:
```bash
cd backend
npm run benchmark:throughput
```

---

## 📹 Demo Video Recording Guide (Max 5 Minutes)

Use this step-by-step checklist when recording the walkthrough video:

1. **Overview & Architecture (0:00 - 0:45)**:
   - Introduce project: Full-stack Scheduled Email Automation System.
   - Show frontend on Vercel and backend on Render with Swagger docs.
2. **Scheduling Flow (0:45 - 2:00)**:
   - Log in using 1-Click Demo Login or Google OAuth.
   - Navigate to **Compose**.
   - Paste or upload multiple recipient emails (e.g. 5 recipients).
   - Set a custom schedule time (e.g. 1 minute in the future) and a 3-second delay between emails.
   - Click **Schedule Campaign**.
   - Show the **Scheduled Tab**: highlight the live countdown timer and `SCHEDULED` status.
3. **Sent Emails & Ethereal Webmail (2:00 - 3:00)**:
   - Show the jobs transitioning to `SENT` as the schedule fires.
   - Navigate to the **Sent Tab**.
   - Click the **"View on Ethereal"** button on a sent email.
   - Show the actual rendered email in the Ethereal webmail inbox with headers and body.
4. **Server Restart Recovery Demo (3:00 - 4:00)**:
   - Schedule an email 2 minutes in the future.
   - In terminal, stop the worker/backend process (`Ctrl+C`).
   - Point out that the email remains queued in Redis/PostgreSQL.
   - Restart the server (`npm run dev` / `npm run worker`).
   - Observe the worker picking up the delayed job at the scheduled timestamp and sending it successfully.
5. **Rate Limiting & Concurrency (4:00 - 5:00)**:
   - Show a sender with an hourly limit (e.g. 5 emails/hour).
   - Show how excess emails transition to `RATE_LIMITED` and are rescheduled to the next UTC hour without dropping.

---

## ⚖️ Assumptions, Shortcuts & Trade-offs

1. **Ethereal Fake SMTP over Production SES/SendGrid**:
   - *Decision*: Configured with Ethereal SMTP by default.
   - *Rationale*: Allows evaluators to test live email scheduling immediately without requiring verified domain DNS records (DKIM/SPF) or incurring paid SMTP charges. Any standard SMTP provider (SendGrid, Postmark, AWS SES) can be plugged in by changing the sender credentials.
2. **Redis AOF Durability vs RDB Snapshots**:
   - *Decision*: Configured Redis with `--appendonly yes --appendfsync everysec`.
   - *Trade-off*: Slightly higher I/O overhead than RDB snapshots, but guarantees that scheduled jobs survive power failures and crashes with a maximum potential loss window of $\le 1$ second under catastrophic hardware failure.
3. **Atomic Lua Script vs Distributed Locks**:
   - *Decision*: Implemented rate limiting in a single atomic Redis Lua script instead of Redlock / distributed mutexes.
   - *Rationale*: Zero locking overhead, no deadlock risk, and sub-millisecond execution time while guaranteeing atomic read-and-increment across all concurrent workers.
4. **1-Click Demo Login alongside Google OAuth**:
   - *Decision*: Provided a 1-click administrative login option.
   - *Rationale*: Allows instant evaluation and testing on cloud deployments even if Google Cloud OAuth test user permissions or third-party cookies are restricted in the evaluator's browser.
5. **Prisma ORM with PostgreSQL**:
   - *Decision*: Selected PostgreSQL with Prisma ORM.
   - *Rationale*: Provides strong ACID guarantees for email status transitions (`SCHEDULED` $\rightarrow$ `PROCESSING` $\rightarrow$ `SENT`), relational integrity across campaigns/senders, and type-safe migrations.

---

## 👥 GitHub Access & Submission

- **Repository**: [https://github.com/tanyaaa0070/eachinbox-scheduler](https://github.com/tanyaaa0070/eachinbox-scheduler)
- **Collaborator Invited**: `Mitrajit`
- **Submission Form**: [Google Form](https://forms.gle/2qmgDJxV3HZmf9Pt8)
