import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineAcademicCap,
  HiOutlineUsers,
  HiOutlineClipboardDocumentList,
  HiOutlineShieldCheck,
  HiOutlineBuildingLibrary,
  HiOutlineArrowRight,
  HiOutlineExclamationTriangle,
  HiOutlineChartBar,
  HiOutlineClock,
} from 'react-icons/hi2';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/common/Badge';

function StatCard({ icon, label, value, loading, color, subtext }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand',
    success: 'bg-green-50 text-green-600',
    pending: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0 ${colorMap[color] || colorMap.brand}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-7 w-20 bg-canvas rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-ink-primary font-tabular mt-0.5">{value}</p>
          )}
          {subtext && <p className="text-2xs text-ink-muted mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

const superAdminActions = [
  {
    label: 'Manage College Programs',
    description: 'Create & configure branches (CSE, AIML, Mechanical, ECE)',
    to: '/admin/programs',
    icon: <HiOutlineAcademicCap className="w-6 h-6 text-brand" />,
    badge: 'College-wide',
  },
  {
    label: 'Manage Admins & Staff',
    description: 'Create Department Admins, HODs, and Central Section Heads',
    to: '/admin/users',
    icon: <HiOutlineShieldCheck className="w-6 h-6 text-blue-600" />,
    badge: 'Access Control',
  },
  {
    label: 'System Audit Logs',
    description: 'Live security trail, logins, approval logs, and role changes',
    to: '/super-admin/audit',
    icon: <HiOutlineClipboardDocumentList className="w-6 h-6 text-purple-600" />,
    badge: 'Security',
  },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    programs: 0,
    deptAdmins: 0,
    totalUsers: 0,
    activeClearances: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [programsRes, usersRes, auditRes] = await Promise.all([
          api.get('/admin/programs'),
          api.get('/admin/users', { params: { limit: 100 } }),
          api.get('/admin/audit-logs', { params: { limit: 5 } }),
        ]);

        const usersList = Array.isArray(usersRes.data.data?.users)
          ? usersRes.data.data.users
          : Array.isArray(usersRes.data.data)
          ? usersRes.data.data
          : [];

        const deptAdminsCount = usersList.filter((u) => u.role === 'admin').length;

        setStats({
          programs: Array.isArray(programsRes.data.data)
            ? programsRes.data.data.length
            : programsRes.data.data?.total || 0,
          deptAdmins: deptAdminsCount,
          totalUsers: usersRes.data.data?.pagination?.total || usersList.length,
          activeClearances: usersRes.data.data?.activeClearanceRequests || 0,
        });

        setRecentLogs(auditRes.data.data?.logs || []);
      } catch (err) {
        setError(err.message || 'Failed to load Super Admin dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <DashboardLayout title="Super Admin Dashboard">
      {/* Welcome Banner */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-brand text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-2">
              👑 Institutional Root Authority
            </div>
            <h1 className="text-2xl font-black font-display tracking-wide">
              College Executive & IT Control Center
            </h1>
            <p className="text-sm text-indigo-100/90 mt-1 max-w-xl">
              Manage all department scopes, assign Department Admins, oversee institution-wide clearance pipelines, and monitor live audit trails.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin/programs"
              className="px-4 py-2.5 bg-white text-indigo-900 font-semibold text-xs rounded-lg shadow-sm hover:bg-indigo-50 transition-colors"
            >
              + New Program
            </Link>
            <Link
              to="/admin/users"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg transition-colors border border-white/20"
            >
              + Create Admin
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <HiOutlineExclamationTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<HiOutlineAcademicCap className="w-6 h-6" />}
          label="College Programs"
          value={stats.programs}
          loading={loading}
          color="brand"
          subtext="Branches (B.Tech, M.Tech)"
        />
        <StatCard
          icon={<HiOutlineShieldCheck className="w-6 h-6" />}
          label="Department Admins"
          value={stats.deptAdmins}
          loading={loading}
          color="purple"
          subtext="Scoped branch managers"
        />
        <StatCard
          icon={<HiOutlineUsers className="w-6 h-6" />}
          label="Total Institutional Users"
          value={stats.totalUsers}
          loading={loading}
          color="info"
          subtext="Students, Faculty & Heads"
        />
        <StatCard
          icon={<HiOutlineClipboardDocumentList className="w-6 h-6" />}
          label="Audit Log Entries"
          value={recentLogs.length > 0 ? 'Active' : 'Standby'}
          loading={loading}
          color="success"
          subtext="Real-time security trail"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-ink-primary mb-4 flex items-center gap-2">
          <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
          Super Admin Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {superAdminActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="bg-surface border border-border-subtle hover:border-brand/50 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-canvas flex items-center justify-center">
                    {action.icon}
                  </div>
                  <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-canvas text-ink-muted border border-border-subtle">
                    {action.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ink-primary group-hover:text-brand transition-colors">
                  {action.label}
                </h3>
                <p className="text-xs text-ink-muted mt-1">{action.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-brand mt-4 pt-3 border-t border-border-subtle/50">
                <span>Configure</span>
                <HiOutlineArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent System Audit Logs Widget */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HiOutlineClock className="w-5 h-5 text-ink-muted" />
            <h2 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
              Live System Activity & Audit Trail
            </h2>
          </div>
          <Link
            to="/super-admin/audit"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
          >
            <span>View All Logs</span>
            <HiOutlineArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-canvas rounded animate-pulse" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-xs text-ink-muted py-4 text-center">
            No recent audit logs recorded. Actions like clearances, logins, and approvals will appear here.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {recentLogs.map((log) => (
              <div key={log._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  <span className="font-semibold text-ink-primary truncate">
                    {log.userId?.name || 'System'}
                  </span>
                  <span className="text-ink-muted truncate">
                    ({log.userId?.email || 'N/A'})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle font-mono text-2xs text-ink-secondary">
                    {log.action}
                  </span>
                </div>
                <span className="text-ink-muted shrink-0 text-2xs font-mono">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
