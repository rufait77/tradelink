import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ─── Platform Settings ──────────────────────────────────────────────────────
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
      key: 'developer_mode',
      value: 'false',
      description:
        'When true, skips ALL payment requirements for contractors and customers — for testing only',
    },
    {
      key: 'admin_notification_email',
      value: '',
      description: 'Email address that receives admin event notifications (signups, payments, disputes)',
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

  // ─── Admin User ─────────────────────────────────────────────────────────────
  console.log('\n🔑 Seeding admin user...');

  const adminPasswordHash = await bcrypt.hash('#VincentTradelink', 12);

  await prisma.user.upsert({
    where: { email: 'vincent@tradelink.admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'admin',
      isVerified: true,
      isActive: true,
    },
    create: {
      name: 'Vincent',
      email: 'vincent@tradelink.admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isVerified: true,
      isActive: true,
    },
  });

  console.log('  ✓ Admin user: vincent (email: vincent@tradelink.admin)');
  console.log('  ✓ Password: #VincentTradelink');

  // ─── Test Contractors ───────────────────────────────────────────────────────
  console.log('\n👷 Seeding test contractor accounts...');

  const testPassword = await bcrypt.hash('Test@1234', 12);

  // 1. Fully onboarded contractor
  const contractor1 = await prisma.user.upsert({
    where: { email: 'john@test.com' },
    update: { passwordHash: testPassword, isVerified: true, isActive: true },
    create: {
      name: 'John Smith',
      email: 'john@test.com',
      passwordHash: testPassword,
      role: 'contractor',
      isVerified: true,
      isActive: true,
    },
  });

  await prisma.contractorProfile.upsert({
    where: { userId: contractor1.id },
    update: {},
    create: {
      userId: contractor1.id,
      tradeTypes: ['Plumbing', 'HVAC'],
      bio: 'Licensed plumber and HVAC tech with 12 years of experience in the greater Austin area.',
      licenseNumber: 'TX-PLU-12345',
      streetAddress: '123 Oak Street',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      yearsExperience: 12,
      onboardingComplete: true,
    },
  });

  console.log('  ✓ Contractor: John Smith (john@test.com) — fully onboarded, Plumbing + HVAC');

  // 2. New contractor (not yet onboarded)
  await prisma.user.upsert({
    where: { email: 'sarah@test.com' },
    update: { passwordHash: testPassword, isVerified: true, isActive: true },
    create: {
      name: 'Sarah Johnson',
      email: 'sarah@test.com',
      passwordHash: testPassword,
      role: 'contractor',
      isVerified: true,
      isActive: true,
    },
  });

  console.log('  ✓ Contractor: Sarah Johnson (sarah@test.com) — not onboarded, will see onboarding flow');

  // 3. Active contractor with different trades
  const contractor3 = await prisma.user.upsert({
    where: { email: 'mike@test.com' },
    update: { passwordHash: testPassword, isVerified: true, isActive: true },
    create: {
      name: 'Mike Williams',
      email: 'mike@test.com',
      passwordHash: testPassword,
      role: 'contractor',
      isVerified: true,
      isActive: true,
    },
  });

  await prisma.contractorProfile.upsert({
    where: { userId: contractor3.id },
    update: {},
    create: {
      userId: contractor3.id,
      tradeTypes: ['Barber', 'Cosmetology'],
      bio: 'Professional barber and cosmetologist serving the Miami area for 8 years.',
      licenseNumber: 'FL-COS-67890',
      streetAddress: '456 Palm Ave',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      yearsExperience: 8,
      onboardingComplete: true,
    },
  });

  console.log('  ✓ Contractor: Mike Williams (mike@test.com) — fully onboarded, Barber + Cosmetology');
  console.log('\n  📋 All test passwords: Test@1234');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
