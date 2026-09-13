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
import collegeBg from '../assets/college-bg.png';
import { ROLE_DASHBOARD_ROUTES } from '../utils/constants';
import Button from '../components/common/Button';
import api from '../api/axios';

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
      const res = await api.post('/auth/forgot-password', { email: clean });
      setForgotMsg(
        res.data?.message ||
          'Password reset link has been dispatched to your email address. Please check your inbox and click the reset link.'
      );
      setForgotError('');
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
      const res = await api.post('/auth/reset-password', { token: resetToken, password: newPassword });
      const data = res.data;

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
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-8 overflow-hidden bg-slate-100">
      {/* Exact Uploaded College Background Photo - Fully natural & clear */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${collegeBg})` }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo Banner */}
        <div className="flex items-center justify-center mb-5">
          <Link
            to="/"
            className="flex items-center justify-center gap-3 px-5 py-2 rounded-full shadow-md group transition-all"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
            }}
          >
            <img src={logoIcon} alt="ClearMate Logo" className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
            <span className="text-xl sm:text-2xl font-extrabold text-[#1e293b] tracking-wide font-display">
              CLEARMATE
            </span>
          </Link>
        </div>

        {/* Frosted Glass Card */}
        <div
          className="rounded-2xl p-6 sm:p-7 transition-all"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          }}
        >
          <h1 className="text-xl font-bold text-[#1e293b] mb-1">Sign in</h1>
          <p className="text-sm text-[#475569] font-medium mb-6">
            Enter your credentials to access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-[#1e293b] mb-1.5 uppercase tracking-wide">
                College Email (@sbjit.edu.in)
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.70)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-[#1e293b] placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:bg-white/90 transition-all"
                placeholder="you@sbjit.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-[#1e293b] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.70)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                  }}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-[#1e293b] placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:bg-white/90 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#475569] hover:text-[#1e293b] transition-colors duration-150"
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
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50/90 border border-red-200 rounded-lg text-sm text-status-rejected font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full font-semibold shadow-md py-2.5"
            >
              Sign in
            </Button>
          </form>

          {/* Quick Demo Login Chips */}
          <div className="mt-6 pt-5 border-t border-white/40 space-y-2.5">
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <span>💡</span> QUICK DEMO LOGIN (@SBJIT.EDU.IN)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Super Admin', icon: '👑', email: 'admin@sbjit.edu.in', pass: 'Admin@123456' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setEmail(item.email);
                    setPassword(item.pass);
                  }}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                  }}
                  className="py-2 px-3 hover:bg-white/90 text-[#1e293b] rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-[#475569] font-medium border-t border-white/40 pt-4">
            Official college portal: <strong>@sbjit.edu.in</strong>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border-subtle rounded-md shadow-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-base font-semibold text-ink-primary">
              Reset Password
            </h2>
            <p className="text-xs text-ink-secondary">
              Enter your registered college email (@sbjit.edu.in) to receive a secure password reset link.
            </p>

            {forgotError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-status-rejected">
                {forgotError}
              </div>
            )}

            {forgotMsg ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-green-900 text-sm">
                    <HiOutlineCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span>Instructions Dispatched!</span>
                  </div>
                  <p className="leading-relaxed">
                    We sent a secure password reset link to <strong>{forgotEmail}</strong>. Please check your inbox (and Spam folder) and click the button in the email to set your new password.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setForgotOpen(false);
                      setForgotMsg('');
                      setForgotEmail('');
                    }}
                  >
                    Got It / Close
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                  <span className="text-[11px] text-ink-muted mt-1 block">
                    Must be your registered @sbjit.edu.in email
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setForgotOpen(false);
                      setForgotError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={forgotLoading}
                    onClick={handleForgotSubmit}
                  >
                    Send Reset Link
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
