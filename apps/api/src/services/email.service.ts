import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';

const resend = new Resend(env.RESEND_API_KEY);

// ─── Base email sender ────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    logger.info(`Email sent to ${to}: ${subject}`);
    return data;
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
    throw err;
  }
}

// ─── Branded email base template ─────────────────────────────────────────────

function baseTemplate(content: string, previewText: string = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="dark"/>
  <title>Tradelink</title>
</head>
<body style="margin:0;padding:0;background-color:#050d1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f1f5f9;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#050d1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:10px 20px;">
                    <span style="font-size:22px;font-weight:800;color:#050d1a;letter-spacing:-0.5px;">⚡ Tradelink</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#0f172a;border:1px solid #334155;border-radius:20px;padding:40px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;color:#64748b;font-size:13px;">
              <p style="margin:0 0 8px;">© ${new Date().getFullYear()} Tradelink. All rights reserved.</p>
              <p style="margin:0;">
                <a href="${env.WEB_URL}/terms" style="color:#f59e0b;text-decoration:none;">Terms of Service</a>
                &nbsp;·&nbsp;
                <a href="${env.WEB_URL}/privacy" style="color:#f59e0b;text-decoration:none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function btnStyle(url: string, label: string) {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#050d1a;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function headingStyle(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">${text}</h1>`;
}

function paraStyle(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94a3b8;">${text}</p>`;
}

function dividerStyle() {
  return `<hr style="border:none;border-top:1px solid #334155;margin:24px 0;"/>`;
}

// ─── Verification Email ───────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${env.WEB_URL}/verify-email?token=${token}`;
  const content = `
    ${headingStyle('Verify your email address')}
    ${paraStyle(`Hi ${name}, welcome to <strong style="color:#f59e0b;">Tradelink</strong>! You're almost ready to start earning commissions on referrals.`)}
    ${paraStyle('Click the button below to verify your email address. This link expires in <strong style="color:#f1f5f9;">24 hours</strong>.')}
    ${btnStyle(url, 'Verify Email Address →')}
    ${dividerStyle()}
    ${paraStyle(`Or paste this URL into your browser:<br/><a href="${url}" style="color:#f59e0b;word-break:break-all;">${url}</a>`)}
    ${paraStyle("If you didn't create a Tradelink account, you can safely ignore this email.")}`;

  return sendEmail({
    to,
    subject: 'Verify your Tradelink email address',
    html: baseTemplate(content, 'Verify your email to activate your Tradelink account'),
  });
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    ${headingStyle("You're in! Welcome to Tradelink 🎉")}
    ${paraStyle(`Hi ${name}, your account is now active and you're ready to start earning commissions.`)}
    ${paraStyle('Here\'s what to do next:')}
    <ul style="margin:0 0 16px;padding-left:20px;color:#94a3b8;font-size:15px;line-height:2;">
      <li>Complete your contractor profile</li>
      <li>Connect your bank account to receive payouts</li>
      <li>Browse the job board or post your first referral</li>
    </ul>
    ${btnStyle(`${env.WEB_URL}/dashboard`, 'Go to My Dashboard →')}`;

  return sendEmail({ to, subject: 'Welcome to Tradelink — You\'re all set!', html: baseTemplate(content) });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${env.WEB_URL}/reset-password?token=${token}`;
  const content = `
    ${headingStyle('Reset your password')}
    ${paraStyle(`Hi ${name}, we received a request to reset your Tradelink password.`)}
    ${paraStyle('Click the button below to choose a new password. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.')}
    ${btnStyle(url, 'Reset My Password →')}
    ${dividerStyle()}
    ${paraStyle("If you didn't request a password reset, you can safely ignore this email. Your password will not change.")}`;

  return sendEmail({
    to,
    subject: 'Reset your Tradelink password',
    html: baseTemplate(content, 'Reset your Tradelink password'),
  });
}

// ─── Subscription Confirmation ────────────────────────────────────────────────

export async function sendSubscriptionConfirmEmail(to: string, name: string, amount: string, nextDate: string) {
  const content = `
    ${headingStyle('Subscription activated ✓')}
    ${paraStyle(`Hi ${name}, your Tradelink subscription is now active.`)}
    <table width="100%" style="background:#0a1628;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0;">
      <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">Monthly fee</td><td align="right" style="color:#f59e0b;font-weight:700;font-size:18px;">$${amount}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;">Next billing date</td><td align="right" style="color:#f1f5f9;font-size:14px;">${nextDate}</td></tr>
    </table>
    ${btnStyle(`${env.WEB_URL}/dashboard/billing`, 'Manage Subscription →')}`;

  return sendEmail({ to, subject: 'Tradelink subscription confirmed', html: baseTemplate(content) });
}

// ─── Commission Paid Email ────────────────────────────────────────────────────

export async function sendCommissionPaidEmail(to: string, name: string, amount: string, jobTitle: string) {
  const content = `
    ${headingStyle('You just got paid! 💸')}
    ${paraStyle(`Hi ${name}, your referral commission for the following job has been paid out:`)}
    <table width="100%" style="background:#0a1628;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0;">
      <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">Job</td><td align="right" style="color:#f1f5f9;font-size:14px;">${jobTitle}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;">Commission earned</td><td align="right" style="color:#f59e0b;font-weight:700;font-size:22px;">$${amount}</td></tr>
    </table>
    ${paraStyle('Funds should appear in your connected bank account within 2–3 business days.')}
    ${btnStyle(`${env.WEB_URL}/dashboard/earnings`, 'View My Earnings →')}`;

  return sendEmail({ to, subject: `You earned $${amount} on Tradelink!`, html: baseTemplate(content) });
}

// ─── Job Claimed Email (to referrer) ─────────────────────────────────────────

export async function sendJobClaimedEmail(to: string, name: string, jobTitle: string) {
  const content = `
    ${headingStyle('Your referral was claimed!')}
    ${paraStyle(`Hi ${name}, great news — another contractor has claimed your referred job:`)}
    <div style="background:#0a1628;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="margin:0;font-size:16px;font-weight:600;color:#f1f5f9;">${jobTitle}</p>
    </div>
    ${paraStyle("You'll receive your 20% commission once the job is marked as completed.")}
    ${btnStyle(`${env.WEB_URL}/dashboard/my-referrals`, 'Track This Referral →')}`;

  return sendEmail({ to, subject: `Your Tradelink referral was claimed`, html: baseTemplate(content) });
}

// ─── Job Completed Email ──────────────────────────────────────────────────────

export async function sendJobCompletedEmail(to: string, name: string, jobTitle: string, commissionAmount: string) {
  const content = `
    ${headingStyle('Job completed — payout incoming! 🎯')}
    ${paraStyle(`Hi ${name}, the job you referred has been marked as complete.`)}
    <table width="100%" style="background:#0a1628;border:1px solid #334155;border-radius:12px;padding:20px;margin:16px 0;">
      <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">Job</td><td align="right" style="color:#f1f5f9;font-size:14px;">${jobTitle}</td></tr>
      <tr><td style="color:#64748b;font-size:13px;">Your commission</td><td align="right" style="color:#f59e0b;font-weight:700;font-size:22px;">$${commissionAmount}</td></tr>
    </table>
    ${paraStyle('Your commission payout is being processed and will appear in 2–3 business days.')}
    ${btnStyle(`${env.WEB_URL}/dashboard/earnings`, 'View Earnings →')}`;

  return sendEmail({ to, subject: `Commission incoming — job completed!`, html: baseTemplate(content) });
}
