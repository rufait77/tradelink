import { prisma } from '../config/prisma';
import { PlatformSettings, UserRole } from '@tradelink/types';

// ─── Defaults (mirrors prisma/seed.ts) ────────────────────────────────────────

const DEFAULT_SIGNUP_FEE = '29.99';
const DEFAULT_COMMISSION_PCT = '20';
const DEFAULT_REFERRER_SIGNUP_FEE = '10.00';
const DEFAULT_REFERRER_COMMISSION_PCT = '5';

// ─── Get a single setting value ────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.platformSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

// ─── Get all settings as a typed object ───────────────────────────────────────

export async function getAllSettings(): Promise<PlatformSettings> {
  const rows = await prisma.platformSetting.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  return {
    signupFee: parseFloat(map['signup_fee'] ?? DEFAULT_SIGNUP_FEE),
    subscriptionFee: parseFloat(map['subscription_fee'] ?? '9.99'),
    platformFeePct: parseFloat(map['platform_fee_pct'] ?? '5'),
    commissionPct: parseFloat(map['commission_pct'] ?? DEFAULT_COMMISSION_PCT),
    referrerSignupFee: parseFloat(map['referrer_signup_fee'] ?? DEFAULT_REFERRER_SIGNUP_FEE),
    referrerCommissionPct: parseFloat(map['referrer_commission_pct'] ?? DEFAULT_REFERRER_COMMISSION_PCT),
    referrerRequiresSubscription: map['referrer_requires_subscription'] === 'true',
    minJobBudget: parseFloat(map['min_job_budget'] ?? '100'),
    maxJobBudget: parseFloat(map['max_job_budget'] ?? '100000'),
    jobExpiryDays: parseInt(map['job_expiry_days'] ?? '30', 10),
    maintenanceMode: map['maintenance_mode'] === 'true',
    featuredTradeCategories: JSON.parse(map['featured_trade_categories'] ?? '[]'),
  };
}

// ─── Developer mode check ─────────────────────────────────────────────────────

export async function isDeveloperMode(): Promise<boolean> {
  const val = await getSetting('developer_mode');
  return val === 'true';
}

// ─── Role-aware fee helpers ───────────────────────────────────────────────────

/** One-time signup fee (USD) for the given role. Referrers pay `referrer_signup_fee`. */
export async function getSignupFeeForRole(role: UserRole): Promise<number> {
  if (role === 'referrer') {
    const val = await getSetting('referrer_signup_fee');
    return parseFloat(val ?? DEFAULT_REFERRER_SIGNUP_FEE);
  }
  const val = await getSetting('signup_fee');
  return parseFloat(val ?? DEFAULT_SIGNUP_FEE);
}

/** Commission % to snapshot for a job, based on the poster's role. */
export async function getCommissionPctForRole(role: UserRole): Promise<number> {
  if (role === 'referrer') {
    const val = await getSetting('referrer_commission_pct');
    return parseFloat(val ?? DEFAULT_REFERRER_COMMISSION_PCT);
  }
  const val = await getSetting('commission_pct');
  return parseFloat(val ?? DEFAULT_COMMISSION_PCT);
}

/** Commission % for a job, looked up via the poster's role. Falls back to the contractor rate. */
export async function getCommissionPctForPoster(posterId: string): Promise<number> {
  const poster = await prisma.user.findUnique({ where: { id: posterId }, select: { role: true } });
  return getCommissionPctForRole((poster?.role ?? 'contractor') as UserRole);
}

/** Whether referrers must hold an active subscription (business switch, default false). */
export async function referrerRequiresSubscription(): Promise<boolean> {
  const val = await getSetting('referrer_requires_subscription');
  return val === 'true';
}

// ─── Update settings (admin) ──────────────────────────────────────────────────

export async function updateSettings(
  updates: Record<string, string>,
  adminId: string
): Promise<void> {
  await prisma.$transaction(
    Object.entries(updates).map(([key, value]) =>
      prisma.platformSetting.upsert({
        where: { key },
        update: { value, updatedById: adminId },
        create: { key, value, updatedById: adminId },
      })
    )
  );
}
