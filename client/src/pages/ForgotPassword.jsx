import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi2';
import Button from '../components/common/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setResetLink('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your institutional email address.');
      return;
    }

    if (!cleanEmail.endsWith('@sbjit.edu.in')) {
      setErrorMsg('Only official college domain (@sbjit.edu.in) is allowed.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process request.');
      }

      setSuccessMsg(
        data.message || 'Password reset link has been dispatched to your email address.'
      );
      
      // Store token link in development mode for easy testing
      if (data.data?.resetToken || data.data?.resetUrl) {
        setResetLink(data.data.resetUrl || `/reset-password/${data.data.resetToken}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
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
          <h1 className="text-lg font-semibold text-ink-primary mb-1">Forgot Password</h1>
          <p className="text-sm text-ink-muted mb-6">
            Enter your official institutional email address (<strong className="text-ink-primary">@sbjit.edu.in</strong>). We will send you a secure link to reset your password.
          </p>

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 mb-5 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <HiOutlineCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span>Instructions Dispatched</span>
              </div>
              <p className="text-xs text-green-700 leading-relaxed">
                {successMsg}
              </p>
              {resetLink && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-ink-muted mb-1">🔗 <strong>Quick Link (Development):</strong></p>
                  <Link
                    to={resetLink}
                    className="text-xs text-brand font-semibold hover:underline break-all"
                  >
                    Click here to proceed with password reset &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 mb-5 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected flex items-start gap-2">
              <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="label-base">
                College Email Address
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-base"
                placeholder="you@sbjit.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <span className="text-xs text-ink-muted mt-1 block">
                Must be an active institutional account ending with @sbjit.edu.in
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
            >
              Send Reset Link
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
        </div>
      </div>
    </div>
  );
}
