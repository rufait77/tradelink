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
  'PressureWashing',
  'JunkRemoval',
  'WindowInstallation',
  'Siding',
  'Clearing',
  'GeneralContracting',
  'Barber',
  'Cosmetology',
  'Esthetician',
  'AutoMechanics',
  'Other',
] as const;

export type TradeType = (typeof TRADE_TYPES)[number];

// Display-friendly labels for trade types
export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  Landscaping: 'Landscaping',
  Roofing: 'Roofing',
  HVAC: 'HVAC',
  Plumbing: 'Plumbing',
  Electrical: 'Electrical',
  Painting: 'Painting',
  Carpentry: 'Carpentry',
  Flooring: 'Flooring',
  Masonry: 'Masonry',
  Cleaning: 'Cleaning',
  PressureWashing: 'Pressure Washing',
  JunkRemoval: 'Junk Removal',
  WindowInstallation: 'Window Installation',
  Siding: 'Siding',
  Clearing: 'Clearing',
  GeneralContracting: 'General Contracting',
  Barber: 'Barber',
  Cosmetology: 'Cosmetology',
  Esthetician: 'Esthetician',
  AutoMechanics: 'Auto Mechanics',
  Other: 'Other',
};

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
  licenseFileUrl?: string;
  insuranceUrl?: string;
  certifications?: any;
  streetAddress: string;
  city: string;
  state: USState;
  zipCode: string;
  yearsExperience: number;
  avgRating: number;
  avgResponseTime?: number;
  totalEarned: number;
  totalReferrals: number;
  totalJobsCompleted: number;
  photoUrl?: string;
  stripeConnectStatus: 'not_connected' | 'pending' | 'active';
  onboardingComplete: boolean;
  isAdminVerified: boolean;
  ghostStrikes: number;
  bypassWarnings: number;
  isSuspended: boolean;
  suspendedUntil?: string;
  isBanned: boolean;
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobUrgency = 'Low' | 'Medium' | 'High' | 'Emergency';

export type JobStatus =
  | 'Open'
  | 'InterestClosed'
  | 'Assigned'
  | 'QuoteSent'
  | 'QuoteApproved'
  | 'EscrowFunded'
  | 'InProgress'
  | 'ContractorDone'
  | 'ClientConfirmed'
  | 'Completed'
  | 'Disputed'
  | 'Cancelled'
  | 'Expired';

export type Job = {
  id: string;
  postedById: string;
  claimedById?: string;
  title: string;
  description: string;
  tradeType: TradeType;
  budgetMin: number;
  budgetMax: number;
  estimatedValue?: number;
  streetAddress: string;
  city: string;
  state: USState;
  zipCode: string;
  serviceRadiusMiles?: number;
  urgency: JobUrgency;
  status: JobStatus;
  clientName?: string;
  clientNote?: string;
  expiresAt: string;
  interestWindowEnd?: string;
  assignedAt?: string;
  contractorCompletedAt?: string;
  clientConfirmedAt?: string;
  autoReleaseAt?: string;
  completionPhotos: string[];
  completionNotes?: string;
  createdAt: string;
};

// ─── Interest ─────────────────────────────────────────────────────────────────

export type InterestStatus = 'pending' | 'selected' | 'rejected' | 'withdrawn';

export type JobInterest = {
  id: string;
  jobId: string;
  contractorId: string;
  message?: string;
  status: InterestStatus;
  createdAt: string;
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'revised' | 'cancelled';

export type Quote = {
  id: string;
  jobId: string;
  contractorId: string;
  amount: number;
  scope: string;
  scheduledDate: string;
  status: QuoteStatus;
  clientToken: string;
  revisionOfId?: string;
  rejectionNote?: string;
  platformFeePct: number;
  commissionPct: number;
  createdAt: string;
};

// ─── Escrow ───────────────────────────────────────────────────────────────────

export type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';

export type EscrowPayment = {
  id: string;
  jobId: string;
  quoteId: string;
  stripePaymentIntentId?: string;
  stripeCheckoutId?: string;
  totalAmount: number;
  platformFeeAmount: number;
  commissionAmount: number;
  contractorAmount: number;
  status: EscrowStatus;
  paymentLink?: string;
  paidAt?: string;
  releasedAt?: string;
  createdAt: string;
};

// ─── Disputes ─────────────────────────────────────────────────────────────────

export type DisputeStatus = 'open' | 'under_review' | 'resolved_contractor' | 'resolved_client' | 'closed';

export type Dispute = {
  id: string;
  jobId: string;
  raisedBy: string;
  reason: string;
  evidence?: string;
  status: DisputeStatus;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
};

// ─── Strikes ──────────────────────────────────────────────────────────────────

export type StrikeType = 'ghost' | 'bypass_attempt' | 'client_report';

export type ContractorStrike = {
  id: string;
  contractorId: string;
  type: StrikeType;
  jobId?: string;
  reason: string;
  isWarning: boolean;
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

export type ReviewDimension = 'job_quality' | 'referral_quality' | 'client_facing' | 'general';

export type Review = {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  dimension: ReviewDimension;
  isFlagged: boolean;
  createdAt: string;
};

// ─── Client Lead ──────────────────────────────────────────────────────────────

export type ClientLead = {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  accessToken: string;
  tokenExpiry: string;
  notes?: string;
  createdAt: string;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  // Existing types
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
  | 'announcement'
  // Interest & Assignment
  | 'interest_received'
  | 'interest_selected'
  | 'interest_rejected'
  | 'job_assigned'
  // Quote lifecycle
  | 'quote_sent'
  | 'quote_approved'
  | 'quote_rejected'
  // Payment & Escrow
  | 'escrow_funded'
  | 'contractor_completed'
  | 'client_confirmed'
  | 'funds_released'
  // Disputes
  | 'dispute_raised'
  | 'dispute_resolved'
  // Trust & Safety
  | 'ghost_warning'
  | 'ghost_strike'
  | 'penalty_warning'
  | 'penalty_suspension'
  | 'penalty_ban'
  // Ratings
  | 'review_prompt'
  // Legacy alias
  | 'job_expired';

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
