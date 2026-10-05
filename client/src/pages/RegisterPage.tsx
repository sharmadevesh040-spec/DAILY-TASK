import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap, Check, Mail } from 'lucide-react';
import { authService } from '../services/auth.service';

export default function RegisterPage() {
  const navigate = useNavigate();

  // ── Shared fields ─────────────────────────────────────────────────────────
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [errors,          setErrors]          = useState<Record<string, string>>({});

  const passwordChecks = {
    length: password.length >= 8,
    match:  password === confirmPassword && password.length > 0,
  };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (password.length < 8)          errs.password        = 'Password must be at least 8 characters';
    if (password !== confirmPassword)  errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit: validate → send OTP → navigate to verify page ────────────────
  //   The verify page will call /auth/register after OTP is confirmed.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Step 1 — Send OTP to the email address
      await authService.sendOtp({ email: trimmedEmail, purpose: 'REGISTER' });

      // Step 2 — Navigate to OTP verify page, carrying full form data in state.
      //           The verify page will use this to call /auth/register on success.
      navigate('/verify-otp', {
        state: {
          email:           trimmedEmail,
          purpose:         'REGISTER',
          // Registration payload passed through so verify page can finish signup
          registerPayload: {
            name:            name.trim(),
            email:           trimmedEmail,
            password,
            confirmPassword,
          },
        },
      });
    } catch (err: unknown) {
      setErrors({
        submit:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Unable to send verification code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-gray-50 px-3 sm:px-6 py-6 sm:py-10 overflow-x-hidden">
      <div className="w-full max-w-md min-w-0">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TaskFlow</span>
        </div>

        <div className="card p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-gray-500 text-sm mb-5">
            We'll send a verification code to your email before creating your account.
          </p>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Name */}
            <div>
              <label className="label" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className={`input-field ${errors.name ? 'border-red-400' : ''}`}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field pr-11 ${errors.password ? 'border-red-400' : ''}`}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`input-field ${errors.confirmPassword ? 'border-red-400' : ''}`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Strength indicators */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <PasswordCheck met={passwordChecks.length} label="At least 8 characters" />
                <PasswordCheck met={passwordChecks.match}  label="Passwords match"       />
              </div>
            )}

            {/* OTP info */}
            <div className="flex items-start gap-2 p-3 bg-primary-50 border border-primary-100 rounded-lg">
              <Mail className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-xs text-primary-700 leading-relaxed">
                A 6-digit verification code will be sent to your email to confirm your address before your account is created.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-1"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                : 'Continue — Verify Email'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline touch-manipulation">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${met ? 'bg-green-100' : 'bg-gray-100'}`}>
        {met && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </div>
      {label}
    </div>
  );
}
