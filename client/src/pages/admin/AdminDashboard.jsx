import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineUsers,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineArrowRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';

function StatCard({ icon, label, value, loading, color }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand',
    success: 'bg-green-50 text-green-600',
    pending: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-md p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${colorMap[color] || colorMap.brand}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-7 w-16 bg-canvas rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-ink-primary font-tabular">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  {
    label: 'Manage Programs',
    description: 'Create and configure academic programs',
    to: '/admin/programs',
    icon: <HiOutlineAcademicCap className="w-5 h-5" />,
  },
  {
    label: 'Manage Users',
    description: 'Add students, teachers, and staff',
    to: '/admin/users',
    icon: <HiOutlineUsers className="w-5 h-5" />,
  },
  {
    label: 'Configure Clearance Items',
    description: 'Set up subjects, labs, and electives',
    to: '/admin/clearance-items',
    icon: <HiOutlineCog6Tooth className="w-5 h-5" />,
  },
  {
    label: 'Manage Semesters',
    description: 'Create and configure semesters',
    to: '/admin/semesters',
    icon: <HiOutlineCalendarDays className="w-5 h-5" />,
  },
  {
    label: 'Manage Batches',
    description: 'Create batches and assign students',
    to: '/admin/batches',
    icon: <HiOutlineClipboardDocumentList className="w-5 h-5" />,
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    programs: 0,
    semesters: 0,
    users: 0,
    clearanceRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const [programsRes, semestersRes, usersRes] = await Promise.all([
          api.get('/admin/programs'),
          api.get('/admin/semesters'),
          api.get('/admin/users', { params: { limit: 1 } }),
        ]);

        setStats({
          programs: Array.isArray(programsRes.data.data)
            ? programsRes.data.data.length
            : programsRes.data.data?.total || 0,
          semesters: Array.isArray(semestersRes.data.data)
            ? semestersRes.data.data.length
            : semestersRes.data.data?.total || 0,
          users: usersRes.data.data?.total || usersRes.data.data?.pagination?.total || 0,
          clearanceRequests: usersRes.data.data?.activeClearanceRequests || 0,
        });
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<HiOutlineAcademicCap className="w-5 h-5" />}
          label="Programs"
          value={stats.programs}
          loading={loading}
          color="brand"
        />
        <StatCard
          icon={<HiOutlineCalendarDays className="w-5 h-5" />}
          label="Semesters"
          value={stats.semesters}
          loading={loading}
          color="info"
        />
        <StatCard
          icon={<HiOutlineUsers className="w-5 h-5" />}
          label="Total Users"
          value={stats.users}
          loading={loading}
          color="success"
        />
        <StatCard
          icon={<HiOutlineClipboardDocumentList className="w-5 h-5" />}
          label="Active Clearances"
          value={stats.clearanceRequests}
          loading={loading}
          color="pending"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-2">
        <h2 className="text-base font-semibold text-ink-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-4 p-4 bg-surface border border-border-subtle rounded-md shadow-sm hover:border-brand/30 transition-colors duration-150"
            >
              <div className="w-10 h-10 rounded-md bg-brand-50 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors duration-150">
                {action.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">{action.label}</p>
                <p className="text-xs text-ink-muted mt-0.5">{action.description}</p>
              </div>
              <HiOutlineArrowRight className="w-4 h-4 text-ink-muted group-hover:text-brand transition-colors duration-150 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
