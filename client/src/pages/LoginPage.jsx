import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import logoIcon from '../assets/logo.png';
import { ROLE_DASHBOARD_ROUTES } from '../utils/constants';
import Button from '../components/common/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Password rules validation for step 2
  const passwordChecks = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleForgotSubmit = async () => {
    setForgotError('');
    setForgotMsg('');

    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) {
      setForgotError('Please enter your institutional email address.');
      return;
    }

    if (!clean.endsWith('@sbjit.edu.in')) {
      setForgotError('Only official college domain (@sbjit.edu.in) is allowed.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process password reset request.');
      }

      const token = data.data?.resetToken || data.resetToken;
      if (token) {
        setResetToken(token);
        setForgotStep(2);
        setForgotMsg('Identity verified! Please set your new secure password below.');
      } else {
        setForgotMsg(data.message || 'Password reset instructions have been dispatched.');
      }
    } catch (err) {
      setForgotError(err.message || 'Error processing request. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    setForgotError('');
    setForgotMsg('');

    if (!isPasswordStrong) {
      setForgotError(
        'Password must contain min 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setForgotMsg('Password successfully reset! You can now log in.');
      setEmail(forgotEmail.trim());
      setPassword('');
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(ROLE_DASHBOARD_ROUTES[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Link to="/" className="flex items-center justify-center gap-3 group">
            <img src={logoIcon} alt="ClearMate Logo" className="h-16 sm:h-20 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
            <span className="text-2xl sm:text-3xl font-extrabold text-ink-primary tracking-wide font-display">
              CLEARMATE
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border-subtle rounded-md shadow-sm p-6">
          <h1 className="text-lg font-semibold text-ink-primary mb-1">Sign in</h1>
          <p className="text-sm text-ink-muted mb-6">
            Enter your credentials to access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="label-base">
                College Email (@sbjit.edu.in)
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                className="input-base"
                placeholder="you@sbjit.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="label-base">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input-base pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-secondary transition-colors duration-150"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <HiOutlineEyeSlash className="w-5 h-5" />
                  ) : (
                    <HiOutlineEye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password modal trigger */}
            <div className="flex items-center justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotMsg('');
                  setForgotEmail(email || '');
                }}
                className="text-xs font-medium text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          {/* Quick Demo Login Chips */}
          <div className="mt-6 pt-5 border-t border-border-subtle space-y-2.5">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider text-center">
              💡 Quick Demo Login (@sbjit.edu.in)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('student@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => { setEmail('teacher@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                👩‍🏫 Teacher
              </button>
              <button
                type="button"
                onClick={() => { setEmail('accounts@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all text-left"
              >
                💳 Accounts Section
              </button>
              <button
                type="button"
                onClick={() => { setEmail('library@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                📚 Library
              </button>
              <button
                type="button"
                onClick={() => { setEmail('disciplinary@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all text-left"
              >
                ⚖️ Disciplinary
              </button>
              <button
                type="button"
                onClick={() => { setEmail('bus@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all text-left"
              >
                🚌 Bus / Transport
              </button>
              <button
                type="button"
                onClick={() => { setEmail('ci@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                📋 Class Incharge
              </button>
              <button
                type="button"
                onClick={() => { setEmail('hod@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                👨‍💼 HOD
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('deptadmin@sbjit.edu.in'); setPassword('Password123!'); }}
                className="py-2 px-3 bg-canvas hover:bg-surface-hover border border-border-subtle text-ink-primary rounded-md text-xs font-medium transition-all"
              >
                ⚙️ Dept Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-ink-muted border-t border-border-subtle pt-4">
            Official college portal: <strong>@sbjit.edu.in</strong>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-subtle rounded-md shadow-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-base font-semibold text-ink-primary">
              {forgotStep === 1 ? 'Reset Password' : 'Set New Password'}
            </h2>
            <p className="text-xs text-ink-secondary">
              {forgotStep === 1
                ? 'Enter your registered college email (@sbjit.edu.in) to proceed.'
                : `Setting new password for ${forgotEmail}`}
            </p>

            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-status-rejected">
                {forgotError}
              </div>
            )}

            {forgotMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 flex items-center gap-1.5">
                <HiOutlineCheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <div>
                <label htmlFor="forgot-email" className="label-base">
                  Institutional Email
                </label>
                <input
                  id="forgot-email"
                  name="forgotEmail"
                  type="email"
                  autoComplete="email"
                  className="input-base"
                  placeholder="you@sbjit.edu.in"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-password" className="label-base">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-base pr-10"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-secondary"
                    >
                      {showNewPassword ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {newPassword && (
                  <div className="p-3 bg-canvas border border-border-subtle rounded-md space-y-1 text-xs">
                    <div className="font-semibold text-ink-secondary flex items-center gap-1">
                      <HiOutlineShieldCheck className="w-3.5 h-3.5 text-brand" />
                      <span>Password Requirements:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className={passwordChecks.length ? 'text-status-approved font-medium' : 'text-ink-muted'}>
                        {passwordChecks.length ? '✓' : '•'} 8+ characters
                      </span>
                      <span className={passwordChecks.upper ? 'text-status-approved font-medium' : 'text-ink-muted'}>
                        {passwordChecks.upper ? '✓' : '•'} Uppercase (A-Z)
                      </span>
                      <span className={passwordChecks.lower ? 'text-status-approved font-medium' : 'text-ink-muted'}>
                        {passwordChecks.lower ? '✓' : '•'} Lowercase (a-z)
                      </span>
                      <span className={passwordChecks.number ? 'text-status-approved font-medium' : 'text-ink-muted'}>
                        {passwordChecks.number ? '✓' : '•'} Number (0-9)
                      </span>
                      <span className={passwordChecks.special ? 'text-status-approved font-medium' : 'text-ink-muted'}>
                        {passwordChecks.special ? '✓' : '•'} Special char (!@#...)
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="confirm-password" className="label-base">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="input-base"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setForgotOpen(false);
                  setForgotStep(1);
                }}
              >
                Cancel
              </Button>
              {forgotStep === 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={forgotLoading}
                  onClick={handleForgotSubmit}
                >
                  Verify Email
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  loading={forgotLoading}
                  disabled={!isPasswordStrong || !confirmPassword}
                  onClick={handleResetPasswordSubmit}
                >
                  Update Password
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
