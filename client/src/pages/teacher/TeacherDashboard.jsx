import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlineArrowRight,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { SUBMISSION_ITEM_TYPE_LABELS } from '../../utils/constants';

export default function TeacherDashboard() {
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
        api.get('/clearances/items/pending'),
        api.get('/submissions/items'),
      ]);
      setPendingClearances(clearancesRes.data.data || []);
      setSubmissionItems(itemsRes.data.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalItems = submissionItems.length;
  const pendingReviews = pendingClearances.length;
  const verifiedCount = submissionItems.reduce((acc, item) => {
    return acc + (item.submissionCount || 0);
  }, 0);

  const stats = [
    {
      label: 'Submission Items',
      value: totalItems,
      icon: HiOutlineDocumentText,
      color: 'text-brand bg-brand-50',
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews,
      icon: HiOutlineClock,
      color: 'text-status-pending bg-amber-50',
    },
    {
      label: 'Total Submissions',
      value: verifiedCount,
      icon: HiOutlineCheckCircle,
      color: 'text-status-success bg-green-50',
    },
  ];

  if (error && !submissionItems.length && !pendingClearances.length) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-16">
          <HiOutlineExclamationTriangle className="w-10 h-10 text-status-rejected mb-3" />
          <p className="text-sm text-ink-secondary mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border-subtle rounded-md p-5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink-primary font-tabular">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-xs text-ink-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="primary"
          size="sm"
          icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          onClick={() => navigate('/teacher/submission-items')}
        >
          Create Submission Item
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<HiOutlineEye className="w-4 h-4" />}
          onClick={() => navigate('/teacher/item-clearances')}
        >
          View All Reviews
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Clearance Reviews */}
        <div className="bg-surface border border-border-subtle rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-ink-primary">Pending Clearance Reviews</h2>
            {pendingClearances.length > 0 && (
              <button
                onClick={() => navigate('/teacher/item-clearances')}
                className="text-xs text-brand hover:text-brand-hover font-medium flex items-center gap-1 transition-colors duration-150"
              >
                View all <HiOutlineArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="divide-y divide-border-subtle">
            {loading ? (
              <div className="p-4">
                <Skeleton rows={4} columns={1} />
              </div>
            ) : pendingClearances.length === 0 ? (
              <EmptyState
                icon={<HiOutlineCheckCircle className="w-8 h-8" />}
                title="No pending reviews"
                description="All clearance items have been reviewed."
              />
            ) : (
              pendingClearances.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-canvas/50 transition-colors duration-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-primary truncate">
                      {item.studentId?.name || item.studentName || 'Unknown Student'}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {item.itemTitle || item.clearanceItemId?.title || 'Untitled'}
                    </p>
                  </div>
                  <Badge variant="info">
                    {SUBMISSION_ITEM_TYPE_LABELS[item.itemType] ||
                      item.clearanceItemId?.itemType ||
                      'Item'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Submission Items */}
        <div className="bg-surface border border-border-subtle rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-ink-primary">Recent Submission Items</h2>
            {submissionItems.length > 0 && (
              <button
                onClick={() => navigate('/teacher/submission-items')}
                className="text-xs text-brand hover:text-brand-hover font-medium flex items-center gap-1 transition-colors duration-150"
              >
                View all <HiOutlineArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="divide-y divide-border-subtle">
            {loading ? (
              <div className="p-4">
                <Skeleton rows={4} columns={1} />
              </div>
            ) : submissionItems.length === 0 ? (
              <EmptyState
                icon={<HiOutlineDocumentText className="w-8 h-8" />}
                title="No submission items"
                description="Create your first submission item to get started."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/teacher/submission-items')}
                  >
                    Create Item
                  </Button>
                }
              />
            ) : (
              submissionItems.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-canvas/50 transition-colors duration-100"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-ink-primary truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink-muted">
                        {SUBMISSION_ITEM_TYPE_LABELS[item.type] || item.type}
                      </span>
                      {item.deadline && (
                        <>
                          <span className="text-ink-muted">·</span>
                          <span className="text-xs text-ink-muted font-tabular">
                            {new Date(item.deadline).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-ink-muted font-tabular whitespace-nowrap">
                    {item.submissionCount ?? 0} submissions
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
