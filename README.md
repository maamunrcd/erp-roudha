# Roudha Properties ERP + CRM

Enterprise real-estate ledger and CRM for **Raudha Properties**.

Use it to manage land **projects**, **share inventory**, **customer enrollments**, **installments**, **share transfers**, **money receipts**, **sales leads**, **registration progress**, **sales commissions**, and a **customer portal**.

---

## Table of contents

1. [What this system does](#1-what-this-system-does)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-step local setup](#3-step-by-step-local-setup)
4. [Environment variables](#4-environment-variables)
5. [Login & roles](#5-login--roles)
6. [Day-one business walkthrough](#6-day-one-business-walkthrough)
7. [Module guide (admin menu)](#7-module-guide-admin-menu)
8. [Customer portal](#8-customer-portal)
9. [Scripts reference](#9-scripts-reference)
10. [Deploy to Vercel (production)](#10-deploy-to-vercel-production)
11. [Project structure](#11-project-structure)
12. [Troubleshooting](#12-troubleshooting)
13. [Tech stack](#13-tech-stack)

---

## 1. What this system does

| Area | Capability |
|------|------------|
| **Projects** | Create land projects, pricing phases, share slots, vendor/company buy price |
| **Customers** | Enroll buyers into shares, custom/standard pricing, combo offers |
| **Payments** | Record downpayment/installments, overdue tracking, PDF money receipts |
| **Transfers** | Transfer one share to another person (merge if same project) |
| **CRM** | Leads → site visit → convert to enrollment |
| **Registration** | Agreement → deed → mutation → registry → handover pipeline |
| **Land Value** | Valuation history and growth vs purchase price |
| **Developers** | Developer agreements, share %, construction timeline |
| **Flats** | Flat inventory and allocation to share customers |
| **Handovers** | Keys/docs checklist; completes registration & flat status |
| **Sales Team** | Agents with default commission % |
| **Commissions** | Auto on enrollment (downpayment × %) + manual entries |
| **Reminders** | Manual reminders + overdue installments + due lead follow-ups |
| **Expenses** | Company overhead / project-tagged expenses |
| **Portal** | Customers log in with phone + password to see schedules & receipts |

---

## 2. Prerequisites

Install these before starting:

- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- **npm** (comes with Node)
- A **PostgreSQL** database — recommended: free [Neon](https://neon.tech) project

Optional:

- Git
- A Vercel account (for hosting)

---

## 3. Step-by-step local setup

### Step 1 — Get the code

```bash
cd Roudha-ERP
# or: git clone <your-repo-url> && cd Roudha-ERP
```

### Step 2 — Create environment file

```bash
cp .env.example .env
```

Open `.env` and fill values (see [Section 4](#4-environment-variables)).

**Minimum required:**

1. `DATABASE_URL` — Neon **pooled** connection (`-pooler` in hostname)
2. `DATABASE_URL_UNPOOLED` — Neon **direct** connection (no `-pooler`)
3. `AUTH_SECRET` — run: `openssl rand -hex 32`
4. `RECEIPT_SECRET` — run: `openssl rand -hex 32`

### Step 3 — Install packages

```bash
npm install
```

This also runs `prisma generate` (via `postinstall`).

### Step 4 — Apply database migrations

```bash
npm run db:deploy
```

You should see migrations applied successfully against Neon.

### Step 5 — Seed admin user

```bash
npm run db:seed
```

> **Warning:** Seed **wipes all business data** and leaves only the admin user.  
> Use `db:seed` only on a fresh DB or when you intentionally want a clean slate.

Default admin after seed:

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/login |
| Email | `admin@raudha.properties` |
| Password | `changeme` |

Change later via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`, then re-seed.

### Step 6 — Start the app

```bash
npm run dev
```

Open:

- **Admin:** http://localhost:3000/admin (redirects to login if needed)
- **Customer portal:** http://localhost:3000/portal
- Root `/` redirects to portal

---

## 4. Environment variables

Copy from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled Neon URL (`…-pooler…` + `pgbouncer=true`) for app queries |
| `DATABASE_URL_UNPOOLED` | Yes | Direct Neon URL (no `-pooler`) for migrations |
| `AUTH_SECRET` | Yes | NextAuth + portal JWT secret |
| `RECEIPT_SECRET` | Yes | Receipt signature / hash secret |
| `AUTH_URL` | Local only | `http://localhost:3000` — **omit on Vercel** |
| `SEED_ADMIN_EMAIL` | Optional | Admin email for seed |
| `SEED_ADMIN_PASSWORD` | Optional | Admin password for seed |

### How to get Neon URLs

1. Neon dashboard → your project → **Connection details**
2. Copy **Pooled** string → `DATABASE_URL` (add `&pgbouncer=true` if missing)
3. Toggle pooling off / copy **Direct** string → `DATABASE_URL_UNPOOLED`

Same user, password, and database — only the host differs (`-pooler` vs no `-pooler`).

---

## 5. Login & roles

Staff login: **/login**

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full read/write |
| `MANAGER` | Full read/write |
| `AUDITOR` | Read-only (POST/PATCH/DELETE blocked) |

Customer portal login: **/portal/login** (phone + password created at enrollment).

---

## 6. Day-one business walkthrough

After login as admin, follow this order the first time:

### A. Create a vendor (land company) — optional

1. Go to **Projects → New project**
2. Under vendor section, type a company name → **Add**
3. Or skip and add later

### B. Create a project

1. **Projects → New project**
2. Fill:
   - **Prefix** (e.g. `DMC`) — used in tracking IDs like `DMC-2026-001`
   - **Name**, installment months, total/public shares
   - **Pricing phases** (share ranges + single / twin-combo prices + downpayment)
3. Save

Without pricing phases, you cannot enroll customers.

### C. Add a sales agent (optional but recommended)

1. **Sales Team → Add sales agent**
2. Set name, phone, default commission % (e.g. `2`)
3. Keep **Active** checked

### D. Capture a lead (CRM)

1. **Leads → Add lead**
2. Name, phone, source (Phone / WhatsApp / …)
3. Assign project + sales agent
4. Set next follow-up / site visit if known
5. When ready → **Enroll** (opens enrollment with name/phone/agent filled)

Or skip leads and enroll directly from the project page.

### E. Enroll a customer (booking)

1. Open project → **Add customer**, or convert from a lead
2. Shares, contract start date, pricing mode (Standard / Custom)
3. Select **Sales agent** if commission should apply
4. Save — system creates:
   - Tracking ID
   - Share allocation
   - Payment ledger (downpayment + monthly rows)
   - Portal temporary password (show once)
   - **Pending commission** = downpayment × agent % (if agent selected)

### F. Record a payment

1. **Customers** → open customer → **Record payment** (or payment action from matrix)
2. Choose purpose (Installment / Downpayment / …)
3. Confirm — generates a **simple PDF money receipt**

### G. Registration tracking

1. **Registration** page — update stage:
   - Not started → Agreement → Deed → Mutation → Registry → Handover
2. Or edit the same fields on **Customer edit**

### H. Land value growth (Phase B)

1. **Land Value** — pick project, record a valuation date + land value
2. Filter by project to see growth % vs original buy price

### I. Developer agreement (Phase B)

1. **Developers** — add agreement (name, share %, construction dates, status)
2. Move status: Draft → Signed → In progress → Completed

### J. Flat allocation (Phase B)

1. **Flats** — create flat codes per project (building / floor / size)
2. **Allocate** to a same-project customer (links their active shares)
3. Later: **Handovers** mark keys/docs and complete

### K. Handover (Phase B)

1. **Handovers** — select customer (+ flat), checklist keys/docs
2. **Complete** sets registration stage to handover done and flat to handed over

### L. Reminders inbox

1. Open **Reminders**
2. See: manual reminders + overdue installments + due lead follow-ups
3. Add your own follow-up reminders as needed

### M. Share transfer

1. **Transfers**
2. Select seller (ACTIVE with shares), share slot, cutoff month
3. Enter buyer (existing or new)
4. Execute — merges into existing same-project enrollment when applicable

### N. Mark commissions paid

1. **Commissions**
2. Pending → **Approve** → **Mark paid**

---

## 7. Module guide (admin menu)

| Menu | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | Collection / liquidity / project overview |
| Leads | `/admin/leads` | Inquiry pipeline → convert to enrollment |
| Customers | `/admin/customers` | Enrollments, payments, status, edit |
| Projects | `/admin/projects` | Projects, shares, documents vault |
| Transfers | `/admin/transfers` | Share ownership transfer |
| Registration | `/admin/registration` | Legal progress per enrollment |
| Land Value | `/admin/land-value` | Land valuation history & growth |
| Developers | `/admin/developers` | Developer agreements & timelines |
| Flats | `/admin/flats` | Flat inventory & share allocation |
| Handovers | `/admin/handovers` | Keys/docs checklist & completion |
| Sales Team | `/admin/sales-team` | Agents & default rates |
| Commissions | `/admin/commissions` | Auto + manual commission ledger |
| Reminders | `/admin/reminders` | Follow-ups & dues inbox |
| Expenses | `/admin/expenses` | Company / project expenses |

### Typical flows (short)

```
Lead → Assign agent → Site visit → Enroll → Pay installments
                                         → Registration stages
                                         → Commission approve/pay

Land purchase → Valuations (growth) → Developer agreement
  → Flat inventory → Allocate flat to customer → Handover

Project → Pricing phases → Share inventory → Enroll customer
Customer → Payment → PDF receipt → Portal can download
Seller → Transfer share → Buyer enrollment
```

---

## 8. Customer portal

| Path | Purpose |
|------|---------|
| `/portal/login` | Login with phone + password |
| `/portal` | Projects, installment schedule, receipts |
| `/portal/change-password` | Required on first login if temporary password |
| `/portal/settings` | Profile & password |

Portal credentials are created when a **new profile** enrolls. Admins see the temporary password once on the success screen (and on customer edit until the customer changes it).

---

## 9. Scripts reference

| Command | What it does |
|---------|----------------|
| `npm run dev` | Local development (Turbopack) |
| `npm run build` | `prisma generate` + migrate deploy + Next build |
| `npm start` | Run production server after build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:deploy` | Apply pending migrations (uses direct URL) |
| `npm run db:migrate` | Prisma migrate dev (development) |
| `npm run db:seed` | **Wipe data** + create admin only |
| `npm run db:fresh` | Reset DB + migrations + seed |
| `npm run db:studio` | Prisma Studio (DB browser) |

### Fresh wipe (careful)

```bash
npm run db:fresh
```

Also clear local files if needed:

- `storage/receipts/`
- `storage/documents/`

---

## 10. Deploy to Vercel (production)

### Step 1 — Connect repo to Vercel

Import the GitHub project in Vercel.

### Step 2 — Environment variables (Vercel → Settings → Environment Variables)

Set for **Production** (and Preview if you use it):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon pooled |
| `DATABASE_URL_UNPOOLED` | Neon **direct** (required — build runs migrations) |
| `AUTH_SECRET` | Strong random secret |
| `RECEIPT_SECRET` | Strong random secret |

Do **not** set `AUTH_URL` to localhost on Vercel.

### Step 3 — Seed production once

After first successful deploy, run seed **once** against production DB (from your machine with prod env, or Neon SQL + create user carefully):

```bash
# with production DATABASE_URL in env
npm run db:seed
```

Only do this on an empty production database.

### Step 4 — File storage note

Receipts and documents currently save under local `storage/`.

- **Local:** works
- **Vercel:** ephemeral disk — files may not persist

For production file persistence, plan to use **Vercel Blob** (or S3) and point upload/receipt writers there.

### Step 5 — Redeploy

Every push to `main` (or your production branch) should:

1. Install deps  
2. `prisma generate`  
3. `prisma migrate deploy` (via `db:deploy`)  
4. `next build`

If build fails with **P1002 advisory lock**, `DATABASE_URL_UNPOOLED` is missing or still pointing at the pooler.

---

## 11. Project structure

```
Roudha-ERP/
├── prisma/
│   ├── schema.prisma          # Data models
│   ├── migrations/            # SQL migrations
│   └── seed.ts                # Admin-only wipe seed
├── scripts/
│   └── migrate-deploy.ts      # Safe migrate with Neon direct URL
├── storage/
│   ├── receipts/              # Generated PDF receipts (local)
│   └── documents/             # Uploaded vault files (local)
├── src/
│   ├── app/
│   │   ├── admin/             # Staff UI pages
│   │   ├── portal/            # Customer portal UI
│   │   ├── api/               # REST API routes
│   │   └── (auth)/login/      # Staff login
│   ├── components/            # Shared UI (Sidebar, Button, …)
│   ├── features/              # Feature panels (leads, sales, …)
│   └── lib/
│       ├── services/          # Business logic
│       ├── validators/        # Zod schemas
│       ├── receipts/          # Receipt write helpers
│       └── pdf/               # Simple PDF generation (pdf-lib)
├── .env.example
└── package.json
```

---

## 12. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Prisma client not found` | `npx prisma generate` |
| Build **P1002** / advisory lock timeout | Set `DATABASE_URL_UNPOOLED` to Neon **direct** URL |
| Login fails after wipe | `npm run db:seed` |
| Cannot enroll customers | Add **pricing phases** on the project |
| Payment / receipt fails | Ensure `storage/receipts` is writable locally; check server logs |
| Auditor cannot save anything | Expected — AUDITOR is read-only |
| Port 3000 busy | `PORT=3001 npm run dev` |
| Portal forces password change | Temporary password — use Change password page |
| Migration says pending on Vercel | Confirm unpooled URL + redeploy |

### Quick health checklist

```bash
npm run db:deploy    # migrations OK?
npm run lint         # lint OK?
npx tsc --noEmit     # types OK?
npm run dev          # open /login and /admin
```

---

## 13. Tech stack

- **Next.js 15** (App Router) + React 19
- **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL** (Neon)
- **NextAuth.js v5** (credentials, JWT, RBAC)
- **Zod** validation
- **pdf-lib** (simple money-receipt / document PDFs)
- **Framer Motion** (UI motion)

---

## Support notes for operators

1. Always keep **backups** of the Neon database before `db:seed` / `db:fresh`.
2. Never commit `.env` (secrets).
3. Give field staff `MANAGER`; use `AUDITOR` for read-only finance review.
4. Preferred daily path: **Leads → Enroll → Payments → Registration → Commissions**.

---

**Raudha Properties** — *A Garden of Peace & Trust*
