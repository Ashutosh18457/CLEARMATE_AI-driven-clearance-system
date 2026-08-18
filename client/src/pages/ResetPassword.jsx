import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import Button from '../components/common/Button';

export default function ResetPassword() {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const token = paramToken || queryToken || '';

  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDone, setIsDone] = useState(false);

  // Password rules validation
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Missing password reset token. Please request a new link.');
      return;
    }

    if (!isPasswordStrong) {
      setErrorMsg(
        'Password does not meet the security requirements (min 8 characters, uppercase, lowercase, number, special character).'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || 'Password reset token is invalid or has expired (15-minute limit).'
        );
      }

      setIsDone(true);
      setSuccessMsg(
        data.message || 'Password successfully updated! You can now log in.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-semibold">CM</span>
            </div>
            <span className="text-xl font-semibold text-ink-primary">ClearMate</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border-subtle rounded-md shadow-sm p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-ink-primary mb-1">Set New Password</h1>
          <p className="text-sm text-ink-muted mb-6">
            Create a strong, secure password for your ClearMate institutional account.
          </p>

          {/* Success Screen */}
          {isDone ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <HiOutlineCheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink-primary">Password Reset Successful</h3>
                <p className="text-sm text-ink-muted mt-1">{successMsg}</p>
                <p className="text-xs text-brand font-medium mt-3">Redirecting to sign in page in 3 seconds...</p>
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full mt-2"
                onClick={() => navigate('/login')}
              >
                Go to Sign in Now
              </Button>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 mb-5 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected space-y-2">
                  <div className="flex items-start gap-2">
                    <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  {errorMsg.toLowerCase().includes('expire') && (
                    <div className="pt-2 border-t border-red-200">
                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-status-rejected hover:underline"
                      >
                        Click here to request a fresh reset link &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label htmlFor="reset-new-password" className="label-base">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="input-base pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-secondary"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <HiOutlineEyeSlash className="w-5 h-5" />
                      ) : (
                        <HiOutlineEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {password && (
                  <div className="p-3 bg-canvas border border-border-subtle rounded-md space-y-1.5 text-xs">
                    <div className="font-semibold text-ink-secondary flex items-center gap-1">
                      <HiOutlineShieldCheck className="w-4 h-4 text-brand" />
                      <span>Security Checklist:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className={passwordChecks.length ? 'text-status-approved' : 'text-ink-muted'}>
                        {passwordChecks.length ? '✓' : '•'} At least 8 characters
                      </span>
                      <span className={passwordChecks.upper ? 'text-status-approved' : 'text-ink-muted'}>
                        {passwordChecks.upper ? '✓' : '•'} Uppercase letter (A-Z)
                      </span>
                      <span className={passwordChecks.lower ? 'text-status-approved' : 'text-ink-muted'}>
                        {passwordChecks.lower ? '✓' : '•'} Lowercase letter (a-z)
                      </span>
                      <span className={passwordChecks.number ? 'text-status-approved' : 'text-ink-muted'}>
                        {passwordChecks.number ? '✓' : '•'} Number (0-9)
                      </span>
                      <span className={passwordChecks.special ? 'text-status-approved' : 'text-ink-muted'}>
                        {passwordChecks.special ? '✓' : '•'} Special char (!@#$...)
                      </span>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div>
                  <label htmlFor="reset-confirm-password" className="label-base">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="input-base pr-10"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink-secondary"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? (
                        <HiOutlineEyeSlash className="w-5 h-5" />
                      ) : (
                        <HiOutlineEye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  disabled={!isPasswordStrong || !confirmPassword}
                  className="w-full"
                >
                  Update & Save Password
                </Button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 pt-5 border-t border-border-subtle text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-brand transition-colors"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" />
                  Back to Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
