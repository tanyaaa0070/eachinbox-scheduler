# ReachInbox Scheduler - Backend

This is the core API and background worker service for the ReachInbox Scheduler. I built it using Express and BullMQ to ensure that scheduled emails are processed reliably, even under load.

## Tech Stack
- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Neon) with Prisma ORM
- **Queueing**: BullMQ backed by Upstash Redis
- **Email Delivery**: Ethereal SMTP (for safe testing)

## Local Development
1. Run `npm install`
2. Configure your `.env` (see `.env.example`). You'll need valid Postgres and Redis URLs.
3. Generate the Prisma client: `npx prisma generate`
4. Start the server (which includes the embedded worker): `npm run dev`

The API runs on `localhost:3001`.
