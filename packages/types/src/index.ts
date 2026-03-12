// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'contractor' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  stripeCustomerId?: string;
  stripeConnectId?: string;
  createdAt: string;
};

// ─── Contractor Profile ───────────────────────────────────────────────────────

export const TRADE_TYPES = [
  'Landscaping',
  'Roofing',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Painting',
  'Carpentry',
  'Flooring',
  'Masonry',
  'Cleaning',
  'Pressure Washing',
  'Junk Removal',
  'Window Installation',
  'Siding',
  'Clearing',
  'General Contracting',
  'Other',
] as const;

export type TradeType = (typeof TRADE_TYPES)[number];

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

export type USState = (typeof US_STATES)[number];

export type ContractorProfile = {
  userId: string;
  tradeTypes: TradeType[];
  bio: string;
  licenseNumber?: string;
  streetAddress: string;
  city: string;
  state: USState;
  zipCode: string;
  yearsExperience: number;
  avgRating: number;
  totalEarned: number;
  totalReferrals: number;
  totalJobsCompleted: number;
  photoUrl?: string;
  stripeConnectStatus: 'not_connected' | 'pending' | 'active';
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobUrgency = 'Low' | 'Medium' | 'High' | 'Emergency';
export type JobStatus = 'Open' | 'Claimed' | 'InProgress' | 'Completed' | 'Cancelled' | 'Expired';

export type Job = {
  id: string;
  postedBy: string;
  claimedBy?: string;
  title: string;
  description: string;
  tradeType: TradeType;
  budgetMin: number;
  budgetMax: number;
  streetAddress: string;
  city: string;
  state: USState;
  zipCode: string;
  urgency: JobUrgency;
  status: JobStatus;
  clientName?: string;
  clientNote?: string;
  expiresAt: string;
  createdAt: string;
};

// ─── Payments & Commissions ───────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type CommissionStatus = 'pending' | 'paid' | 'failed';

export type JobPayment = {
  id: string;
  jobId: string;
  stripePaymentIntentId: string;
  totalAmount: number;
  platformFeePctSnapshot: number;
  commissionPctSnapshot: number;
  platformFeeAmount: number;
  commissionAmount: number;
  hiredAmount: number;
  status: PaymentStatus;
  paidAt?: string;
};

export type Commission = {
  id: string;
  jobId: string;
  referrerId: string;
  amount: number;
  status: CommissionStatus;
  stripeTransferId?: string;
  createdAt: string;
  paidAt?: string;
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';

export type Subscription = {
  userId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export type Review = {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  isFlagged: boolean;
  createdAt: string;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'job_claimed'
  | 'job_started'
  | 'job_completed'
  | 'commission_paid'
  | 'payout_failed'
  | 'subscription_renewed'
  | 'subscription_expiring'
  | 'subscription_cancelled'
  | 'review_received'
  | 'message_received'
  | 'announcement';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  jobId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

// ─── Platform Settings ────────────────────────────────────────────────────────

export type PlatformSettingKey =
  | 'signup_fee'
  | 'subscription_fee'
  | 'platform_fee_pct'
  | 'commission_pct'
  | 'min_job_budget'
  | 'max_job_budget'
  | 'job_expiry_days'
  | 'maintenance_mode'
  | 'featured_trade_categories';

export type PlatformSettings = {
  signupFee: number;
  subscriptionFee: number;
  platformFeePct: number;
  commissionPct: number;
  minJobBudget: number;
  maxJobBudget: number;
  jobExpiryDays: number;
  maintenanceMode: boolean;
  featuredTradeCategories: TradeType[];
};

// ─── API Response Wrappers ────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: string;
  code?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginatedResponse<T> = ApiSuccess<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;
