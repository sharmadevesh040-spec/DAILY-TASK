import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Zap, Mail, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService, OtpPurpose, AuthResponse, OtpVerifiedResponse } from '../services/auth.service';
import { useToastContext } from '../context/ToastContext';
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
  const canResend = resendWait <= 0 && !success;
  const canVerify = otp.length === 6 && !isExpired && !verifying && !success;

  // ── Verify ────────────────────────────────────────────────────────────────
  async function handleVerify() {
    if (!canVerify) return;
    setError('');
    setVerifying(true);

    try {
      if (purpose === 'REGISTER') {
        // ── REGISTER flow ─────────────────────────────────────────────────
        // Step 1: Verify the OTP (returns { verified: true }, does NOT create user)
        const otpResult = await authService.verifyOtp({ email, otp, purpose }) as OtpVerifiedResponse;

        if (!otpResult.verified) {
          setError('Email verification failed. Please try again.');
          return;
        }

        // Step 2: OTP confirmed — now create the account using the full form data
        if (!registerPayload) {
          setError('Registration data missing. Please go back and fill the form again.');
          return;
        }

        const authResult = await authService.register(registerPayload);

        // Step 3: Persist session
        localStorage.setItem('token', authResult.token);
        localStorage.setItem('user', JSON.stringify(authResult.user));

        setSuccess(true);
        toast('Account created — welcome! 🎉', 'success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);

      } else {
        // ── LOGIN / PASSWORD_RESET flow ───────────────────────────────────
        // verifyOtp returns { token, user } for non-REGISTER purposes
        const authResult = await authService.verifyOtp({ email, otp, purpose }) as AuthResponse;

        localStorage.setItem('token', authResult.token);
        localStorage.setItem('user', JSON.stringify(authResult.user));

        setSuccess(true);
        toast('Signed in successfully!', 'success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setError(msg);
    } finally {
      setVerifying(false);
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [canResend, email, purpose, toast]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !isExpired && !verifying && !success) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const purposeLabel =
    purpose === 'REGISTER'       ? 'verify your email before creating your account'
    : purpose === 'PASSWORD_RESET' ? 'reset your password'
    : 'sign in to your account';

  const backPath = purpose === 'REGISTER' ? '/register' : '/login';
  const backLabel = purpose === 'REGISTER' ? 'Back to registration' : 'Use a different email';

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
                : <Mail className="w-7 h-7 text-primary-600" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {success ? 'Verified!' : 'Enter Verification Code'}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {success
                ? (purpose === 'REGISTER'
                    ? 'Account created! Redirecting to your dashboard…'
                    : 'Signed in! Redirecting…')
                : <>
                    We sent a 6-digit code to{' '}
                    <span className="font-semibold text-gray-700 break-all">{email}</span>
                    {' '}to {purposeLabel}.
                  </>}
            </p>
          </div>

          {/* OTP input + controls */}
          {!success && (
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
          {!success && (
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
