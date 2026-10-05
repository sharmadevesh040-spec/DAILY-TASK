import crypto from 'crypto';
import { OtpPurpose } from '@prisma/client';
import { prisma } from '../utils/prisma';

// ── Constants ────────────────────────────────────────────────────────────────
const OTP_TTL_SECONDS      = 5 * 60;        // 5 minutes
const MAX_ATTEMPTS         = 5;
const RESEND_COOLDOWN_MS   = 60 * 1000;     // 60 seconds

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a cryptographically secure 6-digit OTP string */
export function generateOtp(): string {
  // crypto.randomInt is inclusive on lower, exclusive on upper → 100000–999999
  const num = crypto.randomInt(100_000, 1_000_000);
  return String(num).padStart(6, '0');
}

/** Hash OTP with HMAC-SHA256 keyed on the email — prevents rainbow-table attacks */
function hashOtp(otp: string, email: string): string {
  const secret = process.env.JWT_SECRET || 'otp-hash-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${email.toLowerCase().trim()}:${otp}`)
    .digest('hex');
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ── Core OTP operations ───────────────────────────────────────────────────────

/**
 * Create a new OTP record.
 * - Invalidates all previous un-verified OTPs for this email+purpose.
 * - Enforces 60-second resend cooldown.
 * Returns the plaintext OTP (caller must send it; never persist it).
 */
export async function createOtp(
  email: string,
  purpose: OtpPurpose
): Promise<{ otp: string; cooldownSeconds?: number }> {
  const normalEmail = normalizeEmail(email);

  // Check resend cooldown — find the most recent OTP for this email/purpose
  const recent = await prisma.otpVerification.findFirst({
    where: { email: normalEmail, purpose, verified: false },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    const elapsedMs = Date.now() - recent.createdAt.getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
      return { otp: '', cooldownSeconds: waitSeconds };
    }

    // Invalidate all previous OTPs for this email+purpose
    await prisma.otpVerification.updateMany({
      where: { email: normalEmail, purpose, verified: false },
      data:  { expiresAt: new Date(0) },   // expire immediately
    });
  }

  // Generate and hash new OTP
  const otp     = generateOtp();
  const otpHash = hashOtp(otp, normalEmail);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otpVerification.create({
    data: { email: normalEmail, otpHash, purpose, expiresAt },
  });

  return { otp };
}

/**
 * Verify an OTP.
 * Returns { success: true } or throws with a user-friendly message.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  purpose: OtpPurpose
): Promise<void> {
  const normalEmail = normalizeEmail(email);

  // Find the most recent valid (not-yet-verified, not-expired) record
  const record = await prisma.otpVerification.findFirst({
    where: {
      email:    normalEmail,
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new Error('Invalid or expired OTP. Please request a new code.');
  }

  // Check attempt count first (before comparing, to prevent timing side-channel)
  if (record.attempts >= MAX_ATTEMPTS) {
    // Expire the record so it can't be used
    await prisma.otpVerification.update({
      where: { id: record.id },
      data:  { expiresAt: new Date(0) },
    });
    throw new Error('Too many incorrect attempts. Please request a new code.');
  }

  const expectedHash = hashOtp(otp, normalEmail);

  if (record.otpHash !== expectedHash) {
    // Increment attempt counter
    await prisma.otpVerification.update({
      where: { id: record.id },
      data:  { attempts: { increment: 1 } },
    });

    const remaining = MAX_ATTEMPTS - record.attempts - 1;
    throw new Error(
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
        : 'Too many incorrect attempts. Please request a new code.'
    );
  }

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: record.id },
    data:  { verified: true },
  });
}

/**
 * Periodic cleanup of old OTP records (called by the cron job).
 * Removes expired records older than 1 hour to keep the table clean.
 */
export async function cleanupExpiredOtps(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await prisma.otpVerification.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: oneHourAgo } },
        { verified: true, createdAt: { lt: oneHourAgo } },
      ],
    },
  });
}
