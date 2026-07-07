# Raudha Properties ERP

Enterprise Real Estate ERP & Customer Ledger System for **Raudha Properties** — multi-project inventory, Shariah-compliant installments, share transfers, and automated money receipts.

## Prerequisites

- Node.js 20+
- npm

## Quick Start

```bash
# 1. Clone and enter project
cd Roudha-ERP

# 2. Environment
cp .env.example .env
# Edit AUTH_SECRET and RECEIPT_SECRET (openssl rand -hex 32)

# 3. Install dependencies
npm install

# 4. Database
npx prisma migrate dev
npm run db:seed   # admin user only — empty ERP

# 5. Start dev server
npm run dev
```

Open **http://localhost:3000/admin** (staff). Customer portal is empty until you enroll customers.

### Default admin credentials

| Field | Value |
|-------|-------|
| Email | `admin@raudha.properties` |
| Password | `changeme` |

Override via `.env`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

### Start completely fresh (wipe all data)

```bash
npm run db:fresh
```

This resets the database, re-runs migrations, and seeds **only** the admin account. Uploaded files in `storage/receipts/` and `storage/documents/` should be cleared manually if needed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Wipe data and ensure admin user (empty ERP) |
| `npm run db:fresh` | Full DB reset + migrations + admin-only seed |
| `npm run db:studio` | Open Prisma Studio |

## Database (PostgreSQL / Neon)

Set `DATABASE_URL` to your Neon connection string (Vercel Neon integration sets this automatically).

Local:
```bash
cp .env.example .env
# paste DATABASE_URL from Neon → Show secret
npx prisma migrate deploy
npm run db:seed
```

## Project Structure

```
src/
├── app/           # Next.js App Router (pages + API)
├── components/    # Shared UI + layout
├── features/      # Feature modules (dashboard, customers, payments, transfers)
└── lib/           # Services, auth, validators, constants
```

## Troubleshooting

**Prisma client not found** — Run `npx prisma generate`

**Port 3000 in use** — `PORT=3001 npm run dev`

**Receipt storage** — Ensure `storage/receipts/` is writable

**Login fails** — Re-run `npm run db:seed` to reset admin user

## Tech Stack

- Next.js 15 (App Router)
- Tailwind CSS v4
- Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- NextAuth.js v5 (credentials + RBAC)
- Framer Motion
