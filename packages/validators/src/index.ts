import { z } from 'zod';
import { TRADE_TYPES, US_STATES } from '@tradelink/types';

// ─── Auth Validators ──────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// ─── Contractor Profile Validators ────────────────────────────────────────────

export const contractorProfileSchema = z.object({
  tradeTypes: z
    .array(z.enum(TRADE_TYPES))
    .min(1, 'Select at least one trade type')
    .max(5, 'Select up to 5 trade types'),
  bio: z.string().min(20, 'Bio must be at least 20 characters').max(1000),
  licenseNumber: z.string().max(50).optional(),
  streetAddress: z.string().min(5, 'Enter your street address').max(200),
  city: z.string().min(2, 'Enter your city').max(100),
  state: z.enum(US_STATES, { errorMap: () => ({ message: 'Select a valid US state' }) }),
  zipCode: z
    .string()
    .regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits'),
  yearsExperience: z
    .number()
    .int()
    .min(0, 'Years experience cannot be negative')
    .max(60),
});

// ─── Job Validators ───────────────────────────────────────────────────────────

const ALL_JOB_STATUSES = [
  'Open', 'InterestClosed', 'Assigned', 'QuoteSent', 'QuoteApproved',
  'EscrowFunded', 'InProgress', 'ContractorDone', 'ClientConfirmed',
  'Completed', 'Disputed', 'Cancelled', 'Expired',
] as const;

export const createJobSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  tradeType: z.enum(TRADE_TYPES),
  budgetMin: z.number().positive('Budget must be a positive number'),
  budgetMax: z.number().positive('Budget must be a positive number'),
  streetAddress: z.string().min(5, 'Enter a street address').max(200),
  city: z.string().min(2, 'Enter a city').max(100),
  state: z.enum(US_STATES, { errorMap: () => ({ message: 'Select a valid US state' }) }),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP code must be exactly 5 digits'),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']),
  clientName: z.string().max(100).optional(),
  clientNote: z.string().max(500).optional(),
  // ─── New Phase 2 fields ───
  estimatedValue: z.union([z.number().positive(), z.string()]).optional(),
  serviceRadiusMiles: z.union([z.number().int().positive(), z.string()]).optional(),
  clientFirstName: z.string().max(100).optional(),
  clientLastName: z.string().max(100).optional(),
  clientEmail: z.string().email('Invalid client email').optional().or(z.literal('')),
  clientPhone: z.string().max(20).optional(),
  clientStreetAddress: z.string().max(200).optional(),
  clientCity: z.string().max(100).optional(),
  clientState: z.enum(US_STATES).optional().or(z.literal('')),
  clientZipCode: z.string().regex(/^\d{5}$/).optional().or(z.literal('')),
  clientNotes: z.string().max(1000).optional(),
});

export const jobFiltersSchema = z.object({
  tradeType: z.enum(TRADE_TYPES).optional(),
  state: z.enum(US_STATES).optional(),
  city: z.string().optional(),
  zipCode: z.string().regex(/^\d{5}$/).optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  urgency: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  status: z.enum(ALL_JOB_STATUSES).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

// ─── Quote Validator ──────────────────────────────────────────────────────────

export const createQuoteSchema = z.object({
  amount: z.union([z.number().positive(), z.string()]),
  scope: z.string().min(10, 'Scope must be at least 10 characters').max(2000),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});

// ─── Interest Validator ───────────────────────────────────────────────────────

export const expressInterestSchema = z.object({
  message: z.string().max(500).optional(),
});

// ─── Dispute Validator ────────────────────────────────────────────────────────

export const raiseDisputeSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason').max(2000),
  evidence: z.any().optional(),
});

// ─── Review Validator ─────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  jobId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10, 'Review must be at least 10 characters').max(1000),
});

// ─── Message Validator ────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  jobId: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});

// ─── Platform Settings Validator ──────────────────────────────────────────────

export const platformSettingsSchema = z.object({
  signup_fee: z.number().positive().optional(),
  subscription_fee: z.number().positive().optional(),
  platform_fee_pct: z.number().min(0).max(50).optional(),
  commission_pct: z.number().min(0).max(50).optional(),
  min_job_budget: z.number().positive().optional(),
  max_job_budget: z.number().positive().optional(),
  job_expiry_days: z.number().int().min(1).max(365).optional(),
  maintenance_mode: z.boolean().optional(),
  featured_trade_categories: z.array(z.enum(TRADE_TYPES)).optional(),
});

// ─── Change Password Validator ────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });

// ─── Exports ──────────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ContractorProfileInput = z.infer<typeof contractorProfileSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobFiltersInput = z.infer<typeof jobFiltersSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type ExpressInterestInput = z.infer<typeof expressInterestSchema>;
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;
