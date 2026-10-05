import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  sendOtp,
  verifyOtpAndAuth,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// ── Password-based auth (unchanged) ─────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// ── OTP auth ─────────────────────────────────────────────────────────────────
router.post(
  '/send-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('purpose')
      .isIn(['LOGIN', 'REGISTER', 'PASSWORD_RESET'])
      .withMessage('Invalid purpose'),
  ],
  validate,
  sendOtp
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be exactly 6 digits'),
    body('purpose')
      .isIn(['LOGIN', 'REGISTER', 'PASSWORD_RESET'])
      .withMessage('Invalid purpose'),
  ],
  validate,
  verifyOtpAndAuth
);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

export default router;
