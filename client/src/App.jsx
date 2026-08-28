import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { ROLES, ROLE_DASHBOARD_ROUTES } from './utils/constants';
import ProtectedRoute from './routes/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// ─── Lazy-loaded Pages ───
import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentSubmissions = lazy(() => import('./pages/student/StudentSubmissions'));
const StudentClearance = lazy(() => import('./pages/student/StudentClearance'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const SubmissionItems = lazy(() => import('./pages/teacher/SubmissionItems'));
const TeacherStudentSubmissions = lazy(() => import('./pages/teacher/StudentSubmissions'));
const ItemClearances = lazy(() => import('./pages/teacher/ItemClearances'));

// Section Head
const SectionHeadDashboard = lazy(() => import('./pages/section-head/SectionHeadDashboard'));

// Account Section
const AccountSectionDashboard = lazy(() => import('./pages/account-section/AccountSectionDashboard'));

// Bus Section
const BusSectionDashboard = lazy(() => import('./pages/bus-section/BusSectionDashboard'));

// Library Section
const LibrarySectionDashboard = lazy(() => import('./pages/library-section/LibrarySectionDashboard'));

// Class Incharge
const ClassInchargeDashboard = lazy(() => import('./pages/class-incharge/ClassInchargeDashboard'));

// HOD
const HODDashboard = lazy(() => import('./pages/hod/HODDashboard'));

// Admin & Super Admin
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Programs = lazy(() => import('./pages/admin/Programs'));
const Semesters = lazy(() => import('./pages/admin/Semesters'));
const Batches = lazy(() => import('./pages/admin/Batches'));
const Users = lazy(() => import('./pages/admin/Users'));
const ClearanceItems = lazy(() => import('./pages/admin/ClearanceItems'));

// ─── Toaster Config ───
const toasterConfig = {
  position: 'top-right',
  toastOptions: {
    duration: 4000,
    style: {
      background: '#FFFFFF',
      color: '#101828',
      border: '1px solid #E4E7EC',
      borderRadius: '6px',
      fontSize: '14px',
      boxShadow: '0 2px 4px rgba(16, 24, 40, 0.08)',
    },
    success: {
      iconTheme: { primary: '#12B76A', secondary: '#FFFFFF' },
    },
    error: {
      iconTheme: { primary: '#F04438', secondary: '#FFFFFF' },
    },
  },
};

/**
 * AuthRedirect — redirects authenticated users to their dashboard,
 * or shows the provided page for unauthenticated users.
 */
function AuthRedirect({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_DASHBOARD_ROUTES[user.role] || '/login'} replace />;
  }
  return children;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Toaster {...toasterConfig} />

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* ─── Public Routes ─── */}
          <Route
            path="/"
            element={
              <AuthRedirect>
                <LandingPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <LoginPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthRedirect>
                <ForgotPassword />
              </AuthRedirect>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <AuthRedirect>
                <ResetPassword />
              </AuthRedirect>
            }
          />
          <Route
            path="/reset-password"
            element={
              <AuthRedirect>
                <ResetPassword />
              </AuthRedirect>
            }
          />
          {/* ─── Notifications (any authenticated user) ─── */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* ─── Student Routes ─── */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/submissions"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <StudentSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/clearance"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <StudentClearance />
              </ProtectedRoute>
            }
          />

          {/* ─── Teacher Routes ─── */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/submission-items"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <SubmissionItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/student-submissions"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherStudentSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/clearance-reviews"
            element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <ItemClearances />
              </ProtectedRoute>
            }
          />

          {/* ─── Section Head Routes ─── */}
          <Route
            path="/section-head"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SECTION_HEAD]}>
                <SectionHeadDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Account Section Routes ─── */}
          <Route
            path="/account-section"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ACCOUNT_SECTION, ROLES.ADMIN]}>
                <AccountSectionDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Bus Section Routes ─── */}
          <Route
            path="/bus-section"
            element={
              <ProtectedRoute allowedRoles={[ROLES.BUS_SECTION, ROLES.ADMIN]}>
                <BusSectionDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Library Section Routes ─── */}
          <Route
            path="/library-section"
            element={
              <ProtectedRoute allowedRoles={[ROLES.LIBRARY_SECTION, ROLES.SECTION_HEAD, ROLES.ADMIN]}>
                <LibrarySectionDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Class Incharge Routes ─── */}
          <Route
            path="/class-incharge"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CLASS_INCHARGE]}>
                <ClassInchargeDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── HOD Routes ─── */}
          <Route
            path="/hod"
            element={
              <ProtectedRoute allowedRoles={[ROLES.HOD]}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── Super Admin Routes ─── */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/audit"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* ─── Admin Routes ─── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/programs"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <Programs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/semesters"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <Semesters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <Batches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/clearance-items"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <ClearanceItems />
              </ProtectedRoute>
            }
          />

          {/* ─── Catch-all Redirect ─── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
