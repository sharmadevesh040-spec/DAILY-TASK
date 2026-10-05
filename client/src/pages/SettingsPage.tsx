import { useState, FormEvent } from 'react';
import { User, Lock, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { useToastContext } from '../context/ToastContext';
import { getInitials } from '../utils';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast }            = useToastContext();

  const [name,           setName]           = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword,    setCurrentPassword]    = useState('');
  const [newPassword,        setNewPassword]        = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwLoading,          setPwLoading]          = useState(false);
  const [pwError,            setPwError]            = useState('');

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const updated = await authService.updateProfile({ name });
      updateUser(updated);
      toast('Profile updated', 'success');
    } catch {
      toast('Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmNewPassword) { setPwError('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast('Password changed successfully', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (err: unknown) {
      setPwError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-fade-in w-full min-w-0">

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <User className="w-5 h-5 text-primary-600 shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        {/* Avatar + user info */}
        <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg sm:text-xl shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Member since{' '}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="label" htmlFor="profile-email">Email Address</label>
            <input
              id="profile-email"
              type="email"
              className="input-field bg-gray-50 cursor-not-allowed"
              value={user?.email || ''}
              disabled
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
          </div>
          {/* Full-width save button on mobile, auto-width on sm+ */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileLoading || !name.trim()}
              className="btn-primary w-full sm:w-auto"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* ── Password card ────────────────────────────────────────────────── */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <Lock className="w-5 h-5 text-primary-600 shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Change Password</h2>
        </div>

        {pwError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 break-words">
            {pwError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label" htmlFor="current-pw">Current Password</label>
            <input
              id="current-pw"
              type="password"
              className="input-field"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="new-pw">New Password</label>
            <input
              id="new-pw"
              type="password"
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-pw">Confirm New Password</label>
            <input
              id="confirm-pw"
              type="password"
              className="input-field"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading}
              className="btn-primary w-full sm:w-auto"
            >
              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
