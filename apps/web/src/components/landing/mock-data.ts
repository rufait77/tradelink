// ─── Mock dashboard data (pure front-end, no API) ─────────────────────────────
// EVERY display string lives in MOCK_DATA_STRINGS below so Worker B can translate
// the whole demo in one pass. The persona arrays underneath only reference it.

export type MockRole = 'contractor' | 'referrer';

export type MockStat = { label: string; value: string; tone: 'emerald' | 'amber' | 'blue' };
export type MockJob = { title: string; trade: string; status: string; statusClass: string; amount: string; when: string };
export type MockNotification = { title: string; body: string; when: string; unread: boolean };
export type MockEarningsPoint = { month: string; earned: number };
export type MockPipelineStep = { label: string; done: boolean; current?: boolean };

export const MOCK_DATA_STRINGS = {
  userNames: { contractor: 'Marcus Reed', referrer: 'Dana Whitfield' },
  userEmails: { contractor: 'marcus@reedplumbing.com', referrer: 'dana.whitfield@gmail.com' },
  trades: {
    plumbing: 'Plumbing',
    hvac: 'HVAC',
    roofing: 'Roofing',
    electrical: 'Electrical',
    landscaping: 'Landscaping',
    painting: 'Painting',
  },
  statuses: {
    completed: 'Completed',
    escrowFunded: 'Escrow Funded',
    quoteSent: 'Quote Sent',
    open: 'Open',
    inProgress: 'In Progress',
    assigned: 'Assigned',
  },
  months: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
  // Relative-time labels shown next to jobs / notifications
  when: {
    h2: '2h ago', h3: '3h ago', h5: '5h ago',
    d1: '1d ago', d2: '2d ago', d4: '4d ago', d5: '5d ago',
    short: { h2: '2h', h3: '3h', d1: '1d', d2: '2d', d3: '3d', d4: '4d', d5: '5d' },
  },
  statLabels: {
    totalEarned: 'Total Earned',
    pending: 'Pending',
    thisMonth: 'This Month',
    profileRating: 'Profile Rating',
    referralsPosted: 'Referrals Posted',
    commissionRate: 'Commission Rate',
  },
  contractorJobs: {
    waterHeater: 'Water heater replacement — 2-story home',
    roofInspection: 'Full roof inspection + shingle repair',
    miniSplit: 'Mini-split install, garage conversion',
    exteriorRepaint: 'Exterior repaint — ranch style',
  },
  referrerJobs: {
    gutter: 'Neighbor needs gutter + downspout repair',
    drainage: 'Backyard drainage and sod',
    panelUpgrade: 'Panel upgrade for EV charger',
    faucet: 'Leaking kitchen faucet + disposal',
  },
  contractorNotifications: {
    escrowPaid: { title: 'Client paid into escrow', body: 'Water heater replacement is funded. You can start work.' },
    commissionPaid: { title: 'Commission paid', body: '$960 for "Mini-split install" hit your bank.' },
    newInterest: { title: 'New interest in your referral', body: '3 contractors are interested in "Exterior repaint".' },
    review: { title: 'Review received', body: 'Alicia P. left you 5 stars.' },
  },
  referrerNotifications: {
    assigned: { title: 'Contractor assigned', body: 'You picked Reed Plumbing for "Gutter repair".' },
    commissionPaid: { title: 'Commission paid', body: '$145 for "Panel upgrade" is on its way.' },
    quoteApproved: { title: 'Quote approved', body: 'Client approved the $2,200 drainage quote.' },
    interest: { title: 'Interest received', body: '2 contractors want "Kitchen faucet".' },
  },
  pipeline: {
    posted: 'Posted',
    assigned: 'Assigned',
    quoteApproved: 'Quote approved',
    escrowFunded: 'Escrow funded',
    workDone: 'Work done',
    paidOut: 'Paid out',
  },
} as const;

const S = MOCK_DATA_STRINGS;

const STATUS_CLASS = {
  completed: 'status-completed',
  escrowFunded: 'status-inprogress',
  quoteSent: 'status-inprogress',
  open: 'status-open',
  inProgress: 'status-inprogress',
  assigned: 'status-claimed',
} as const;

// ─── Contractor persona ───────────────────────────────────────────────────────

export const CONTRACTOR_STATS: MockStat[] = [
  { label: S.statLabels.totalEarned, value: '$4,820', tone: 'emerald' },
  { label: S.statLabels.pending, value: '$640', tone: 'amber' },
  { label: S.statLabels.thisMonth, value: '$1,180', tone: 'blue' },
  { label: S.statLabels.profileRating, value: '4.9 ★', tone: 'amber' },
];

export const CONTRACTOR_JOBS: MockJob[] = [
  { title: S.contractorJobs.waterHeater, trade: S.trades.plumbing, status: S.statuses.escrowFunded, statusClass: STATUS_CLASS.escrowFunded, amount: '$2,400', when: S.when.h2 },
  { title: S.contractorJobs.roofInspection, trade: S.trades.roofing, status: S.statuses.quoteSent, statusClass: STATUS_CLASS.quoteSent, amount: '$3,150', when: S.when.h5 },
  { title: S.contractorJobs.miniSplit, trade: S.trades.hvac, status: S.statuses.completed, statusClass: STATUS_CLASS.completed, amount: '$4,800', when: S.when.d1 },
  { title: S.contractorJobs.exteriorRepaint, trade: S.trades.painting, status: S.statuses.open, statusClass: STATUS_CLASS.open, amount: '$1,900', when: S.when.d2 },
];

export const CONTRACTOR_EARNINGS: MockEarningsPoint[] = [
  { month: S.months[0], earned: 420 },
  { month: S.months[1], earned: 690 },
  { month: S.months[2], earned: 560 },
  { month: S.months[3], earned: 980 },
  { month: S.months[4], earned: 1010 },
  { month: S.months[5], earned: 1180 },
];

export const CONTRACTOR_NOTIFICATIONS: MockNotification[] = [
  { ...S.contractorNotifications.escrowPaid, when: S.when.short.h2, unread: true },
  { ...S.contractorNotifications.commissionPaid, when: S.when.short.d1, unread: true },
  { ...S.contractorNotifications.newInterest, when: S.when.short.d2, unread: false },
  { ...S.contractorNotifications.review, when: S.when.short.d3, unread: false },
];

// ─── Referrer persona ─────────────────────────────────────────────────────────

export const REFERRER_STATS: MockStat[] = [
  { label: S.statLabels.totalEarned, value: '$310', tone: 'emerald' },
  { label: S.statLabels.pending, value: '$85', tone: 'amber' },
  { label: S.statLabels.referralsPosted, value: '7', tone: 'blue' },
  { label: S.statLabels.commissionRate, value: '5%', tone: 'amber' }, // sample value; live rate shown in section caption
];

export const REFERRER_JOBS: MockJob[] = [
  { title: S.referrerJobs.gutter, trade: S.trades.roofing, status: S.statuses.assigned, statusClass: STATUS_CLASS.assigned, amount: '$1,700', when: S.when.h3 },
  { title: S.referrerJobs.drainage, trade: S.trades.landscaping, status: S.statuses.inProgress, statusClass: STATUS_CLASS.inProgress, amount: '$2,200', when: S.when.d1 },
  { title: S.referrerJobs.panelUpgrade, trade: S.trades.electrical, status: S.statuses.completed, statusClass: STATUS_CLASS.completed, amount: '$2,900', when: S.when.d4 },
  { title: S.referrerJobs.faucet, trade: S.trades.plumbing, status: S.statuses.open, statusClass: STATUS_CLASS.open, amount: '$450', when: S.when.d5 },
];

export const REFERRER_EARNINGS: MockEarningsPoint[] = [
  { month: S.months[0], earned: 0 },
  { month: S.months[1], earned: 45 },
  { month: S.months[2], earned: 60 },
  { month: S.months[3], earned: 35 },
  { month: S.months[4], earned: 110 },
  { month: S.months[5], earned: 145 },
];

export const REFERRER_NOTIFICATIONS: MockNotification[] = [
  { ...S.referrerNotifications.assigned, when: S.when.short.h3, unread: true },
  { ...S.referrerNotifications.commissionPaid, when: S.when.short.d4, unread: true },
  { ...S.referrerNotifications.quoteApproved, when: S.when.short.d1, unread: false },
  { ...S.referrerNotifications.interest, when: S.when.short.d5, unread: false },
];

// ─── Shared: job pipeline preview ─────────────────────────────────────────────

export const MOCK_PIPELINE: MockPipelineStep[] = [
  { label: S.pipeline.posted, done: true },
  { label: S.pipeline.assigned, done: true },
  { label: S.pipeline.quoteApproved, done: true },
  { label: S.pipeline.escrowFunded, done: true, current: true },
  { label: S.pipeline.workDone, done: false },
  { label: S.pipeline.paidOut, done: false },
];

export function getMockPersona(role: MockRole) {
  if (role === 'referrer') {
    return {
      name: S.userNames.referrer,
      email: S.userEmails.referrer,
      stats: REFERRER_STATS,
      jobs: REFERRER_JOBS,
      earnings: REFERRER_EARNINGS,
      notifications: REFERRER_NOTIFICATIONS,
    };
  }
  return {
    name: S.userNames.contractor,
    email: S.userEmails.contractor,
    stats: CONTRACTOR_STATS,
    jobs: CONTRACTOR_JOBS,
    earnings: CONTRACTOR_EARNINGS,
    notifications: CONTRACTOR_NOTIFICATIONS,
  };
}
