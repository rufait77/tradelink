import { PlatformSetting } from '@prisma/client';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding platform settings...');

  const settings: { key: string; value: string; description: string }[] = [
    {
      key: 'signup_fee',
      value: '29.99',
      description: 'One-time signup fee charged to new contractors (USD)',
    },
    {
      key: 'subscription_fee',
      value: '9.99',
      description: 'Monthly subscription fee (USD)',
    },
    {
      key: 'platform_fee_pct',
      value: '5',
      description: 'Platform fee percentage deducted from job payment',
    },
    {
      key: 'commission_pct',
      value: '20',
      description: 'Referral commission percentage paid to the referring contractor',
    },
    {
      key: 'min_job_budget',
      value: '100',
      description: 'Minimum allowed job budget (USD)',
    },
    {
      key: 'max_job_budget',
      value: '100000',
      description: 'Maximum allowed job budget (USD)',
    },
    {
      key: 'job_expiry_days',
      value: '30',
      description: 'Number of days before an unclaimed job is automatically expired',
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Show maintenance page to contractors when true',
    },
    {
      key: 'featured_trade_categories',
      value: JSON.stringify(['Landscaping', 'Roofing', 'HVAC', 'Plumbing', 'Electrical']),
      description: 'Ordered list of featured trade categories shown on landing page',
    },
  ];

  for (const setting of settings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
    console.log(`  ✓ ${setting.key} = ${setting.value}`);
  }

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
