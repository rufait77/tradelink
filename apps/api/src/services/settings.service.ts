import { prisma } from '../config/prisma';
import { PlatformSettings } from '@tradelink/types';

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
    signupFee: parseFloat(map['signup_fee'] ?? '29.99'),
    subscriptionFee: parseFloat(map['subscription_fee'] ?? '9.99'),
    platformFeePct: parseFloat(map['platform_fee_pct'] ?? '5'),
    commissionPct: parseFloat(map['commission_pct'] ?? '20'),
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
