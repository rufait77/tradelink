// ─── Mock dashboard data (pure front-end, no API) ─────────────────────────────
// Every display string is a translation key resolved at render time, so the demo
// follows the visitor's language exactly like the rest of the site. Personal
// names, email addresses and dollar amounts stay as-is in both languages.

import type { TranslateFn, TranslationKey } from '../../i18n';

export type MockRole = 'contractor' | 'referrer';

export type MockStat = { label: string; value: string; tone: 'emerald' | 'amber' | 'blue' };
export type MockJob = { title: string; trade: string; status: string; statusClass: string; amount: string; when: string };
export type MockNotification = { title: string; body: string; when: string; unread: boolean };
export type MockEarningsPoint = { month: string; earned: number };
export type MockPipelineStep = { label: string; done: boolean; current?: boolean };

// Names and emails are sample personas, not copy — they are not translated.
export const MOCK_IDENTITIES = {
  contractor: { name: 'Marcus Reed', email: 'marcus@reedplumbing.com' },
  referrer: { name: 'Dana Whitfield', email: 'dana.whitfield@gmail.com' },
} as const;

const MONTH_KEYS: TranslationKey[] = [
  'mockData.month.apr',
  'mockData.month.may',
  'mockData.month.jun',
  'mockData.month.jul',
  'mockData.month.aug',
  'mockData.month.sep',
];

// Relative-time labels next to jobs and notifications, built from the shared
// time keys so they read naturally in both languages.
function when(t: TranslateFn, unit: 'h' | 'd', count: number): string {
  return unit === 'h' ? t('time.hoursAgo', { count }) : t('time.daysAgo', { count });
}

/** Compact form used in the notification list, where space is tight. */
function whenShort(t: TranslateFn, unit: 'h' | 'd', count: number): string {
  return unit === 'h' ? t('time.hoursShort', { count }) : t('time.daysShort', { count });
}

const STATUS_CLASS = {
  completed: 'status-completed',
  escrowFunded: 'status-inprogress',
  quoteSent: 'status-inprogress',
  open: 'status-open',
  inProgress: 'status-inprogress',
  assigned: 'status-claimed',
} as const;

// ─── Contractor persona ───────────────────────────────────────────────────────

function contractorStats(t: TranslateFn): MockStat[] {
  return [
    { label: t('mockData.stat.totalEarned'), value: '$4,820', tone: 'emerald' },
    { label: t('mockData.stat.pending'), value: '$640', tone: 'amber' },
    { label: t('mockData.stat.thisMonth'), value: '$1,180', tone: 'blue' },
    { label: t('mockData.stat.profileRating'), value: '4.9 ★', tone: 'amber' },
  ];
}

function contractorJobs(t: TranslateFn): MockJob[] {
  return [
    { title: t('mockData.job.waterHeater'), trade: t('trade.Plumbing'), status: t('status.EscrowFunded'), statusClass: STATUS_CLASS.escrowFunded, amount: '$2,400', when: when(t, 'h', 2) },
    { title: t('mockData.job.roofInspection'), trade: t('trade.Roofing'), status: t('status.QuoteSent'), statusClass: STATUS_CLASS.quoteSent, amount: '$3,150', when: when(t, 'h', 5) },
    { title: t('mockData.job.miniSplit'), trade: t('trade.HVAC'), status: t('status.Completed'), statusClass: STATUS_CLASS.completed, amount: '$4,800', when: when(t, 'd', 1) },
    { title: t('mockData.job.exteriorRepaint'), trade: t('trade.Painting'), status: t('status.Open'), statusClass: STATUS_CLASS.open, amount: '$1,900', when: when(t, 'd', 2) },
  ];
}

function contractorNotifications(t: TranslateFn): MockNotification[] {
  return [
    { title: t('mockData.notif.escrowPaid.title'), body: t('mockData.notif.escrowPaid.body'), when: whenShort(t, 'h', 2), unread: true },
    { title: t('mockData.notif.commissionPaid.title'), body: t('mockData.notif.commissionPaid.bodyContractor'), when: whenShort(t, 'd', 1), unread: true },
    { title: t('mockData.notif.newInterest.title'), body: t('mockData.notif.newInterest.body'), when: whenShort(t, 'd', 2), unread: false },
    { title: t('mockData.notif.review.title'), body: t('mockData.notif.review.body'), when: whenShort(t, 'd', 3), unread: false },
  ];
}

const CONTRACTOR_EARNINGS_VALUES = [420, 690, 560, 980, 1010, 1180];

// ─── Referrer persona ─────────────────────────────────────────────────────────

function referrerStats(t: TranslateFn): MockStat[] {
  return [
    { label: t('mockData.stat.totalEarned'), value: '$310', tone: 'emerald' },
    { label: t('mockData.stat.pending'), value: '$85', tone: 'amber' },
    { label: t('mockData.stat.referralsPosted'), value: '7', tone: 'blue' },
    // Sample value; the live rate is shown in the section caption.
    { label: t('mockData.stat.commissionRate'), value: '5%', tone: 'amber' },
  ];
}

function referrerJobs(t: TranslateFn): MockJob[] {
  return [
    { title: t('mockData.job.gutter'), trade: t('trade.Roofing'), status: t('status.Assigned'), statusClass: STATUS_CLASS.assigned, amount: '$1,700', when: when(t, 'h', 3) },
    { title: t('mockData.job.drainage'), trade: t('trade.Landscaping'), status: t('status.InProgress'), statusClass: STATUS_CLASS.inProgress, amount: '$2,200', when: when(t, 'd', 1) },
    { title: t('mockData.job.panelUpgrade'), trade: t('trade.Electrical'), status: t('status.Completed'), statusClass: STATUS_CLASS.completed, amount: '$2,900', when: when(t, 'd', 4) },
    { title: t('mockData.job.faucet'), trade: t('trade.Plumbing'), status: t('status.Open'), statusClass: STATUS_CLASS.open, amount: '$450', when: when(t, 'd', 5) },
  ];
}

function referrerNotifications(t: TranslateFn): MockNotification[] {
  return [
    { title: t('mockData.notif.assigned.title'), body: t('mockData.notif.assigned.body'), when: whenShort(t, 'h', 3), unread: true },
    { title: t('mockData.notif.commissionPaid.title'), body: t('mockData.notif.commissionPaid.bodyReferrer'), when: whenShort(t, 'd', 4), unread: true },
    { title: t('mockData.notif.quoteApproved.title'), body: t('mockData.notif.quoteApproved.body'), when: whenShort(t, 'd', 1), unread: false },
    { title: t('mockData.notif.interest.title'), body: t('mockData.notif.interest.body'), when: whenShort(t, 'd', 5), unread: false },
  ];
}

const REFERRER_EARNINGS_VALUES = [0, 45, 60, 35, 110, 145];

// ─── Shared: job pipeline preview ─────────────────────────────────────────────

export function getMockPipeline(t: TranslateFn): MockPipelineStep[] {
  return [
    { label: t('mockData.pipeline.posted'), done: true },
    { label: t('mockData.pipeline.assigned'), done: true },
    { label: t('mockData.pipeline.quoteApproved'), done: true },
    { label: t('mockData.pipeline.escrowFunded'), done: true, current: true },
    { label: t('mockData.pipeline.workDone'), done: false },
    { label: t('mockData.pipeline.paidOut'), done: false },
  ];
}

function earningsSeries(t: TranslateFn, values: number[]): MockEarningsPoint[] {
  return values.map((earned, i) => ({ month: t(MONTH_KEYS[i]), earned }));
}

export function getMockPersona(t: TranslateFn, role: MockRole) {
  if (role === 'referrer') {
    return {
      ...MOCK_IDENTITIES.referrer,
      stats: referrerStats(t),
      jobs: referrerJobs(t),
      earnings: earningsSeries(t, REFERRER_EARNINGS_VALUES),
      notifications: referrerNotifications(t),
    };
  }
  return {
    ...MOCK_IDENTITIES.contractor,
    stats: contractorStats(t),
    jobs: contractorJobs(t),
    earnings: earningsSeries(t, CONTRACTOR_EARNINGS_VALUES),
    notifications: contractorNotifications(t),
  };
}
