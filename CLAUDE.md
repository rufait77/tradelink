# Tradelink — CLAUDE.md

## What This Is

Contractor referral commission platform. Contractors refer jobs they can't take to others and earn 20% commission. Clients pay into escrow, funds release after job completion. Monthly subscription required to participate.

## Monorepo Structure (npm workspaces + Turborepo)

```
tradelink/
├── apps/
│   ├── api/             Express.js REST API + Socket.IO (port 4000)
│   ├── web/             Next.js 14 App Router — contractor/client web app (port 3004)
│   └── admin/           Next.js 14 App Router — admin dashboard (port 3005)
├── packages/
│   ├── types/           Shared TypeScript types (@tradelink/types)
│   └── validators/      Shared Zod schemas (@tradelink/validators)
├── prisma/
│   ├── schema.prisma    Database schema (19 models, 14 enums)
│   ├── migrations/      Prisma migrations
│   └── seed.ts          Seeds platform_settings table
└── turbo.json           Build pipeline config
```

## Commands

```bash
# Install everything
npm install

# Dev (all apps)
npm run dev

# Dev (individual)
cd apps/api && npm run dev      # API on :4000
cd apps/web && npm run dev      # Web on :3004
cd apps/admin && npm run dev    # Admin on :3001 (dev) / :3005 (prod)

# Build
npm run build                   # All apps via Turbo
cd apps/api && npm run build    # API: tsc → dist/

# Database
npx prisma generate             # Generate Prisma client
npx prisma migrate dev          # Dev migrations
npx prisma migrate deploy       # Production migrations
npx prisma studio               # Visual DB browser

# Type check
npm run type-check
```

## Tech Stack

| Layer | Tech |
|---|---|
| API | Express.js + TypeScript, compiled to `dist/` via tsc |
| Auth | JWT (access 15m + refresh 7d httpOnly cookie), separate admin JWT (8h) |
| Database | PostgreSQL via Prisma ORM |
| Queue | Bull + Redis (commission payouts) |
| Cron | 5 scheduled jobs (in-process, `apps/api/src/jobs/cron.ts`) |
| Payments | Stripe (Checkout Sessions, Connect Express, Webhooks) |
| Email | Resend (transactional emails) |
| Uploads | Multer + Sharp (image compression), stored in `apps/api/uploads/` |
| Real-time | Socket.IO (DM typing indicators, online status) |
| Web/Admin | Next.js 14 App Router + Tailwind CSS + Radix UI |
| State | Zustand (persisted auth store) |
| Forms | React Hook Form + Zod (shared validators from `@tradelink/validators`) |
| Animations | Framer Motion |
| Charts | Recharts |

## Database Schema (19 Models)

**Core**: User, ContractorProfile, Subscription
**Job lifecycle**: Job, JobInterest, Quote, ClientLead (magic-link client access)
**Payments**: EscrowPayment, JobPayment (legacy), Commission
**Trust/Safety**: Dispute, ContractorStrike
**Communication**: Message (job-scoped), DirectMessage (contractor-to-contractor), MessageReport
**Platform**: Notification (30+ types), PlatformSetting, AuditLog, Review

### Key Enums
- **TradeType**: 22 values (Landscaping, Roofing, HVAC, Plumbing, Electrical, Painting, Carpentry, Flooring, Masonry, Cleaning, PressureWashing, JunkRemoval, WindowInstallation, Siding, Clearing, GeneralContracting, Welding, Drywall, Barber, Cosmetologist, Esthetician, Other)
- **JobStatus**: Open → InterestClosed → Assigned → QuoteSent → QuoteApproved → EscrowFunded → InProgress → ContractorDone → ClientConfirmed → Completed (+ Disputed, Cancelled, Expired)
- **EscrowStatus**: pending, funded, released, refunded, disputed

## Business Flow

```
Referee posts job → 24hr interest window → Referee selects contractor →
Contractor sends quote → Client approves via portal → Client pays into escrow →
Contractor works → Marks done → Client confirms (or auto-release 5 days) →
Funds split: Contractor (total - 5% platform fee - 20% commission), Referrer gets commission via Stripe Connect
```

## API Route Groups

| Prefix | Auth | Purpose |
|---|---|---|
| `/auth` | Public | Register, login, refresh, verify email, password reset |
| `/jobs` | requireAuth + subscriptionGate | Job CRUD, interest, status transitions |
| `/contractors` | Mixed | Public profiles, profile edit |
| `/quotes` | requireAuth | Quote submission and revisions |
| `/escrow` | requireAuth | Create/release/refund escrow |
| `/payments` | requireAuth | Stripe checkout, subscription portal, Connect onboarding |
| `/commissions` (alias `/earnings`) | requireAuth | Commission/earnings tracking |
| `/messages` | requireAuth | Job-scoped messaging |
| `/dm` | requireAuth | Direct messages between contractors |
| `/notifications` | requireAuth | In-app notifications |
| `/reviews` | requireAuth | Job reviews |
| `/client/:token` | Token-based | Client portal (no login — magic link) |
| `/settings` | Mixed | Platform settings |
| `/webhooks/stripe` | Stripe signature | Stripe webhook handler |
| `/admin` | requireAdmin | Full admin API (users, disputes, analytics, settings, etc.) |

## Middleware Stack

1. Helmet (security headers)
2. CORS (whitelist WEB_URL + ADMIN_URL)
3. Compression
4. Global rate limit (200 req/min per IP, skips /health and /webhooks)
5. Cookie parser + body parsers (raw for Stripe webhooks, JSON for rest)
6. Morgan HTTP logging → Winston
7. Per-route: `requireAuth`, `requireAdmin`, `subscriptionGate`, `validate(zodSchema)`
8. Global error handler (AppError class with statusCode + code)

## Cron Jobs (apps/api/src/jobs/cron.ts)

| Interval | Job |
|---|---|
| Every 15 min | Close interest windows (Open → InterestClosed after 24hrs) |
| Hourly | Auto-expire jobs past expiresAt |
| Hourly | Ghost contractor detection (48hrs no quote → warning → strike → suspend) |
| Hourly | Auto-release escrow (ContractorDone 5+ days → complete + distribute funds) |
| Hourly | Subscription renewal reminders (7 days before expiry) |

## Platform Settings (Database-driven)

| Key | Default | Purpose |
|---|---|---|
| `signup_fee` | $29.99 | One-time registration fee |
| `subscription_fee` | $9.99 | Monthly subscription |
| `platform_fee_pct` | 5% | Platform cut per transaction |
| `commission_pct` | 20% | Referrer commission rate |
| `developer_mode` | false | Bypasses all payment/subscription checks |
| `min_job_budget` / `max_job_budget` | $100 / $100,000 | Job budget bounds |

## Key File Paths

```
# API
apps/api/src/index.ts                    # Server entry + Socket.IO setup
apps/api/src/config/                     # env.ts, stripe.ts, prisma.ts, redis.ts, logger.ts
apps/api/src/controllers/               # Business logic per domain
apps/api/src/routes/                     # Express route definitions
apps/api/src/middleware/                 # auth.ts, subscriptionGate.ts, errorHandler.ts, validate.ts
apps/api/src/services/                   # email.service.ts, settings.service.ts, penalty.service.ts
apps/api/src/jobs/                       # cron.ts, commission-processor.ts
apps/api/src/utils/jwt.ts               # Token signing/verification

# Shared
packages/types/src/index.ts             # All shared TypeScript types
packages/validators/src/index.ts        # All shared Zod schemas

# Database
prisma/schema.prisma                    # 19 models, 14 enums

# Frontend
apps/web/src/app/                       # Next.js pages (App Router)
apps/web/src/components/                # layout/ and ui/ components
apps/web/src/lib/api.ts                 # Axios client with JWT interceptor
apps/web/src/lib/clientApi.ts           # Client portal API (no auth)
apps/web/src/lib/socket.ts             # Socket.IO client
apps/web/src/store/auth.store.ts       # Zustand auth store
apps/web/tailwind.config.js            # Theme: dark navy + amber accents
```

## Environment Variables

API requires: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `API_URL`, `WEB_URL`, `ADMIN_URL`

Web requires: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Admin requires: `NEXT_PUBLIC_API_URL`

## Conventions

- All Prisma models map to snake_case table names via `@@map()`
- API responses: `{ success: true, data: ... }` or `{ success: false, error: "...", code: "ERROR_CODE" }`
- Errors use `AppError(message, statusCode, code)` class
- Fee percentages are snapshotted on Quote creation (platformFeePct, commissionPct)
- Shared packages use `"*"` version in app package.json (workspace resolution)
- Frontend uses path alias `@/*` → `./src/*`
- Auth tokens stored in Zustand with localStorage persistence (key: `tradelink_auth`)
- Refresh token in httpOnly cookie named `tl_refresh`

## Gotchas

- **API runs compiled JS from `dist/`** — must run `npm run build` (tsc) before `pm2 restart`, not just restart
- **Developer mode** bypasses all Stripe payments and subscription checks — toggle via admin panel or DB
- **No automated tests** exist in the project
- **No CI/CD** — manual deploy via SSH to Contabo VPS (72.62.243.117)
- **Email goes to spam** — DKIM/SPF not configured on tradelink.rufaitlabs.cloud
- **Port 5000 on VPS** is used by another project (VehicleTracking .NET app) — do not touch
- **PROJECT_DOCS.md is slightly outdated** — uses old model names (ClientPortal→ClientLead, InterestExpression→JobInterest, Escrow→EscrowPayment) and says 14 models when there are actually 19
- **Admin users** must be created manually (no seed) — register then UPDATE role to 'admin' in DB
- **JobPayment model is legacy** — current flow uses EscrowPayment
- **Commission payouts** require contractor to have active Stripe Connect; without it, commissions stay pending
