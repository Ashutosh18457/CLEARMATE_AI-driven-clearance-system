import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import { SUBMISSION_STATUS_LABELS } from '../../utils/constants';
import {
  HiOutlineDocumentText,
  HiOutlineArrowUpTray,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';

export default function StudentSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/submissions/my');
      const raw = res.data.data || [];
      const normalized = Array.isArray(raw)
        ? raw.map((item) => {
            if (item.submissionItem) {
              return {
                _id: item.submissionItem._id,
                title: item.submissionItem.title,
                type: item.submissionItem.type,
                deadline: item.submissionItem.deadline,
                description: item.submissionItem.description,
                isRequired: item.submissionItem.isRequired,
                clearanceItem: item.submissionItem.clearanceItem,
                status: item.myStatus?.status || 'pending',
                remarks: item.myStatus?.remarks || '',
                submittedAt: item.myStatus?.submittedAt,
                verifiedAt: item.myStatus?.verifiedAt,
                submissionId: item.myStatus?._id,
              };
            }
            return item;
          })
        : [];
      setSubmissions(normalized);
    } catch (err) {
      toast.error(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSubmit = async (submissionItemId) => {
    if (!submissionItemId) {
      toast.error('Submission Item ID is missing');
      return;
    }
    setSubmitting(submissionItemId);
    try {
      await api.post('/submissions/submit', { submissionItemId });
      toast.success('Marked as submitted');
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(null);
    }
  };

  const isOverdue = (deadline, status) => {
    if (!deadline) return false;
    if (status === 'verified') return false;
    return new Date(deadline) < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filtered = filter === 'all'
    ? submissions
    : submissions.filter((s) => s.status === filter);

  const columns = [
    {
      key: 'title',
      label: 'Item',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <HiOutlineDocumentText className="w-4 h-4 text-ink-muted shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink-primary">{row.title || 'Untitled'}</p>
            {row.clearanceItem?.title && (
              <p className="text-xs text-ink-muted">{row.clearanceItem.title}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, row) => (
        <Badge variant="default">{row.type || '—'}</Badge>
      ),
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (_, row) => {
        const overdue = isOverdue(row.deadline, row.status);
        return (
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-tabular ${overdue ? 'text-status-rejected font-medium' : 'text-ink-primary'}`}>
              {formatDate(row.deadline)}
            </span>
            {overdue && (
              <HiOutlineExclamationTriangle className="w-4 h-4 text-status-rejected" />
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const status = row.status || 'pending';
        return (
          <Badge variant={getStatusVariant(status)}>
            {SUBMISSION_STATUS_LABELS[status] || status}
          </Badge>
        );
      },
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (_, row) => (
        <span className="text-sm text-ink-muted">{row.remarks || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => {
        const status = row.status || 'pending';
        if (status === 'pending' || status === 'rejected') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(row._id)}
              loading={submitting === row._id}
              icon={<HiOutlineArrowUpTray className="w-3.5 h-3.5" />}
            >
              {status === 'rejected' ? 'Resubmit' : 'Mark as submitted'}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <DashboardLayout title="My Submissions">
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
              filter === f.key
                ? 'bg-brand text-white'
                : 'bg-surface text-ink-secondary border border-border-subtle hover:bg-canvas'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Overdue warning */}
      {submissions.some((s) => isOverdue(s.deadline, s.status)) && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-status-rejected shrink-0" />
          <p className="text-sm text-red-800">
            You have overdue submissions that need attention.
          </p>
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No submissions to show"
        emptyIcon={<HiOutlineDocumentText className="w-10 h-10" />}
      />
    </DashboardLayout>
  );
}
