import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
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
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-semibold">CM</span>
            </div>
            <span className="text-xl font-semibold text-ink-primary">ClearMate</span>
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
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input-base"
                placeholder="you@institution.edu"
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

          {/* Register Link */}
          <div className="mt-6 text-center text-sm text-ink-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
