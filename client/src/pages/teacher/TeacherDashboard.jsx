import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlineArrowRight,
  HiOutlineExclamationTriangle,
  HiOutlineClipboardDocumentCheck,
  HiOutlineSparkles,
  HiOutlineAcademicCap,
  HiOutlineArrowPath,
  HiOutlineBolt,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { SUBMISSION_ITEM_TYPE_LABELS } from '../../utils/constants';

function StatCard({ icon, label, value, subtext, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    success: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all">
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-semibold text-ink-muted uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-ink-primary font-tabular mt-0.5">{value}</p>
          {subtext && <p className="text-2xs text-ink-muted mt-0.5 truncate">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { socket } = useSocket() || {};
  const navigate = useNavigate();

  const [pendingClearances, setPendingClearances] = useState([]);
  const [submissionItems, setSubmissionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clearancesRes, itemsRes] = await Promise.all([
        api.get('/clearances/items/pending').catch(() => ({ data: { data: [] } })),
        api.get('/submissions/items').catch(() => ({ data: { data: [] } })),
      ]);
      setPendingClearances(clearancesRes.data.data || []);
      setSubmissionItems(itemsRes.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load faculty dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time socket updates for faculty
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchData();
    };
    socket.on('clearance_initiated', handleUpdate);
    socket.on('submission_created', handleUpdate);
    socket.on('new_notification', handleUpdate);

    return () => {
      socket.off('clearance_initiated', handleUpdate);
      socket.off('submission_created', handleUpdate);
      socket.off('new_notification', handleUpdate);
    };
  }, [socket, fetchData]);

  const totalItems = submissionItems.length;
  const pendingReviews = pendingClearances.length;
  const totalSubmissions = submissionItems.reduce((acc, item) => {
    return acc + (item.submissionCount || 0);
  }, 0);

  if (error && !submissionItems.length && !pendingClearances.length) {
    return (
      <DashboardLayout title="Faculty Evaluation Dashboard">
        <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border-subtle rounded-2xl p-6">
          <HiOutlineExclamationTriangle className="w-10 h-10 text-status-rejected mb-3" />
          <p className="text-sm text-ink-secondary mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData} icon={<HiOutlineArrowPath className="w-4 h-4" />}>
            Retry Data Sync
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Faculty Evaluation & Coursework Hub">
      {/* Header Banner */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-900 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-2">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-300" />
              Teacher & Evaluator Portal
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight">
              Faculty Coursework & Clearance Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Evaluate student laboratory submissions, configure assignments & deadlines, and approve Stage 1 Subject Clearances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="!bg-white/10 hover:!bg-white/20 !text-white !border-white/20 text-xs"
              icon={<HiOutlinePlusCircle className="w-4 h-4" />}
              onClick={() => navigate('/teacher/submission-items')}
            >
              + New Assignment/Lab
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="!bg-brand hover:!bg-brand-600 text-white font-bold text-xs"
              icon={<HiOutlineClipboardDocumentCheck className="w-4 h-4" />}
              onClick={() => navigate('/teacher/item-clearances')}
            >
              Review Clearances ({pendingReviews})
            </Button>
          </div>
        </div>
      </div>
      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<HiOutlineDocumentText className="w-6 h-6" />}
          label="Submission Items"
          value={loading ? '—' : totalItems}
          color="brand"
          subtext="Configured assignments & labs"
        />
        <StatCard
          icon={<HiOutlineClock className="w-6 h-6" />}
          label="Stage 1 Clearances Pending"
          value={loading ? '—' : pendingReviews}
          color={pendingReviews > 0 ? 'warning' : 'success'}
          subtext={pendingReviews > 0 ? 'Action required for student clearance' : 'All subject clearances reviewed'}
        />
        <StatCard
          icon={<HiOutlineCheckCircle className="w-6 h-6" />}
          label="Total Student Submissions"
          value={loading ? '—' : totalSubmissions}
          color="success"
          subtext="Coursework records submitted"
        />
      </div>

      {/* 2-Column Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Clearance Reviews Card */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <HiOutlineClipboardDocumentCheck className="w-5 h-5 text-brand" />
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
                  Pending Clearance Reviews (Stage 1)
                </h2>
              </div>
              {pendingClearances.length > 0 && (
                <Link
                  to="/teacher/item-clearances"
                  className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
                >
                  View all ({pendingClearances.length}) <HiOutlineArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="divide-y divide-border-subtle">
              {loading ? (
                <div className="p-4">
                  <Skeleton rows={3} columns={1} />
                </div>
              ) : pendingClearances.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineCheckCircle className="w-8 h-8 text-status-success" />}
                  title="No Pending Clearance Reviews"
                  description="All student subject clearance requests have been reviewed and approved."
                />
              ) : (
                pendingClearances.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-4 hover:bg-canvas/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-ink-primary truncate">
                          {item.studentId?.name || item.studentName || 'Student'}
                        </p>
                        {item.studentId?.enrollmentNo && (
                          <span className="font-mono text-2xs px-1.5 py-0.2 bg-canvas border border-border-subtle rounded text-ink-secondary">
                            {item.studentId.enrollmentNo}
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-ink-muted truncate mt-0.5">
                        {item.itemTitle || item.clearanceItemId?.title || 'Subject Item'} • {item.studentId?.section ? `Sec ${item.studentId.section}` : 'General'}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => navigate('/teacher/item-clearances')}
                      className="shrink-0 text-2xs"
                    >
                      Review →
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-canvas/30 border-t border-border-subtle text-2xs text-ink-muted flex items-center justify-between">
            <span>Stage 1 Faculty Subject Approvals</span>
            <Link to="/teacher/item-clearances" className="text-brand font-semibold hover:underline">
              Open Review Queue
            </Link>
          </div>
        </div>

        {/* Active Submission Items Card */}
        <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <HiOutlineDocumentText className="w-5 h-5 text-brand" />
                <h2 className="text-sm font-bold text-ink-primary uppercase tracking-wide">
                  Active Coursework & Lab Tasks
                </h2>
              </div>
              {submissionItems.length > 0 && (
                <Link
                  to="/teacher/submission-items"
                  className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
                >
                  Manage items ({submissionItems.length}) <HiOutlineArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="divide-y divide-border-subtle">
              {loading ? (
                <div className="p-4">
                  <Skeleton rows={3} columns={1} />
                </div>
              ) : submissionItems.length === 0 ? (
                <EmptyState
                  icon={<HiOutlineDocumentText className="w-8 h-8 text-ink-muted" />}
                  title="No Submission Items Created"
                  description="Create assignment items and practical lab records for your students."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/teacher/submission-items')}
                    >
                      Create Submission Item
                    </Button>
                  }
                />
              ) : (
                submissionItems.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-4 hover:bg-canvas/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-xs font-bold text-ink-primary truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xs text-ink-muted capitalize">
                          {SUBMISSION_ITEM_TYPE_LABELS[item.type] || item.type}
                        </span>
                        {item.deadline && (
                          <span className="text-2xs text-ink-muted font-tabular">
                            • Due: {new Date(item.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand shrink-0">
                      {item.submissionCount ?? 0} submitted
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-canvas/30 border-t border-border-subtle text-2xs text-ink-muted flex items-center justify-between">
            <span>Deadlines & Submissions Setup</span>
            <Link to="/teacher/submission-items" className="text-brand font-semibold hover:underline">
              View All Coursework
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
