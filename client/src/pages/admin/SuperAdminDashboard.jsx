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
  HiOutlineCalendarDays,
  HiOutlinePlus,
  HiOutlineCheckCircle,
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
    <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow">
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

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    programs: 0,
    deptAdmins: 0,
    students: 0,
    activeSemesters: 0,
  });
  const [programsList, setProgramsList] = useState([]);
  const [semestersList, setSemestersList] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [programsRes, usersRes, semestersRes, auditRes] = await Promise.all([
          api.get('/admin/programs'),
          api.get('/admin/users', { params: { limit: 500 } }),
          api.get('/admin/semesters'),
          api.get('/admin/audit-logs', { params: { limit: 5 } }),
        ]);

        const rawPrograms = Array.isArray(programsRes.data.data)
          ? programsRes.data.data
          : programsRes.data.data?.programs || [];

        const usersList = Array.isArray(usersRes.data.data?.users)
          ? usersRes.data.data.users
          : Array.isArray(usersRes.data.data)
          ? usersRes.data.data
          : [];

        const rawSemesters = Array.isArray(semestersRes.data.data)
          ? semestersRes.data.data
          : semestersRes.data.data?.semesters || [];

        const deptAdminsCount = usersList.filter(
          (u) => u.role === 'admin' || u.role === 'hod'
        ).length;

        const studentsCount = usersList.filter((u) => u.role === 'student').length;

        const activeSemestersCount = rawSemesters.filter(
          (s) => s.status === 'active' || s.isActive
        ).length || rawSemesters.length;

        setStats({
          programs: rawPrograms.length,
          deptAdmins: deptAdminsCount,
          students: studentsCount,
          activeSemesters: activeSemestersCount,
        });

        setProgramsList(rawPrograms);
        setSemestersList(rawSemesters);
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
              Centralized oversight across academic departments, branch leadership assignments, and college-wide clearance pipelines.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/admin/programs"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-indigo-900 font-semibold text-xs rounded-lg shadow-sm hover:bg-indigo-50 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span>New Program</span>
            </Link>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg transition-colors border border-white/20"
            >
              <HiOutlineShieldCheck className="w-4 h-4" />
              <span>Manage Admins</span>
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

      {/* Meaningful Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<HiOutlineAcademicCap className="w-6 h-6" />}
          label="Academic Programs"
          value={stats.programs}
          loading={loading}
          color="brand"
          subtext="Configured degree branches"
        />
        <StatCard
          icon={<HiOutlineShieldCheck className="w-6 h-6" />}
          label="Dept Admins & HODs"
          value={stats.deptAdmins}
          loading={loading}
          color="purple"
          subtext="Branch academic coordinators"
        />
        <StatCard
          icon={<HiOutlineUsers className="w-6 h-6" />}
          label="Enrolled Students"
          value={stats.students}
          loading={loading}
          color="info"
          subtext="Registered across departments"
        />
        <StatCard
          icon={<HiOutlineCalendarDays className="w-6 h-6" />}
          label="Active Semesters"
          value={stats.activeSemesters}
          loading={loading}
          color="success"
          subtext="Ongoing academic terms"
        />
      </div>

      {/* College Programs & Department Governance Table */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <HiOutlineAcademicCap className="w-5 h-5 text-brand" />
              College Programs & Department Leadership
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Academic departments, degrees, and their designated Department Administrators
            </p>
          </div>
          <Link
            to="/admin/programs"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Manage All Programs</span>
            <HiOutlineArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-canvas rounded-lg animate-pulse" />
            ))}
          </div>
        ) : programsList.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-ink-primary">No academic programs configured yet</p>
            <p className="text-xs text-ink-muted mt-1">Get started by adding your institution&apos;s degree programs.</p>
            <Link
              to="/admin/programs"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand/90"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add First Program
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-ink-muted uppercase font-semibold text-2xs tracking-wider">
                  <th className="py-2.5 px-3">Program Code</th>
                  <th className="py-2.5 px-3">Degree & Title</th>
                  <th className="py-2.5 px-3">Department Admin</th>
                  <th className="py-2.5 px-3">Head of Department (HOD)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {programsList.map((prog) => {
                  const deptAdmin = prog.departmentAdminId;
                  const hod = prog.hodId;

                  return (
                    <tr key={prog._id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-ink-primary bg-brand-50 text-brand px-2 py-1 rounded border border-brand/20">
                          {prog.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-ink-primary">{prog.name}</p>
                        <p className="text-2xs text-ink-muted mt-0.5">
                          {prog.degree || 'B.Tech'} • {prog.totalSemesters || 8} Semesters
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        {deptAdmin ? (
                          <div>
                            <p className="font-semibold text-ink-primary">{deptAdmin.name}</p>
                            <p className="text-2xs text-ink-muted font-mono">{deptAdmin.email}</p>
                          </div>
                        ) : (
                          <span className="text-2xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {hod ? (
                          <div>
                            <p className="font-semibold text-ink-primary">{hod.name}</p>
                            <p className="text-2xs text-ink-muted font-mono">{hod.email}</p>
                          </div>
                        ) : (
                          <span className="text-2xs text-ink-muted bg-canvas px-2 py-0.5 rounded border border-border-subtle">
                            Institutional Default
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={prog.isActive !== false ? 'success' : 'neutral'} size="sm">
                          {prog.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to="/admin/programs"
                          className="text-2xs font-semibold text-brand hover:underline"
                        >
                          Configure →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-Column Quick Access & Security Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Executive Links */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-primary mb-1 flex items-center gap-2">
              <HiOutlineBuildingLibrary className="w-4 h-4 text-brand" />
              Institutional Clearance Oversight
            </h3>
            <p className="text-xs text-ink-muted mb-4">
              Inspect student clearance certificates, department completion ratios, and physical report records.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-border-subtle">
            <Link
              to="/admin/clearance-report"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand/90 transition-colors"
            >
              <span>Open Clearance Reports</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-canvas text-ink-secondary hover:text-ink-primary text-xs font-semibold rounded-lg border border-border-subtle transition-colors"
            >
              <span>Manage Admins & Staff</span>
            </Link>
          </div>
        </div>

        {/* Security & System Activity Status */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
                <HiOutlineShieldCheck className="w-4 h-4 text-purple-600" />
                Security & Audit Status
              </h3>
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                <HiOutlineCheckCircle className="w-3 h-3" />
                Audit Trail Active
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              All logins, role changes, clearance approvals, and certificate generations are immutably logged.
            </p>
            {recentLogs.length > 0 && (
              <div className="p-2.5 bg-canvas rounded-lg border border-border-subtle text-2xs text-ink-secondary font-mono flex items-center justify-between">
                <span className="truncate">Latest: {recentLogs[0]?.action} ({recentLogs[0]?.userId?.email || 'System'})</span>
                <span className="text-ink-muted shrink-0 ml-2">{new Date(recentLogs[0]?.createdAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
            <span className="text-2xs text-ink-muted">Tamper-proof server audit log</span>
            <Link
              to="/super-admin/audit"
              className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1"
            >
              <span>View Full Audit Logs</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
