# Patch Notes & Improvements (Pre-Submission Audit)

This document details all technical fixes, architectural audits, and reliability enhancements applied to the Scheduled Email Automation Platform.

---

## 1. Critical Fixes

### 1.1 BullMQ DelayedError Resolution
- **Issue**: Previously, `DelayedError` was declared as a custom Error subclass in `backend/src/workers/email.worker.ts`. Because BullMQ's worker engine specifically checks for its own internal `DelayedError` symbol/class, custom error instances led to rate-limited jobs potentially being treated as failed rather than properly rescheduled in the delayed queue.
- **Resolution**: Removed the redundant custom class and directly imported BullMQ's native `DelayedError` (`import { Worker, Job, DelayedError } from 'bullmq'`). Rate-limited jobs now transition cleanly into delayed state with zero false failure alerts.

### 1.2 Genuine Restart Recovery Testing
- **Issue**: The previous `chaos-worker-restart.ts` script enqueued delayed jobs, slept for 2 seconds, and simply verified they were still in the queue. It never stopped or restarted any worker processes.
- **Resolution**: Replaced with a true worker crash-recovery integration test (`backend/src/scripts/chaos-worker-restart.ts`). The test:
  1. Enqueues 5 delayed jobs across future timestamps.
  2. Spawns Worker #1 and processes initial jobs.
  3. Kills Worker #1 mid-execution (simulating ungraceful crash/downtime).
  4. Verifies delayed jobs remain safe and persistent in Redis AOF.
  5. Spawns Worker #2 (simulating service restart).
  6. Verifies all remaining jobs are processed to 100% completion without drops or duplicate sends.

### 1.3 Complete 5-Service Docker Compose Setup
- **Issue**: The root `docker-compose.yml` previously only launched PostgreSQL and Redis, despite the README claiming `docker compose up --build` started the entire application.
- **Resolution**: Expanded `docker-compose.yml` to define all 5 core services: `postgres`, `redis` (with `--appendonly yes --appendfsync everysec`), `backend`, `worker`, and `frontend` (Nginx static proxy). Running `docker compose up --build` now starts the full production-like environment with zero missing components.

---

## 2. Important Robustness Enhancements

### 2.1 Atomic Redis Rate Limiting & UTC Window Consistency
- **Issue**: The rate limiter previously performed separate `INCR` and `DECR` commands across network hops, which was vulnerable to race conditions under concurrent worker threads. Additionally, next-hour retry calculations used local server time instead of UTC.
- **Resolution**:
  - Implemented an atomic Redis Lua script in `backend/src/services/rate-limit.service.ts` that inspects the current quota against the hourly limit *before* incrementing. If the limit is reached, it returns `-1` without mutating the counter or needing a separate `DECR`.
  - Standardized next-hour window calculations to strict UTC (`Date.prototype.setUTCHours`, `setUTCMinutes`), ensuring consistency across disparate timezones and server regions.

### 2.2 BullMQ Custom Job ID Normalization
- **Issue**: Job IDs previously contained colons (`:`), which can interfere with BullMQ's internal Redis key structure (`bull:email-sending:<jobId>`).
- **Resolution**: Sanitized all custom BullMQ job IDs to use hyphens (`-`) instead of colons.

### 2.3 Database & Redis Queue Reconciliation
- **Issue**: In a distributed environment, if Redis restarts or a network partition occurs right after PostgreSQL commits a campaign, scheduled records could exist in PostgreSQL without corresponding BullMQ jobs.
- **Resolution**: Added `reconcileOrphanedEmails()` in `backend/src/services/email.service.ts`. It runs on server startup and can be triggered via `POST /api/emails/reconcile`. It detects any scheduled emails or jobs stuck in `PROCESSING` from an interrupted worker crash, updates PostgreSQL state, and re-enqueues them safely.

### 2.4 Worker Throughput Benchmark
- **Issue**: The existing benchmark only measured enqueue pipeline throughput, not actual job processing throughput.
- **Resolution**: Added a dedicated worker throughput test in `backend/src/scripts/worker-throughput-benchmark.ts` (`npm run benchmark:throughput`) that measures end-to-end execution speed, jobs/second processing rate, and P50/P99 latencies.

### 2.5 Security: Open Redirect Prevention
- **Issue**: The click-tracking endpoint (`GET /api/emails/track/click/:id`) accepted arbitrary redirect URLs without validation.
- **Resolution**: Added strict URL format and protocol validation in `backend/src/controllers/email.controller.ts`, allowing only valid `http:` and `https:` targets to protect recipients against open-redirect exploits.

### 2.6 Frontend Configurable API Base
- **Issue**: The frontend API client hardcoded `const API_BASE = '/api'`, which required an Nginx reverse proxy or local Vite proxy.
- **Resolution**: Configured `frontend/src/services/api.ts` to dynamically use `VITE_API_URL` when provided while maintaining clean fallback to `/api`.

---

## 3. Verification & Compliance Matrix

| Requirement | Implementation | Status |
| :--- | :--- | :--- |
| **Scheduler Engine** | BullMQ delayed jobs backed by Redis sorted sets (`ZSET`) | ✅ Complete |
| **Persistence Across Restarts** | Redis AOF (`appendonly yes`) + PostgreSQL persistence + Startup Reconciliation | ✅ Complete |
| **Atomic Rate Limiter** | Lua script with UTC hour boundaries and native `DelayedError` rescheduling | ✅ Complete |
| **Worker Concurrency** | Configurable `WORKER_CONCURRENCY` with token throttling | ✅ Complete |
| **Crash Recovery Test** | Automated multi-worker crash and restart verification script | ✅ Complete |
| **Docker Compose** | 5 services: postgres, redis, backend, worker, frontend | ✅ Complete |
| **SMTP Delivery** | Ethereal SMTP with test preview URL capture | ✅ Complete |
| **Frontend UI** | React 19 + TypeScript + Tailwind CSS dashboard with demo login | ✅ Complete |

