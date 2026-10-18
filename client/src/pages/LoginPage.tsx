import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap, Mail, Lock, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

type LoginTab = 'password' | 'otp';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab] = useState<LoginTab>('password');

  // ── Password fields ──────────────────────────────────────────────────────
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading,    setPwLoading]    = useState(false);
  const [pwError,      setPwError]      = useState('');

  // ── OTP fields ───────────────────────────────────────────────────────────
  const [otpEmail,     setOtpEmail]     = useState('');
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [otpError,     setOtpError]     = useState('');

  // ── Forgot password fields ────────────────────────────────────────────────
  const [showForgot,   setShowForgot]   = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError,  setForgotError]  = useState('');

  // ── Password submit ──────────────────────────────────────────────────────
  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setPwError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setPwLoading(false);
    }
  }

  // ── OTP: send code then navigate to verify page ──────────────────────────
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setOtpError('');
    const trimmed = otpEmail.trim().toLowerCase();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setOtpError('Please enter a valid email address');
      return;
    }
    setOtpLoading(true);
    try {
      await authService.sendOtp({ email: trimmed, purpose: 'LOGIN' });
      navigate('/verify-otp', { state: { email: trimmed, purpose: 'LOGIN' } });
    } catch (err: unknown) {
      setOtpError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to send verification code. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  }

  // ── Forgot password: send reset OTP ───────────────────────────────────────
  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setForgotError('');
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      await authService.sendOtp({ email: trimmed, purpose: 'PASSWORD_RESET' });
      navigate('/verify-otp', { state: { email: trimmed, purpose: 'PASSWORD_RESET' } });
    } catch (err: unknown) {
      setForgotError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to send reset code. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden">

      {/* ── Left marketing panel (lg+) ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex-col justify-center px-12 xl:px-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold">TaskFlow</span>
        </div>
        <h2 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
          Stay productive,<br />every single day.
        </h2>
        <p className="text-primary-200 text-lg leading-relaxed">
          Manage your tasks, track your progress, and build better habits with TaskFlow.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Tasks Managed',      value: '10K+' },
            { label: 'Productivity Boost', value: '3x'   },
            { label: 'Daily Streaks',      value: '365'  },
            { label: 'Happy Users',        value: '500+' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-primary-200 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 min-w-0">
        <div className="w-full max-w-md min-w-0">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">TaskFlow</span>
          </div>

          {showForgot ? (
            <div className="animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotError('');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>

              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-primary-600" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Forgot password?
              </h1>
              <p className="text-gray-500 mb-6 text-sm sm:text-base leading-relaxed">
                Enter your registered email address and we'll send you a 6-digit code to reset your password.
              </p>

              {forgotError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words animate-fade-in">
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="label" htmlFor="forgot-email">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending reset code…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send Reset Code
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotError('');
                  }}
                  className="text-primary-600 font-medium hover:underline touch-manipulation"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
              <p className="text-gray-500 mb-6 text-sm sm:text-base">Sign in to continue</p>

              {/* ── Tab switcher ──────────────────────────────────────────── */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-6">
                <button
                  onClick={() => { setTab('password'); setPwError(''); setOtpError(''); }}
                  className={[
                    'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium',
                    'transition-colors duration-150 touch-manipulation',
                    tab === 'password'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  Password
                </button>
                <button
                  onClick={() => { setTab('otp'); setPwError(''); setOtpError(''); }}
                  className={[
                    'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium',
                    'transition-colors duration-150 touch-manipulation',
                    tab === 'otp'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  Email OTP
                </button>
              </div>

              {/* ── Password form ─────────────────────────────────────────── */}
              {tab === 'password' && (
                <>
                  {pwError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words">
                      {pwError}
                    </div>
                  )}
                  <form onSubmit={handlePasswordLogin} className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="label" htmlFor="login-email">Email address</label>
                      <input
                        id="login-email"
                        type="email"
                        className="input-field"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="login-password">Password</label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          className="input-field pr-11"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center
                                     text-gray-400 hover:text-gray-600 touch-manipulation"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="btn-primary w-full justify-center py-3 text-base"
                    >
                      {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Sign in
                    </button>
                  </form>

                  {/* Forgot password link */}
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotEmail(email); // pre-fill with login email if typed
                        setForgotError('');
                      }}
                      className="text-sm text-primary-600 hover:underline font-medium touch-manipulation"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              {/* ── OTP form ──────────────────────────────────────────────── */}
              {tab === 'otp' && (
                <>
                  {otpError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words">
                      {otpError}
                    </div>
                  )}
                  <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="label" htmlFor="otp-email">Email address</label>
                      <input
                        id="otp-email"
                        type="email"
                        className="input-field"
                        placeholder="you@example.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="btn-primary w-full justify-center py-3 text-base"
                    >
                      {otpLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                        : <><Mail className="w-4 h-4" /> Send Verification Code</>}
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-gray-400 text-center">
                    We'll email you a 6-digit code. No password required.
                  </p>
                </>
              )}

              <p className="mt-6 text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:underline touch-manipulation">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
