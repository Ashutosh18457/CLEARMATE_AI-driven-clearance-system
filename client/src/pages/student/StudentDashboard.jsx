import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
  HiOutlineRocketLaunch,
  HiOutlineArrowRight,
  HiOutlineInboxStack,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_ITEM_TYPE_LABELS,
  CLEARANCE_STATUS_LABELS,
} from '../../utils/constants';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import StatusStepper from '../../components/common/StatusStepper';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';

function StatCard({ icon, label, value, variant = 'default' }) {
  const bgMap = {
    default: 'bg-surface',
    brand: 'bg-brand-50',
    warning: 'bg-amber-50',
    danger: 'bg-red-50',
    success: 'bg-green-50',
  };
  const iconColorMap = {
    default: 'text-ink-muted',
    brand: 'text-brand',
    warning: 'text-status-pending',
    danger: 'text-status-rejected',
    success: 'text-status-success',
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-md p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${bgMap[variant]}`}
      >
        <span className={iconColorMap[variant]}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted truncate">{label}</p>
        <p className="text-xl font-semibold text-ink-primary font-tabular">{value}</p>
      </div>
    </div>
  );
}

function isOverdue(item) {
  if (!item.deadline) return false;
  const isPendingOrSubmitted =
    item.status === SUBMISSION_STATUSES.PENDING ||
    item.status === SUBMISSION_STATUSES.SUBMITTED;
  return isPendingOrSubmitted && new Date(item.deadline) < new Date();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [clearance, setClearance] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingClearance, setLoadingClearance] = useState(true);
  const [error, setError] = useState(null);
  const [initiating, setInitiating] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoadingSubmissions(true);
      const res = await api.get('/submissions/my');
      setSubmissions(res.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  const fetchClearance = useCallback(async () => {
    try {
      setLoadingClearance(true);
      const res = await api.get('/clearances/my');
      setClearance(res.data.data || null);
    } catch (err) {
      // 404 means no clearance exists, which is a valid state
      if (err.status === 404) {
        setClearance(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoadingClearance(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchClearance();
  }, [fetchSubmissions, fetchClearance]);

  const handleInitiateClearance = async () => {
    const semId = user?.currentSemester?._id || user?.currentSemester;
    const isValidObjectId = typeof semId === 'string' && semId.length === 24;
    try {
      setInitiating(true);
      const payload = isValidObjectId ? { semesterId: semId } : {};
      await api.post('/clearances/initiate', payload);
      toast.success('Clearance request initiated successfully');
      fetchClearance();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  // Computed stats
  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter(
    (s) => s.status === SUBMISSION_STATUSES.PENDING || s.status === SUBMISSION_STATUSES.SUBMITTED
  ).length;
  const overdueCount = submissions.filter(isOverdue).length;
  const clearanceStatus = clearance
    ? CLEARANCE_STATUS_LABELS[clearance.status] || clearance.status
    : 'Not Initiated';

  // Recent submissions — last 5
  const recentSubmissions = [...submissions]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  const submissionColumns = [
    {
      key: 'title',
      label: 'Item',
      render: (val, row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{val || row.itemTitle || 'Untitled'}</p>
          {row.clearanceItemTitle && (
            <p className="text-xs text-ink-muted truncate">{row.clearanceItemTitle}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <Badge variant="info">{SUBMISSION_ITEM_TYPE_LABELS[val] || val || '—'}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(val)}>
            {SUBMISSION_STATUS_LABELS[val] || val}
          </Badge>
          {isOverdue(row) && (
            <Badge variant="rejected">Overdue</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (val) => (
        <span className="text-sm text-ink-secondary font-tabular">{formatDate(val)}</span>
      ),
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (val) => (
        <span className="text-sm text-ink-secondary font-tabular">{formatDate(val)}</span>
      ),
    },
  ];

  if (error && !loadingSubmissions && !loadingClearance) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-status-rejected shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load dashboard</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setError(null); fetchSubmissions(); fetchClearance(); }}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<HiOutlineDocumentText className="w-5 h-5" />}
          label="Total Submissions"
          value={loadingSubmissions ? '—' : totalSubmissions}
          variant="brand"
        />
        <StatCard
          icon={<HiOutlineClock className="w-5 h-5" />}
          label="Pending"
          value={loadingSubmissions ? '—' : pendingCount}
          variant="warning"
        />
        <StatCard
          icon={<HiOutlineExclamationTriangle className="w-5 h-5" />}
          label="Overdue"
          value={loadingSubmissions ? '—' : overdueCount}
          variant="danger"
        />
        <StatCard
          icon={<HiOutlineShieldCheck className="w-5 h-5" />}
          label="Clearance"
          value={loadingClearance ? '—' : clearanceStatus}
          variant="success"
        />
      </div>

      {/* Clearance Status Section */}
      <section className="bg-surface border border-border-subtle rounded-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ink-primary">Clearance Status</h2>
          {clearance && (
            <Button
              variant="ghost"
              size="sm"
              icon={<HiOutlineArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/student/clearance')}
            >
              View Details
            </Button>
          )}
        </div>

        {loadingClearance ? (
          <Skeleton rows={2} columns={6} />
        ) : clearance ? (
          <StatusStepper status={clearance.status} remarks={clearance.remarks} />
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <HiOutlineRocketLaunch className="w-6 h-6 text-brand" />
            </div>
            <p className="text-sm font-medium text-ink-primary mb-1">
              No clearance request found
            </p>
            <p className="text-sm text-ink-muted mb-4">
              Initiate your clearance request to begin the process.
            </p>
            <Button
              variant="primary"
              loading={initiating}
              onClick={handleInitiateClearance}
              icon={<HiOutlineRocketLaunch className="w-4 h-4" />}
            >
              Initiate Clearance
            </Button>
          </div>
        )}
      </section>

      {/* Recent Submissions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-ink-primary">Recent Submissions</h2>
          <Button
            variant="ghost"
            size="sm"
            icon={<HiOutlineArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/student/submissions')}
          >
            View All
          </Button>
        </div>

        <Table
          columns={submissionColumns}
          data={recentSubmissions}
          loading={loadingSubmissions}
          emptyMessage="No submissions yet"
          emptyIcon={<HiOutlineInboxStack className="w-10 h-10" />}
        />
      </section>
    </DashboardLayout>
  );
}
