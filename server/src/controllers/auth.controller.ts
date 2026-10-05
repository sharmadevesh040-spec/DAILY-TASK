import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OtpPurpose } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { createOtp, verifyOtp } from '../services/otpService';
import { sendOtpEmail } from '../services/emailService';

const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#3b82f6' },
  { name: 'Personal', color: '#8b5cf6' },
  { name: 'Study', color: '#f59e0b' },
  { name: 'Fitness', color: '#10b981' },
  { name: 'Projects', color: '#ef4444' },
  { name: 'Other', color: '#6b7280' },
];

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      errorResponse(res, 'Email already in use', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    });

    // Seed default categories for the new user
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
      skipDuplicates: true,
    });

    const token = signToken({ userId: user.id, email: user.email });

    successResponse(res, { token, user }, 'Account created successfully', 201);
  } catch (err) {
    console.error('Register error:', err);
    errorResponse(res, 'Failed to create account', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      errorResponse(res, 'Invalid email or password', 401);
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      errorResponse(res, 'Invalid email or password', 401);
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    const { passwordHash: _, ...safeUser } = user;

    successResponse(res, { token, user: safeUser }, 'Login successful');
  } catch (err) {
    console.error('Login error:', err);
    errorResponse(res, 'Login failed', 500);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    successResponse(res, { user });
  } catch (err) {
    console.error('GetMe error:', err);
    errorResponse(res, 'Failed to fetch user', 500);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, avatar },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true, updatedAt: true },
    });

    successResponse(res, { user }, 'Profile updated');
  } catch (err) {
    console.error('UpdateProfile error:', err);
    errorResponse(res, 'Failed to update profile', 500);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      errorResponse(res, 'Current password is incorrect', 401);
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

    successResponse(res, null, 'Password changed successfully');
  } catch (err) {
    console.error('ChangePassword error:', err);
    errorResponse(res, 'Failed to change password', 500);
  }
}

// ── OTP: send ─────────────────────────────────────────────────────────────────
export async function sendOtp(req: Request, res: Response): Promise<void> {
  try {
    const rawEmail = (req.body.email as string || '').toLowerCase().trim();
    const purpose  = (req.body.purpose as OtpPurpose) || 'LOGIN';

    if (!rawEmail) {
      errorResponse(res, 'Email is required', 400);
      return;
    }

    // For REGISTER: allow any valid email (user may not exist yet)
    // For LOGIN / PASSWORD_RESET: user must already exist
    if (purpose !== 'REGISTER') {
      const user = await prisma.user.findUnique({ where: { email: rawEmail } });
      if (!user) {
        // Return generic message to prevent email enumeration
        successResponse(res, null, 'If that email is registered, a code has been sent.');
        return;
      }
    }

    const result = await createOtp(rawEmail, purpose);

    if (result.cooldownSeconds) {
      errorResponse(
        res,
        `Please wait ${result.cooldownSeconds} second${result.cooldownSeconds !== 1 ? 's' : ''} before requesting another code.`,
        429
      );
      return;
    }

    // Send the plaintext OTP via email — never log it, never return it
    await sendOtpEmail(rawEmail, result.otp, purpose);

    successResponse(res, null, 'Verification code sent. Check your inbox.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send verification code';
    // Mask SMTP credential errors from the client
    const safeMsg = msg.includes('SMTP') || msg.includes('credentials')
      ? 'Unable to send verification email. Please try again later.'
      : msg;
    console.error('[sendOtp]', msg);
    errorResponse(res, safeMsg, 500);
  }
}

// ── OTP: verify ───────────────────────────────────────────────────────────────
export async function verifyOtpAndAuth(req: Request, res: Response): Promise<void> {
  try {
    const rawEmail = (req.body.email as string || '').toLowerCase().trim();
    const otp      = String(req.body.otp || '').trim();
    const purpose  = (req.body.purpose as OtpPurpose) || 'LOGIN';

    if (!rawEmail || !otp) {
      errorResponse(res, 'Email and OTP are required', 400);
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      errorResponse(res, 'OTP must be exactly 6 digits', 400);
      return;
    }

    // This throws with a user-friendly message on any failure
    await verifyOtp(rawEmail, otp, purpose);

    // ── REGISTER purpose: only verify the OTP, do NOT create the user.
    //    The frontend will call POST /api/auth/register afterwards with
    //    the full form data (name, password, etc.).
    if (purpose === 'REGISTER') {
      successResponse(res, { verified: true }, 'Email verified successfully');
      return;
    }

    // ── LOGIN / PASSWORD_RESET: find existing user and issue JWT ─────────────
    const user = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (!user) {
      errorResponse(res, 'No account found for this email.', 404);
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    const { passwordHash: _, ...safeUser } = user;

    successResponse(res, { token, user: safeUser }, 'Login successful');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    console.error('[verifyOtp]', msg);
    errorResponse(res, msg, 400);
  }
}
