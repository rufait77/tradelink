# Tradelink — Project Documentation

> **Last updated**: March 15, 2026
> A comprehensive guide covering VPS infrastructure, Git workflows, project architecture, and local/production setup.

---

## Table of Contents

1. [VPS Infrastructure](#1-vps-infrastructure)
2. [Git & Source Control](#2-git--source-control)
3. [Project Architecture](#3-project-architecture)
4. [Database Schema](#4-database-schema)
5. [API Routes & Services](#5-api-routes--services)
6. [Frontend Pages](#6-frontend-pages)
7. [Environment Variables](#7-environment-variables)
8. [Local Development Setup](#8-local-development-setup)
9. [Production Deployment](#9-production-deployment)
10. [Important Notes & Gotchas](#10-important-notes--gotchas)

---

## 1. VPS Infrastructure

### Server Details

| Item | Value |
|------|-------|
| **Provider** | Contabo VPS |
| **IP Address** | `72.62.243.117` |
| **OS** | Ubuntu 24.04.4 LTS |
| **CPU/RAM** | Shared VPS, 28% memory usage typical |
| **Disk** | 95.82 GB (26.9% used) |
| **Node.js** | v20.20.1 |
| **npm** | v11.x |

### SSH Access

```bash
# Connect (password auth)
ssh root@72.62.243.117

# Recommended flags to prevent drops
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 root@72.62.243.117
```

> **IMPORTANT**: The SSH password is entered manually at each connection.
> There is no SSH key-based auth configured currently.
> When pasting the password, nothing will appear on screen — just paste and press Enter.

### Project Directory on VPS

```
/var/www/tradelink/          ← Root of the project (cloned from GitHub)
├── apps/
│   ├── api/                 ← Express API (built with tsc → dist/)
│   │   ├── dist/            ← Compiled JavaScript output
│   │   ├── uploads/         ← User-uploaded files
│   │   └── .env             ← Production environment variables
│   ├── web/                 ← Next.js web app (built with next build → .next/)
│   └── admin/               ← Next.js admin panel (built with next build → .next/)
├── packages/
│   ├── types/               ← Shared TypeScript types
│   └── validators/          ← Shared Zod validators
├── prisma/
│   ├── schema.prisma        ← Database schema
│   ├── migrations/          ← Database migration files
│   └── seed.ts              ← Database seed script
└── node_modules/            ← Dependencies (npm workspaces hoisted)
```

### Nginx Reverse Proxy

All three apps are behind Nginx reverse proxies with Let's Encrypt SSL.

| Domain | Nginx Config File | Upstream Port | App |
|--------|-------------------|---------------|-----|
| `api.tradelinkpro.net` | `/etc/nginx/sites-enabled/tradelink-api` | `127.0.0.1:4000` | Express API |
| `tradelinkpro.net` | `/etc/nginx/sites-enabled/tradelink-web` | `127.0.0.1:3004` | Next.js Web |
| `admin.tradelinkpro.net` | `/etc/nginx/sites-enabled/tradelink-admin` | `127.0.0.1:3005` | Next.js Admin |

#### Nginx Config Structure (API example)

```nginx
server {
    server_name api.tradelinkpro.net;
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # SSL managed by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/tradelinkpro.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tradelinkpro.net/privkey.pem;
}
```

#### Editing Nginx Config

```bash
# Edit a config
nano /etc/nginx/sites-enabled/tradelink-api

# Test syntax
nginx -t

# Reload (no downtime)
systemctl reload nginx
```

### PM2 Process Manager

All apps run as PM2 processes. PM2 auto-restarts crashed apps.

| PM2 Name | App | Port | Start Command |
|----------|-----|------|---------------|
| `tradelink-api` | Express API | 4000 | `pm2 start dist/index.js --name tradelink-api --cwd /var/www/tradelink/apps/api` |
| `tradelink-web` | Next.js Web | 3004 | `pm2 start npm --name tradelink-web -- start --cwd /var/www/tradelink/apps/web` |
| `tradelink-admin` | Next.js Admin | 3005 | `pm2 start npm --name tradelink-admin -- start --cwd /var/www/tradelink/apps/admin` |

#### Common PM2 Commands

```bash
pm2 list                            # View all processes
pm2 logs tradelink-api --lines 50   # View recent logs
pm2 restart tradelink-api           # Restart
pm2 stop tradelink-api              # Stop
pm2 delete tradelink-api            # Remove process
pm2 save                            # Save process list for auto-start on reboot
pm2 startup                         # Enable auto-start on system boot
```

### SSL Certificates

SSL is managed by **Certbot** (Let's Encrypt). Certificates are stored at:

```
/etc/letsencrypt/live/tradelinkpro.net/fullchain.pem
/etc/letsencrypt/live/tradelinkpro.net/privkey.pem
```

Certbot auto-renews via a systemd timer. To manually renew:

```bash
certbot renew --dry-run     # Test
certbot renew               # Actual renewal
```

### Database (PostgreSQL)

PostgreSQL runs locally on the VPS.

```bash
# Connect to database
psql -U tradelink_user -d tradelink_db

# Run migrations (from project root)
cd /var/www/tradelink
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

### Redis

Redis is used for Bull job queues and caching.

```bash
# Test Redis
redis-cli ping     # Should return PONG
redis-cli info     # Server info
```

### Other Services on This VPS

> **IMPORTANT**: This VPS hosts multiple projects. Do NOT kill processes on ports you don't recognize.

| Port | Service |
|------|---------|
| 4000 | Tradelink API |
| 3004 | Tradelink Web |
| 3005 | Tradelink Admin |
| 5000 | VehicleTracking.Api.dll (.NET) — **DO NOT TOUCH** |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 80/443 | Nginx |

---

## 2. Git & Source Control

### Repository

| Item | Value |
|------|-------|
| **GitHub URL** | `https://github.com/rufait77/tradelink` |
| **Branch** | `main` (single branch workflow) |
| **Username** | `rufait77` |
| **PAT Token** | `<YOUR_PAT_TOKEN>` |

### Git Remote URL (with PAT for HTTPS auth)

```bash
# If you need to set the remote with auth:
git remote set-url origin https://rufait77:<YOUR_PAT_TOKEN>@github.com/rufait77/tradelink.git
```

### Common Git Workflow

```bash
# Local development
git add -A
git commit -m "description of changes"
git push origin main

# On VPS (pull latest)
cd /var/www/tradelink
git pull origin main
```

### .gitignore (Key Exclusions)

```
node_modules/
dist/
.next/
.env
uploads/
*.log
```

---

## 3. Project Architecture

### Monorepo Structure

Tradelink is a **npm workspaces + Turborepo** monorepo with 3 apps and 2 shared packages.

```
tradelink/
├── apps/
│   ├── api/           @tradelink/api      — Express.js REST API (Port 4000)
│   ├── web/           @tradelink/web      — Next.js 14 contractor/client web app (Port 3004)
│   └── admin/         @tradelink/admin    — Next.js 14 admin dashboard (Port 3005)
├── packages/
│   ├── types/         @tradelink/types    — Shared TypeScript interfaces & types
│   └── validators/    @tradelink/validators — Shared Zod validation schemas
├── prisma/                                 — Database schema + migrations + seed
├── turbo.json                              — Turborepo pipeline config
├── tsconfig.base.json                      — Shared TypeScript config
└── package.json                            — Root workspace config
```

### Business Concept

**Tradelink** is a platform for trade contractors (plumbers, electricians, roofers, etc.) to:

1. **Refer jobs to each other** — A contractor who can't take a job refers it to another and earns a commission (20% default)
2. **Get paid securely** — Clients pay into escrow, funds release after job completion
3. **Build reputation** — Star ratings, reviews, verified badges
4. **Subscribe for access** — Monthly subscription to post/accept jobs

#### User Flows

- **Contractor signs up** → Email verification → Subscription payment → Onboarding (trade selection, bio, photo) → Dashboard
- **Post a job** → Other contractors express interest → Select a contractor → Client pays into escrow → Contractor completes work → Mark done → Client confirms → Escrow releases → Commission paid to referrer
- **Client portal** — Clients receive a magic link to view job, approve quote, pay, confirm completion, rate, and dispute

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Express.js + TypeScript |
| **Auth** | JWT (access + refresh tokens) + bcrypt passwords |
| **Database** | PostgreSQL via Prisma ORM |
| **Queue** | Bull + Redis (commission processing) |
| **Cron** | node-cron (5 scheduled jobs) |
| **Payments** | Stripe (Checkout, Connect, Webhooks) |
| **Email** | Resend (transactional emails) |
| **File Uploads** | Multer + Sharp (image compression) |
| **Web App** | Next.js 14 (App Router) + Tailwind CSS + Radix UI |
| **Admin Panel** | Next.js 14 + TanStack Table + Recharts |
| **State** | Zustand (client-side) |
| **Forms** | React Hook Form + Zod |
| **Animations** | Framer Motion |
| **Process Manager** | PM2 |
| **Reverse Proxy** | Nginx + Certbot SSL |

### Dependencies (API)

| Package | Purpose |
|---------|---------|
| `express` | HTTP framework |
| `@prisma/client` | Database ORM |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT auth tokens |
| `stripe` | Payment processing |
| `resend` | Transactional emails |
| `bull` + `ioredis` | Job queue + Redis client |
| `multer` | File upload handling |
| `sharp` | Image compression |
| `zod` | Runtime validation |
| `cors` | Cross-origin resource sharing |
| `helmet` | Security headers |
| `compression` | Gzip response compression |
| `morgan` + `winston` | HTTP logging + app logging |
| `rate-limiter-flexible` | Rate limiting |
| `dotenv` | Environment variable loading |
| `date-fns` | Date manipulation |
| `cookie-parser` | Cookie parsing |

### Dependencies (Web)

| Package | Purpose |
|---------|---------|
| `next` (14.x) | React SSR framework |
| `react` (18.x) | UI library |
| `tailwindcss` | Utility-first CSS |
| `@radix-ui/*` | Accessible UI primitives (dialog, select, tabs, toast, etc.) |
| `@stripe/react-stripe-js` | Stripe Elements for payment forms |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `zustand` | State management |
| `react-hook-form` + `zod` | Form handling + validation |
| `axios` | HTTP client |
| `recharts` | Charts (dashboard analytics) |
| `sonner` | Toast notifications |
| `react-dropzone` | Drag-and-drop file uploads |
| `date-fns` | Date formatting |

### Dependencies (Admin)

Same as Web, plus:

| Package | Purpose |
|---------|---------|
| `@tanstack/react-table` | Advanced data tables |
| `react-quill` | Rich text editor |

---

## 4. Database Schema

PostgreSQL database managed by Prisma ORM. All models mapped to snake_case table names.

### Models (14 total)

| Model | Table Name | Description |
|-------|------------|-------------|
| `User` | `users` | All users (contractors + admins), auth, profile |
| `ContractorProfile` | `contractor_profiles` | Extended contractor info (trades, bio, rating, verification, strikes, bans) |
| `Subscription` | `subscriptions` | Stripe subscription status, billing cycle |
| `Job` | `jobs` | Job listings with status workflow |
| `InterestExpression` | `interest_expressions` | Contractor interest/bids on jobs |
| `ClientPortal` | `client_portals` | Magic-link access for clients |
| `Quote` | `quotes` | Contractor quotes with line items |
| `Escrow` | `escrows` | Payment escrow (hold → release/refund) |
| `Commission` | `commissions` | Referral commissions (20% default) |
| `Dispute` | `disputes` | Client/contractor disputes |
| `Review` | `reviews` | Star ratings + text reviews with dimensions |
| `Notification` | `notifications` | In-app notification system |
| `PlatformSetting` | `platform_settings` | Configurable settings (fees, dev mode, etc.) |
| `AuditLog` | `audit_logs` | Admin action audit trail |

### Key Enums

| Enum | Values |
|------|--------|
| `UserRole` | `contractor`, `admin` |
| `TradeType` | Landscaping, Roofing, HVAC, Plumbing, Electrical, Painting, Carpentry, Flooring, Masonry, Cleaning, GeneralContracting, Demolition, WindowDoor, Insulation, Waterproofing, Foundation, Drywall, Concrete, Fencing, SolarPanel, Welding, TreeService, PestControl, Other |
| `JobStatus` | Open, Claimed, QuoteSent, QuoteAccepted, InProgress, ContractorDone, ClientConfirmed, Completed, Disputed, Cancelled |
| `SubscriptionStatus` | active, past_due, canceled, trialing |
| `EscrowStatus` | held, released, refunded, partial_refund |
| `NotificationType` | job_update, payment, message, review_received, system, dispute, subscription |

### Job Status Workflow

```
Open → Claimed → QuoteSent → QuoteAccepted → InProgress → ContractorDone → ClientConfirmed → Completed
                                                           ↓
                                                        Disputed
```

---

## 5. API Routes & Services

### Route Files (14 files)

| Route File | Prefix | Auth | Purpose |
|------------|--------|------|---------|
| `auth.ts` | `/auth` | Public | Login, signup, refresh, verify email, forgot/reset password |
| `jobs.ts` | `/jobs` | `requireAuth` + `subscriptionGate` | CRUD jobs, express interest, claim, status transitions |
| `contractors.ts` | `/contractors` | Mixed | List contractors, public profiles |
| `messages.ts` | `/messages` | `requireAuth` | In-job messaging |
| `notifications.ts` | `/notifications` | `requireAuth` | Get/mark-read notifications |
| `payments.ts` | `/payments` | `requireAuth` | Create Stripe checkout, subscription portal, Connect onboarding |
| `escrow.ts` | `/escrow` | `requireAuth` | Create/release/refund escrow |
| `quotes.ts` | `/quotes` | `requireAuth` | Submit/update quotes |
| `reviews.ts` | `/reviews` | `requireAuth` | Submit review, get my review for a job |
| `commissions.ts` | `/commissions` | `requireAuth` | View earned commissions |
| `client.ts` | `/client` | Token-based | Client portal (magic link access) |
| `settings.ts` | `/settings` | Mixed | Platform settings, dev mode toggle |
| `webhooks.ts` | `/webhooks` | Stripe signature | Stripe webhook handler |
| `admin.ts` | `/admin` | `requireAdmin` | Admin login, users, disputes, settings, verification, penalties |

### Admin Sub-Routes (`/admin/...`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/auth/login` | POST | Admin login → returns admin JWT |
| `/admin/dashboard/stats` | GET | Dashboard statistics |
| `/admin/users` | GET | List all users (paginated, filterable) |
| `/admin/users/:id` | GET | User detail with profile, subscription, jobs |
| `/admin/users/:id/verify` | PUT | Toggle contractor verification badge |
| `/admin/users/:id/toggle-active` | PUT | Activate/deactivate user |
| `/admin/users/:id/strike` | POST | Add strike (auto-escalation: 1=warn, 2=suspend, 3=ban) |
| `/admin/users/:id/ban` | PUT | Directly ban/unban a user |
| `/admin/disputes` | GET | List all disputes |
| `/admin/disputes/:id` | GET | Dispute detail with job, quotes, messages |
| `/admin/disputes/:id/resolve` | PUT | Resolve dispute with resolution text |
| `/admin/settings` | GET/PUT | View/update platform settings |

### Services (3 files)

| Service | Purpose |
|---------|---------|
| `email.service.ts` | Transactional emails via Resend (verification, password reset, job updates, payment confirmations) |
| `settings.service.ts` | Read/write platform settings, `isDeveloperMode()` check |
| `penalty.service.ts` | Strike management with auto-escalation (warn → suspend → ban) |

### Cron Jobs (5 scheduled tasks in `cron.ts`)

| Schedule | Job | Purpose |
|----------|-----|---------|
| Daily 2 AM | Subscription Expiry Check | Deactivate expired subscriptions |
| Every 6 hours | Ghost Job Detection | Flag jobs with no activity for 14+ days |
| Daily 3 AM | Subscription Renewal Sync | Sync Stripe subscription statuses |
| Every 4 hours | Interest Window Closer | Close expired interest windows |
| Every 12 hours | Auto-Release Escrow | Release escrow for `ContractorDone` jobs after 5 days with no client response |

### Middleware Stack

| Middleware | Purpose |
|------------|---------|
| `requireAuth` | Validates JWT, attaches `req.user` |
| `requireAdmin` | Validates admin JWT |
| `subscriptionGate` | Blocks banned/suspended users and users without active subscription (bypasses in dev mode) |
| `validate(schema)` | Zod request body validation |
| `errorHandler` | Global error handler with `AppError` class |
| `rateLimiter` | Rate limiting (configurable per route) |
| `upload` | Multer file upload with Sharp compression |

---

## 6. Frontend Pages

### Web App (`tradelinkpro.net`)

| Route | Page | Auth? |
|-------|------|-------|
| `/` | Landing page (hero, features, testimonials, CTA) | No |
| `/login` | Login form | No |
| `/signup` | Registration form | No |
| `/signup/payment` | Stripe subscription payment | No |
| `/verify-email` | Email verification screen | No |
| `/forgot-password` | Password reset request | No |
| `/reset-password` | Password reset form (with token) | No |
| `/onboarding` | Contractor onboarding (trades, bio, photo) | Yes |
| `/pricing` | Subscription pricing page | No |
| `/how-it-works` | How it works page | No |
| `/contact` | Contact page | No |
| `/terms` | Terms of service | No |
| `/privacy` | Privacy policy | No |
| `/contractors/[id]` | Public contractor profile (reviews, rating, verified badge) | No |
| `/client/[token]` | Client portal (quote, pay, confirm, dispute, rate) | Token |
| `/dashboard` | Contractor dashboard (stats, charts, recent activity) | Yes |
| `/dashboard/jobs` | Browse/search available jobs | Yes |
| `/dashboard/jobs/[id]` | Job detail (messaging, status actions, rating prompt) | Yes |
| `/dashboard/my-jobs` | Jobs I posted or claimed | Yes |
| `/dashboard/post-job` | Post a new job | Yes |
| `/dashboard/messages` | Message inbox | Yes |
| `/dashboard/earnings` | Earnings & commission tracking | Yes |
| `/dashboard/my-referrals` | Referral tracking | Yes |
| `/dashboard/profile` | Edit profile, upload documents | Yes |
| `/dashboard/settings` | Account settings | Yes |
| `/dashboard/billing` | Subscription & billing management | Yes |
| `/dashboard/notifications` | Notification center | Yes |

### Admin Panel (`admin.tradelinkpro.net`)

| Route | Page |
|-------|------|
| `/login` | Admin login |
| `/dashboard` | Admin dashboard (stats, charts) |
| `/dashboard/users` | User management (list, search, filter) → click row for detail |
| `/dashboard/users/[id]` | User detail (verification, strikes, ban, documents) |
| `/dashboard/disputes` | Dispute management (list, filter by status) |
| `/dashboard/disputes/[id]` | Dispute detail (resolve, view job, messages) |
| `/dashboard/settings` | Platform settings (fees, dev mode toggle) |

---

## 7. Environment Variables

### API `.env` (Production)

```bash
# ─── Database ────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://tradelink_user:<password>@localhost:5432/tradelink_db"
REDIS_URL="redis://:<password>@localhost:6379"

# ─── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET="<64+ char random string>"
JWT_REFRESH_SECRET="<64+ char random string>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
ADMIN_JWT_SECRET="<64+ char random string>"

# ─── Stripe ──────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."         # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY="pk_test_..."    # or pk_live_...
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_CLIENT_ID="ca_..."

# ─── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="Tradelink <noreply@tradelink.rufaitlabs.cloud>"

# ─── App URLs ────────────────────────────────────────────────────────────────
API_URL="https://api.tradelinkpro.net"
WEB_URL="https://tradelinkpro.net"
ADMIN_URL="https://admin.tradelinkpro.net"

# ─── File Uploads ────────────────────────────────────────────────────────────
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB="5"

# ─── App ─────────────────────────────────────────────────────────────────────
NODE_ENV="production"
PORT="4000"
```

### Web App Environment Variables

The web app reads `NEXT_PUBLIC_API_URL` from its `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://api.tradelinkpro.net
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Admin Panel Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.tradelinkpro.net
```

---

## 8. Local Development Setup

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0
- **PostgreSQL** (local or Docker)
- **Redis** (local or Docker)

### Step-by-Step Setup

```bash
# 1. Clone the repo
git clone https://rufait77:<YOUR_PAT_TOKEN>@github.com/rufait77/tradelink.git
cd tradelink

# 2. Install all dependencies (workspaces auto-resolve)
npm install

# 3. Set up the API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your local PostgreSQL/Redis credentials and Stripe keys

# 4. Set up the web environment
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > apps/web/.env.local
echo 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...' >> apps/web/.env.local

# 5. Set up the admin environment
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > apps/admin/.env.local

# 6. Generate Prisma client
npx prisma generate

# 7. Run database migrations
npx prisma migrate dev

# 8. Seed the database (platform settings)
cd apps/api && npx tsx prisma/seed.ts && cd ../..

# 9. Start all apps in development mode
npm run dev
```

This starts:
- API at `http://localhost:4000`
- Web at `http://localhost:3004`
- Admin at `http://localhost:3001`

### Individual App Commands

```bash
# API only
cd apps/api && npm run dev

# Web only
cd apps/web && npm run dev

# Admin only
cd apps/admin && npm run dev

# Build everything
npm run build

# Type-check everything
npm run type-check
```

---

## 9. Production Deployment

### Full Deployment Process

```bash
# On your local machine:
git add -A
git commit -m "description"
git push origin main

# SSH into VPS:
ssh root@72.62.243.117

# Pull latest code:
cd /var/www/tradelink
git pull origin main

# Regenerate Prisma client (if schema changed):
npx prisma generate

# Run migrations (if schema changed):
npx prisma migrate deploy

# Build and restart API:
cd apps/api
npm run build
pm2 restart tradelink-api

# Build and restart Web (if frontend changes):
cd ../web
npm run build
pm2 restart tradelink-web

# Build and restart Admin (if admin changes):
cd ../admin
npm run build
pm2 restart tradelink-admin

# Save PM2 state:
pm2 save
```

### Quick API-Only Deploy (Most Common)

```bash
ssh root@72.62.243.117
cd /var/www/tradelink && git pull origin main
cd apps/api && npm run build
pm2 restart tradelink-api
```

### If API Won't Start (Troubleshooting)

```bash
# Check logs
pm2 logs tradelink-api --lines 50

# Kill port manually
fuser -k 4000/tcp

# Delete and recreate PM2 process
pm2 delete tradelink-api
pm2 start dist/index.js --name tradelink-api --cwd /var/www/tradelink/apps/api
pm2 save
```

### Verify Deployment

```bash
# Health check (from VPS)
curl http://localhost:4000/health

# Health check (external)
curl https://api.tradelinkpro.net/health
```

---

## 10. Important Notes & Gotchas

### Port Conflicts

- **Port 5000 is used by VehicleTracking.Api.dll** (.NET app on same VPS). Do NOT change anything on port 5000.
- The API default port is **4000** (set in `apps/api/src/config/env.ts`). If you change `PORT` in `.env`, you MUST also update the Nginx config at `/etc/nginx/sites-enabled/tradelink-api`.

### Developer Mode

There's a platform setting called `developer_mode` in the database. When ON:
- Stripe payments are skipped (signup fee, subscription checks)
- SubscriptionGate middleware is bypassed
- All users can access all features without paying

Toggle via admin panel (`/dashboard/settings`) or directly in DB:

```sql
UPDATE platform_settings SET value = 'true' WHERE key = 'developer_mode';
```

### Stripe Configuration

- **Webhook URL**: `https://api.tradelinkpro.net/webhooks/stripe`
- **Events to listen for**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Connect**: Contractors onboard via Stripe Connect Express for direct payouts

### Email

- Uses **Resend** API for all transactional emails
- Sender: `noreply@tradelink.rufaitlabs.cloud`
- Email templates are in `apps/api/src/services/email.service.ts`
- Emails currently go to spam — need to configure proper DKIM/SPF records on `tradelink.rufaitlabs.cloud`

### Admin User

There is no admin user in the seed file. To create one:

```sql
-- First, register normally via the web app, then promote to admin:
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

Or create directly with a bcrypt-hashed password:

```bash
# Generate a bcrypt hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword123!', 12).then(h => console.log(h))"
```

```sql
INSERT INTO users (id, name, email, password_hash, role, is_active, is_verified)
VALUES (gen_random_uuid(), 'Admin Name', 'admin@tradelink.com', '<bcrypt_hash>', 'admin', true, true);
```

### File Uploads

- Stored in `apps/api/uploads/` on VPS
- Max file size: 5MB (configurable via `MAX_FILE_SIZE_MB`)
- Images are auto-compressed via Sharp
- Upload directory is `.gitignore`'d — not in the repo

### Database Backups

No automated backups are configured. To manually backup:

```bash
pg_dump -U tradelink_user tradelink_db > /root/backups/tradelink_$(date +%Y%m%d).sql
```

### Monorepo Package References

Shared packages are referenced via `"*"` version in each app's `package.json`:

```json
"@tradelink/types": "*",
"@tradelink/validators": "*"
```

Changes to `packages/types/` or `packages/validators/` are automatically picked up by all apps in the monorepo.

### Build Order

When building from scratch, the order matters:

1. `npm install` (root — installs everything)
2. `npx prisma generate` (generates Prisma client)
3. Packages build automatically (TypeScript, consumed directly)
4. `cd apps/api && npm run build` (compiles to `dist/`)
5. `cd apps/web && npm run build` (builds Next.js to `.next/`)
6. `cd apps/admin && npm run build` (builds Next.js to `.next/`)
