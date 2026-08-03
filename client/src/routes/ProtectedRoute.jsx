import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD_ROUTES } from '../utils/constants';

/**
 * ProtectedRoute — guards routes by authentication and role.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected page content
 * @param {string[]} [props.allowedRoles] - Array of roles that can access this route.
 *   If omitted, any authenticated user can access.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Still verifying auth — show nothing (avoids flash)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check — if allowedRoles specified and user's role isn't in the list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's own dashboard instead of showing a 403
    const dashboardRoute = ROLE_DASHBOARD_ROUTES[user.role] || '/login';
    return <Navigate to={dashboardRoute} replace />;
  }

  return children;
}
