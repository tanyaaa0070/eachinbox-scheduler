# ReachInbox Scheduler — Distributed Email Dispatch Engine

A production-grade, distributed email scheduling platform built for the **ReachInbox.ai** Engineering Assignment. Engineered with **BullMQ delayed jobs**, **Redis sliding window rate limiting (Lua)**, **PostgreSQL authoritative state storage**, **zero-loss crash persistence**, and a **polished SaaS UI inspired by ReachInbox's Figma design**.

---

## 📦 Submission Details & Repository Access

- **GitHub Repository**: [https://github.com/tanyaaa0070/eachinbox-scheduler](https://github.com/tanyaaa0070/eachinbox-scheduler)
- **Collaborators Invited**: `Mitrajit` and `Yadav036`

> **Note on Access**: To grant repository access on GitHub:
> 1. Go to `https://github.com/tanyaaa0070/eachinbox-scheduler/settings/access`
> 2. Click **"Add people"**
> 3. Search and invite `Mitrajit` and `Yadav036` as Collaborators.

---

## 🌟 Implemented Features Matrix

### ⚙️ Backend Features
| Feature | Implementation | Details |
|---|---|---|
| **Distributed Scheduler** | BullMQ + Redis Delayed Jobs | Jobs scheduled at exact timestamps (`scheduledAt - now`); sequential delays enforced across campaign recipients. |
| **Crash-Proof Persistence** | Redis AOF + PostgreSQL Authoritative Store | Pending timers survive full backend/worker restarts. Jobs are persistent in Redis sorted sets. |
| **Sliding Rate Limiter** | Redis Lua Script (`ratelimit:sender:{id}:hour:{YYYY-MM-DD-HH}`) | Atomic sliding hourly quotas per sender. If quota is exceeded, jobs are delayed to the start of the next hour window without data loss. |
| **Worker Concurrency** | BullMQ Worker Pool (`WORKER_CONCURRENCY=5`) | High-throughput concurrent email dispatching without blocking the Express API server. |
| **Idempotency Safeguard** | `idempotencyKey = campaignId:recipient:seq` + Optimistic Locking | Deterministic keys with `UNIQUE` index constraint prevent duplicate email dispatches during retries. |
| **Ethereal SMTP Integration** | Nodemailer with Auto-Account Generation | Real email dispatch in staging/demo with generated web preview URLs (`previewUrl`). |
| **Authentication & Sessions** | PostgreSQL-backed Sessions (`connect-pg-simple`) | Dual login support: **Google OAuth 2.0** and **1-Click Instant Demo Login**. |

### 💻 Frontend Features
| Feature | Component / Page | Details |
|---|---|---|
| **Dual Authentication** | `/login` | Google Workspace/Gmail OAuth 2.0 login + **1-Click Instant Demo Login** for evaluation. |
| **Live Telemetry Dashboard** | `/dashboard` | Real-time BullMQ queue health indicators (waiting, active, delayed, completed), sender rate limit gauges, and dispatch metrics. |
| **Smart Email Composer** | `/schedule` | Multi-step composer with template tags (`{{name}}`, `{{company}}`), custom start times, delay slider, and sender limits. |
| **CSV Intelligence Parser** | `/schedule` Modal | Client-side CSV/TXT parsing with auto header detection, RFC validation, and duplicate lead elimination. |
| **Schedule Preview Calculator**| `/schedule` Preview Tab | Dynamic completion time calculation factoring in sequential delays and hourly quota windows. |
| **Scheduled Emails Queue** | `/scheduled` | Paginated queue with live countdown timers, sequence numbers, and manual cancel actions. |
| **Sent Emails & Mail Inspector**| `/sent` | Sent email history with direct links to live **Ethereal Web Preview** URLs. |
| **Campaigns Manager** | `/campaigns` | Overview of all active, scheduled, and completed drip campaigns with real-time progress bars. |
| **Senders & SMTP Config** | `/senders` | Connected SMTP mailboxes, active toggles, hourly limit sliders, and connection diagnostics. |
| **DevTools Queue Inspector** | Global Drawer (<kbd>Terminal</kbd>) | Interactive real-time inspect tool showing raw BullMQ delayed queues and Redis rate limit keys. |
| **Keyboard Shortcuts** | Global Modal (<kbd>?</kbd>) | Keyboard navigation: <kbd>C</kbd> (Compose), <kbd>G</kbd> <kbd>S</kbd> (Scheduled), <kbd>G</kbd> <kbd>T</kbd> (Sent), <kbd>G</kbd> <kbd>D</kbd> (Dashboard). |

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client ["Frontend (React + Vite + Tailwind + Lucide Icons)"]
        UI[ReachInbox UI]
        DevTools[Queue Inspector Drawer]
        CSV[CSV Intelligence Parser]
    end

    subgraph API_Layer ["API Server (Express + TypeScript)"]
        Routes[REST API Endpoints]
        Passport[Google OAuth 2.0 & Demo Auth]
        SessionStore[PostgreSQL Session Store]
        QueueProducer[BullMQ Queue Producer]
    end

    subgraph Background_Worker ["Worker Process (Isolated Node.js Process)"]
        BullWorker[BullMQ Worker Pool]
        Idempotency[Idempotency & Optimistic Locking]
        LuaRateLimiter[Redis Lua Atomic Rate Limiter]
        SMTPTransporter[Nodemailer Pool]
    end

    subgraph Storage_Tiers ["Data & Cache Infrastructure"]
        PostgreSQL[(PostgreSQL / Neon DB\nAuthoritative Persistence)]
        Redis[(Redis / Upstash Redis\nAOF Delayed Queue & Rate Limits)]
        Ethereal[Ethereal SMTP Server\nTest Mailbox & Preview URLs]
    end

    UI -->|HTTP / Cookies| Routes
    Routes --> SessionStore
    Routes --> PostgreSQL
    Routes -->|Add Delayed Jobs| QueueProducer
    QueueProducer --> Redis

    BullWorker -->|Pop Due Delayed Jobs| Redis
    BullWorker -->|Check & Lock Status| Idempotency
    Idempotency --> PostgreSQL
    BullWorker -->|Check Hourly Limit| LuaRateLimiter
    LuaRateLimiter --> Redis
    BullWorker -->|Dispatch Email| SMTPTransporter
    SMTPTransporter --> Ethereal
    BullWorker -->|Record SENT + Preview URL| PostgreSQL
    DevTools -.->|Live Telemetry| Routes
```

---

## 🔁 Scheduling, Persistence & Rate Limiting Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend
    participant API as Express API Server
    participant DB as PostgreSQL (Neon DB)
    participant Redis as Redis / BullMQ (Upstash)
    participant Worker as BullMQ Worker Process
    participant SMTP as Ethereal SMTP

    User->>Frontend: Upload CSV, set Start Time, Delay (e.g. 2s), Hourly Limit (50)
    Frontend->>API: POST /api/emails/schedule
    API->>DB: INSERT Campaign & ScheduledEmail records (Status: SCHEDULED)
    API->>Redis: Bulk Add BullMQ Delayed Jobs (delay = scheduledAt - now)
    API-->>Frontend: 201 Created (Campaign ID)

    Note over Redis,Worker: Time passes until scheduledAt timestamp is reached...

    Worker->>Redis: Job becomes due (Moved from Delayed to Waiting)
    Worker->>DB: Check Status & Optimistic Lock (Mark PROCESSING)
    Worker->>Redis: Execute Lua Script: Check & Increment Sender Hourly Quota
    alt Rate Limit Exceeded
        Worker->>Redis: job.moveToDelayed(next_hour_window_timestamp)
        Worker->>DB: Update Status: RATE_LIMITED
    else Rate Limit OK
        Worker->>SMTP: transporter.sendMail(...)
        SMTP-->>Worker: messageId & Web Preview URL
        Worker->>DB: Update Status: SENT + messageId + previewUrl
        Worker->>DB: Update Campaign Progress
    end
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js 20+** & **npm**
- **Cloud Databases** (Neon PostgreSQL & Upstash Redis credentials already pre-configured in `.env`), OR local Docker services (`docker compose up -d`).

---

### 2. Backend & Worker Setup

Navigate to the `backend` folder:
```bash
cd backend
```

#### Environment Variables (`backend/.env`):
The repository contains a working `.env` connected to Neon PostgreSQL, Upstash Redis, and Ethereal SMTP:
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_1DywzdC8kNYX@ep-super-sound-ayboxlad.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Redis (Upstash Redis TLS)
REDIS_URL="rediss://default:gQAAAAAAAa7kAAIgcDFkMGQ2ZmVkZTk5MDU0NzYyYWFmZDI5MWU4OTUyMzU5OQ@grateful-perch-110308.upstash.io:6379"

# Google OAuth 2.0
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/api/auth/google/callback"

# Session & Security
SESSION_SECRET="reachinbox_super_secret_session_key_64_characters_long_for_security_12345"

# Ethereal Test SMTP
ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT=587
ETHEREAL_USER="wuhgbn6tx2ls45yu@ethereal.email"
ETHEREAL_PASSWORD="Rb7uG7FbDRknx1bwnr"

# Worker Parameters
WORKER_CONCURRENCY=5
DEFAULT_EMAIL_DELAY_SECONDS=2
DEFAULT_HOURLY_LIMIT=50
MAX_RETRY_ATTEMPTS=3

# Server Config
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

#### Setting up fresh Ethereal credentials (Optional):
```bash
npm run setup:ethereal
```

#### Run Database Migrations:
```bash
npx prisma db push
```

#### Start API Server:
```bash
npm run dev
```
*API server will listen on `http://localhost:3001`*

#### Start Background Email Worker (in a separate terminal):
```bash
npm run worker
```
*BullMQ worker will start listening for scheduled email jobs.*

---

### 3. Frontend Setup

Navigate to the `frontend` folder:
```bash
cd ../frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

Click **`🚀 Launch Live Dashboard (Instant Access)`** to enter the workspace immediately.

---

## 🧪 Automated Tests

Run the full automated test suite verifying CSV parsing, rate limits, and idempotency:
```bash
cd backend
npm test
```

---

## 🎥 5-Minute Demo Video Script & Walkthrough

Record a short video (under 5 mins) demonstrating the key flows:

| Step | Time | What to Show on Screen | What to Say / Highlight |
|---|---|---|---|
| **1. Login & Dashboard** | `0:00 - 0:45` | Open `http://localhost:5173`, click **"Instant Access"**, show the Dashboard with stats, BullMQ queue health cards, and sliding rate limit gauges. | "Here is the ReachInbox Scheduler with full real-time telemetry, connected to PostgreSQL and Redis." |
| **2. Compose & CSV Upload** | `0:45 - 1:45` | Go to `/schedule`, select Sender, upload `sample_leads.csv`. Show CSV intelligence reporting valid/invalid/duplicate leads. | "The CSV parser validates emails, removes duplicates, and extracts custom template fields like name and company." |
| **3. Configure Delays & Preview** | `1:45 - 2:30` | Write subject and body using `{{name}}`, toggle **Write / Preview**, set Start Time to 15s in future, Delay = 2s, Limit = 50. Show **Schedule Preview** table. | "The schedule preview computes exact timestamps taking into account sequential inter-email delays and hourly sender quotas." |
| **4. Live Queue Dispatch & Sent Mails** | `2:30 - 3:45` | Click **Schedule Campaign**. Navigate to `/scheduled` to watch countdowns. Then visit `/sent` as emails complete. Click **"Open Mail"** on any sent email to show the real Ethereal email rendered in the browser. | "BullMQ processes delayed jobs in real-time. Each dispatched email records its SMTP ID and live Ethereal preview URL." |
| **5. Server Restart Resilience** | `3:45 - 4:45` | Schedule a campaign starting in 30 seconds. Stop the worker process in terminal (`Ctrl+C`). Wait 10 seconds. Restart `npm run worker`. Watch the worker pick up the exact pending jobs without loss or duplicates. | "Because jobs are stored in Redis sorted sets and tracked idempotently in PostgreSQL, the entire system survives server crashes." |

---

## ⚖️ Assumptions, Shortcuts & Technical Trade-offs

1. **Distributed Two-Phase Commit Boundary**:
   - *Trade-off*: In distributed systems without a distributed 2PC transaction manager across SMTP and SQL, there is a tiny window between SMTP accepting the email and the database recording `SENT`.
   - *Safeguard*: We use optimistic locking (`SCHEDULED` $\rightarrow$ `PROCESSING`) and deterministic idempotency keys (`campaignId:recipient:seq`). We call this *Effectively-Once Delivery with Idempotency Safeguards*.
2. **Stateless Upstash Redis vs. Persistent TCP**:
   - *Choice*: BullMQ requires a persistent TCP connection for blocking commands (`BRPOPLPUSH`). We use the secure TLS endpoint (`rediss://...:6379`) so that BullMQ runs cloud-native with zero local daemon requirements.
3. **Ethereal vs. Production SMTP**:
   - *Choice*: Ethereal Email was selected for safe demonstration and grading, providing instant preview URLs for every dispatched email without spamming real inboxes. Production simply requires updating `SMTP_HOST` to Amazon SES, SendGrid, or Resend.
4. **Sliding Window Hourly Bucketing**:
   - *Design*: Hourly quotas use Redis atomic Lua scripts with hourly timestamp keys (`ratelimit:sender:{id}:hour:{YYYY-MM-DD-HH}`) and auto-expiring TTLs, ensuring zero race conditions between concurrent worker threads.

---

## 📄 License
MIT © 2026 ReachInbox Scheduler. Built for ReachInbox.ai Engineering Assessment.

---

## 🛡️ Production Quality Attributes

- **TypeScript Strict Mode:** Comprehensive typing across models, API contracts, Zod schemas, and UI state.
- **Pino Structured Logging:** Redaction of sensitive fields (`password`, `smtpPass`, `secret`, `GOOGLE_CLIENT_SECRET`).
- **Separation of Concerns:** Zero SMTP dispatches inside HTTP API route handlers. All dispatch work delegated to isolated BullMQ workers.
- **Responsive Layout:** Adaptive desktop and mobile layouts with clean collapsible elements and responsive tables.

