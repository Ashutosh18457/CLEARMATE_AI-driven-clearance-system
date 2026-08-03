import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD_ROUTES } from '../utils/constants';
import Button from '../components/common/Button';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      };

      if (role === 'student' && enrollmentNo.trim()) {
        payload.enrollmentNo = enrollmentNo.trim();
      }

      const user = await register(payload);
      navigate(ROLE_DASHBOARD_ROUTES[user.role] || '/');
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Registration failed. Please try again.'
      );
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
        <div className="bg-surface border border-border-subtle rounded-md shadow-sm p-6">
          <h1 className="text-lg font-semibold text-ink-primary mb-1">Create an Account</h1>
          <p className="text-sm text-ink-muted mb-6">
            Register to request clearance and access your dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="label-base">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                required
                className="input-base"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label-base">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                required
                className="input-base"
                placeholder="you@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label-base">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-base pr-10"
                  placeholder="At least 8 characters"
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

            {/* Role Selection */}
            <div>
              <label htmlFor="reg-role" className="label-base">
                Account Role <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-role"
                className="input-base"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="class_incharge">Class Incharge</option>
                <option value="hod">HOD</option>
                <option value="section_head">Section Head</option>
              </select>
            </div>

            {/* Enrollment No (Conditional for Student) */}
            {role === 'student' && (
              <div>
                <label htmlFor="reg-enrollment" className="label-base">
                  Enrollment / Roll Number
                </label>
                <input
                  id="reg-enrollment"
                  type="text"
                  className="input-base"
                  placeholder="e.g. EN2024001"
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full"
            >
              Register & Sign in
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
