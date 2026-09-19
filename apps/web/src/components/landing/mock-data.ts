// ─── Mock dashboard data (pure front-end, no API) ─────────────────────────────
// Every display string lives in this file so it can be translated in one place.

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
  { label: 'Total Earned', value: '$4,820', tone: 'emerald' },
  { label: 'Pending', value: '$640', tone: 'amber' },
  { label: 'This Month', value: '$1,180', tone: 'blue' },
  { label: 'Profile Rating', value: '4.9 ★', tone: 'amber' },
];

export const CONTRACTOR_JOBS: MockJob[] = [
  { title: 'Water heater replacement — 2-story home', trade: S.trades.plumbing, status: S.statuses.escrowFunded, statusClass: STATUS_CLASS.escrowFunded, amount: '$2,400', when: '2h ago' },
  { title: 'Full roof inspection + shingle repair', trade: S.trades.roofing, status: S.statuses.quoteSent, statusClass: STATUS_CLASS.quoteSent, amount: '$3,150', when: '5h ago' },
  { title: 'Mini-split install, garage conversion', trade: S.trades.hvac, status: S.statuses.completed, statusClass: STATUS_CLASS.completed, amount: '$4,800', when: '1d ago' },
  { title: 'Exterior repaint — ranch style', trade: S.trades.painting, status: S.statuses.open, statusClass: STATUS_CLASS.open, amount: '$1,900', when: '2d ago' },
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
  { title: 'Client paid into escrow', body: 'Water heater replacement is funded. You can start work.', when: '2h', unread: true },
  { title: 'Commission paid', body: '$960 for "Mini-split install" hit your bank.', when: '1d', unread: true },
  { title: 'New interest in your referral', body: '3 contractors are interested in "Exterior repaint".', when: '2d', unread: false },
  { title: 'Review received', body: 'Alicia P. left you 5 stars.', when: '3d', unread: false },
];

// ─── Referrer persona ─────────────────────────────────────────────────────────

export const REFERRER_STATS: MockStat[] = [
  { label: 'Total Earned', value: '$310', tone: 'emerald' },
  { label: 'Pending', value: '$85', tone: 'amber' },
  { label: 'Referrals Posted', value: '7', tone: 'blue' },
  { label: 'Commission Rate', value: '5%', tone: 'amber' },
];

export const REFERRER_JOBS: MockJob[] = [
  { title: 'Neighbor needs gutter + downspout repair', trade: S.trades.roofing, status: S.statuses.assigned, statusClass: STATUS_CLASS.assigned, amount: '$1,700', when: '3h ago' },
  { title: 'Backyard drainage and sod', trade: S.trades.landscaping, status: S.statuses.inProgress, statusClass: STATUS_CLASS.inProgress, amount: '$2,200', when: '1d ago' },
  { title: 'Panel upgrade for EV charger', trade: S.trades.electrical, status: S.statuses.completed, statusClass: STATUS_CLASS.completed, amount: '$2,900', when: '4d ago' },
  { title: 'Leaking kitchen faucet + disposal', trade: S.trades.plumbing, status: S.statuses.open, statusClass: STATUS_CLASS.open, amount: '$450', when: '5d ago' },
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
  { title: 'Contractor assigned', body: 'You picked Reed Plumbing for "Gutter repair".', when: '3h', unread: true },
  { title: 'Commission paid', body: '$145 for "Panel upgrade" is on its way.', when: '4d', unread: true },
  { title: 'Quote approved', body: 'Client approved the $2,200 drainage quote.', when: '1d', unread: false },
  { title: 'Interest received', body: '2 contractors want "Kitchen faucet".', when: '5d', unread: false },
];

// ─── Shared: job pipeline preview ─────────────────────────────────────────────

export const MOCK_PIPELINE: MockPipelineStep[] = [
  { label: 'Posted', done: true },
  { label: 'Assigned', done: true },
  { label: 'Quote approved', done: true },
  { label: 'Escrow funded', done: true, current: true },
  { label: 'Work done', done: false },
  { label: 'Paid out', done: false },
];

export function getMockPersona(role: MockRole) {
  if (role === 'referrer') {
    return {
      name: MOCK_DATA_STRINGS.userNames.referrer,
      email: MOCK_DATA_STRINGS.userEmails.referrer,
      stats: REFERRER_STATS,
      jobs: REFERRER_JOBS,
      earnings: REFERRER_EARNINGS,
      notifications: REFERRER_NOTIFICATIONS,
    };
  }
  return {
    name: MOCK_DATA_STRINGS.userNames.contractor,
    email: MOCK_DATA_STRINGS.userEmails.contractor,
    stats: CONTRACTOR_STATS,
    jobs: CONTRACTOR_JOBS,
    earnings: CONTRACTOR_EARNINGS,
    notifications: CONTRACTOR_NOTIFICATIONS,
  };
}
