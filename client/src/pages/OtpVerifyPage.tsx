import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Zap, Mail, ArrowLeft, RefreshCw, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService, OtpPurpose, AuthResponse, OtpVerifiedResponse } from '../services/auth.service';
import { useToastContext } from '../context/ToastContext';
import { extractErrorMessage } from '../utils';
import OtpInput from '../components/OtpInput';

// ── State passed via router navigation ───────────────────────────────────────
interface LocationState {
  email: string;
  purpose: OtpPurpose;
  // Only present for REGISTER purpose — the full signup form data
  registerPayload?: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
}

const OTP_TTL_SECONDS   = 5 * 60;  // must match backend
const RESEND_COOLDOWN_S = 60;

export default function OtpVerifyPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { toast } = useToastContext();
  const { login: authContextLogin } = useAuth();

  const state = location.state as LocationState | null;

  // Guard: redirect if we arrive without proper state
  useEffect(() => {
    if (!state?.email || !state?.purpose) {
      navigate('/login', { replace: true });
    }
  }, [state, navigate]);

  const email           = state?.email            ?? '';
  const purpose         = state?.purpose          ?? 'LOGIN';
  const registerPayload = state?.registerPayload;

  const [otp,        setOtp]        = useState('');
  const [verifying,  setVerifying]  = useState(false);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  // ── PASSWORD_RESET: after OTP verified, show new-password form ─────────────
  const [otpVerified,       setOtpVerified]       = useState(false);
  const [newPassword,       setNewPassword]       = useState('');
  const [confirmPassword,   setConfirmPassword]   = useState('');
  const [showNewPw,         setShowNewPw]         = useState(false);
  const [showConfirmPw,     setShowConfirmPw]     = useState(false);
  const [resetLoading,      setResetLoading]      = useState(false);
  const [resetError,        setResetError]        = useState('');

  // Countdown: time until OTP expires
  const [timeLeft,   setTimeLeft]   = useState(OTP_TTL_SECONDS);
  // Cooldown: time until Resend is allowed again
  const [resendWait, setResendWait] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);

  function formatTime(secs: number) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  const isExpired = timeLeft <= 0;
  const canResend = resendWait <= 0 && !success && !otpVerified;
  const canVerify = otp.length === 6 && !isExpired && !verifying && !success && !otpVerified;

  // ── Verify ────────────────────────────────────────────────────────────────
  async function handleVerify() {
    if (!canVerify) return;
    setError('');
    setVerifying(true);

    try {
      if (purpose === 'REGISTER') {
        // ── REGISTER flow ─────────────────────────────────────────────────
        const otpResult = await authService.verifyOtp({ email, otp, purpose }) as OtpVerifiedResponse;

        if (!otpResult.verified) {
          setError('Email verification failed. Please try again.');
          return;
        }

        if (!registerPayload) {
          setError('Registration data missing. Please go back and fill the form again.');
          return;
        }

        const authResult = await authService.register(registerPayload);

        localStorage.setItem('token', authResult.token);
        localStorage.setItem('user', JSON.stringify(authResult.user));

        setSuccess(true);
        toast('Account created — welcome! 🎉', 'success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);

      } else if (purpose === 'PASSWORD_RESET') {
        // ── PASSWORD_RESET flow ───────────────────────────────────────────
        const otpResult = await authService.verifyOtp({ email, otp, purpose }) as OtpVerifiedResponse;

        if (!otpResult.verified) {
          setError('Verification failed. Please try again.');
          return;
        }

        // OTP verified — now show the new password form
        setOtpVerified(true);
        toast('Code verified! Set your new password.', 'success');

      } else {
        // ── LOGIN flow ───────────────────────────────────────────────────
        const authResult = await authService.verifyOtp({ email, otp, purpose }) as AuthResponse;

        localStorage.setItem('token', authResult.token);
        localStorage.setItem('user', JSON.stringify(authResult.user));

        setSuccess(true);
        toast('Signed in successfully!', 'success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Verification failed. Please try again.'));
    } finally {
      setVerifying(false);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async function handleResetPassword() {
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);
    try {
      const authResult = await authService.resetPassword({ email, newPassword });

      localStorage.setItem('token', authResult.token);
      localStorage.setItem('user', JSON.stringify(authResult.user));

      setSuccess(true);
      toast('Password reset successfully! 🎉', 'success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 800);
    } catch (err: unknown) {
      setResetError(extractErrorMessage(err, 'Failed to reset password. Please try again.'));
    } finally {
      setResetLoading(false);
    }
  }

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (!canResend) return;
    setSending(true);
    setError('');
    setOtp('');
    try {
      await authService.sendOtp({ email, purpose });
      setTimeLeft(OTP_TTL_SECONDS);
      setResendWait(RESEND_COOLDOWN_S);
      toast('New code sent — check your inbox', 'info');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to resend code. Please try again.'));
    } finally {
      setSending(false);
    }
  }, [canResend, email, purpose, toast]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !isExpired && !verifying && !success && !otpVerified) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const purposeLabel =
    purpose === 'REGISTER'       ? 'verify your email before creating your account'
    : purpose === 'PASSWORD_RESET' ? 'reset your password'
    : 'sign in to your account';

  const backPath = purpose === 'REGISTER' ? '/register' : '/login';
  const backLabel =
    purpose === 'REGISTER'        ? 'Back to registration'
    : purpose === 'PASSWORD_RESET' ? 'Back to login'
    : 'Use a different email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10 overflow-x-hidden">
      <div className="w-full max-w-md min-w-0">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TaskFlow</span>
        </div>

        <div className="card p-6 sm:p-8">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {success
                ? <ShieldCheck className="w-7 h-7 text-green-500" />
                : otpVerified
                  ? <Lock className="w-7 h-7 text-primary-600" />
                  : <Mail className="w-7 h-7 text-primary-600" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {success
                ? 'Done!'
                : otpVerified
                  ? 'Set New Password'
                  : 'Enter Verification Code'}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {success
                ? (purpose === 'REGISTER'
                    ? 'Account created! Redirecting to your dashboard…'
                    : purpose === 'PASSWORD_RESET'
                      ? 'Password reset! Redirecting…'
                      : 'Signed in! Redirecting…')
                : otpVerified
                  ? <>Create a new password for <span className="font-semibold text-gray-700 break-all">{email}</span></>
                  : <>
                      We sent a 6-digit code to{' '}
                      <span className="font-semibold text-gray-700 break-all">{email}</span>
                      {' '}to {purposeLabel}.
                    </>}
            </p>
          </div>

          {/* ── New Password Form (PASSWORD_RESET after OTP verified) ──── */}
          {otpVerified && !success && (
            <>
              {resetError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words animate-fade-in">
                  {resetError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="new-pw">New Password</label>
                  <div className="relative">
                    <input
                      id="new-pw"
                      type={showNewPw ? 'text' : 'password'}
                      className="input-field pr-11"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center
                                 text-gray-400 hover:text-gray-600 touch-manipulation"
                      aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="confirm-pw">Confirm New Password</label>
                  <div className="relative">
                    <input
                      id="confirm-pw"
                      type={showConfirmPw ? 'text' : 'password'}
                      className="input-field pr-11"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center
                                 text-gray-400 hover:text-gray-600 touch-manipulation"
                      aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading || !newPassword || !confirmPassword}
                  className="btn-primary w-full justify-center mt-2"
                >
                  {resetLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                    : <><Lock className="w-4 h-4" /> Reset Password</>}
                </button>
              </div>
            </>
          )}

          {/* ── OTP input + controls ─────────────────────────────────── */}
          {!success && !otpVerified && (
            <>
              <OtpInput
                value={otp}
                onChange={setOtp}
                disabled={verifying || isExpired}
                hasError={!!error}
              />

              {/* Error */}
              {error && (
                <p className="mt-3 text-sm text-red-600 text-center break-words animate-fade-in">
                  {error}
                </p>
              )}

              {/* Timer */}
              <div className="mt-4 text-center">
                {isExpired ? (
                  <p className="text-sm font-medium text-red-500">Code expired — request a new one</p>
                ) : (
                  <p className={`text-sm font-medium tabular-nums ${timeLeft <= 60 ? 'text-orange-500' : 'text-gray-500'}`}>
                    Code expires in{' '}
                    <span className="font-bold">{formatTime(timeLeft)}</span>
                  </p>
                )}
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={!canVerify}
                className="btn-primary w-full justify-center mt-5"
              >
                {verifying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  : purpose === 'REGISTER'
                    ? 'Verify & Create Account'
                    : purpose === 'PASSWORD_RESET'
                      ? 'Verify Code'
                      : 'Verify Code'}
              </button>

              {/* Resend */}
              <div className="mt-4 text-center">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline
                               touch-manipulation disabled:opacity-50"
                  >
                    {sending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                      : <><RefreshCw className="w-3.5 h-3.5" /> Resend code</>}
                  </button>
                ) : (
                  <p className="text-sm text-gray-400 tabular-nums">
                    Resend available in{' '}
                    <span className="font-semibold text-gray-600">{resendWait}s</span>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Redirect spinner */}
          {success && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          )}

          {/* Back link */}
          {!success && !otpVerified && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <button
                onClick={() => navigate(backPath, { replace: true })}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 touch-manipulation"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {backLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
