import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import { SUBMISSION_STATUS_LABELS, SUBMISSION_ITEM_TYPE_LABELS } from '../../utils/constants';
import {
  HiOutlineDocumentText,
  HiOutlineArrowUpTray,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineChatBubbleBottomCenterText,
} from 'react-icons/hi2';

export default function StudentSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
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
                description: item.submissionItem.description,
                deadline: item.submissionItem.deadline,
                isRequired: item.submissionItem.isRequired,
                clearanceItem: item.submissionItem.clearanceItem,
                status: item.myStatus?.status || 'pending',
                remarks: item.myStatus?.remarks || '',
                submittedAt: item.myStatus?.submittedAt,
                verifiedAt: item.myStatus?.verifiedAt,
                submissionId: item.myStatus?._id,
              };
            }
            return {
              _id: item._id,
              title: item.title || item.itemTitle,
              type: item.type,
              description: item.description,
              deadline: item.deadline,
              clearanceItem: item.clearanceItem,
              status: item.submission?.status || item.status || 'pending',
              submittedAt: item.submission?.submittedAt || item.submittedAt,
              verifiedAt: item.submission?.verifiedAt || item.verifiedAt,
              remarks: item.submission?.remarks || item.remarks || '',
            };
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
      toast.success('Coursework submitted for teacher verification!');
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || 'Failed to submit item');
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

  // Filter and search logic
  const filtered = submissions.filter((s) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'overdue'
        ? isOverdue(s.deadline, s.status)
        : s.status === filter;

    const matchesSearch =
      !search.trim() ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.clearanceItem?.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.clearanceItem?.subjectCode?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const countByStatus = (st) => {
    if (st === 'all') return submissions.length;
    if (st === 'overdue') return submissions.filter((s) => isOverdue(s.deadline, s.status)).length;
    return submissions.filter((s) => s.status === st).length;
  };

  const columns = [
    {
      key: 'title',
      label: 'Coursework / Assignment Title',
      render: (_, row) => (
        <div className="flex items-start gap-3 py-1">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand flex items-center justify-center shrink-0 mt-0.5">
            <HiOutlineDocumentText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary">{row.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {row.clearanceItem?.title && (
                <span className="text-xs text-ink-muted">{row.clearanceItem.title}</span>
              )}
              {row.clearanceItem?.subjectCode && (
                <span className="font-mono text-2xs px-1.5 py-0.2 bg-canvas border border-border-subtle rounded text-ink-secondary">
                  {row.clearanceItem.subjectCode}
                </span>
              )}
            </div>
            {row.description && (
              <p className="text-2xs text-ink-muted mt-1 line-clamp-1">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Category',
      render: (_, row) => (
        <Badge variant="default" className="capitalize text-2xs">
          {SUBMISSION_ITEM_TYPE_LABELS[row.type] || row.type || '—'}
        </Badge>
      ),
    },
    {
      key: 'deadline',
      label: 'Due Date',
      render: (_, row) => {
        const overdue = isOverdue(row.deadline, row.status);
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold font-tabular ${overdue ? 'text-status-rejected font-bold' : 'text-ink-secondary'}`}>
                {formatDate(row.deadline)}
              </span>
              {overdue && (
                <HiOutlineExclamationTriangle className="w-4 h-4 text-status-rejected shrink-0" />
              )}
            </div>
            {row.submittedAt && (
              <p className="text-2xs text-ink-muted mt-0.5">
                Submitted: {formatDate(row.submittedAt)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Verification Status',
      render: (_, row) => {
        const overdue = isOverdue(row.deadline, row.status);
        return (
          <div className="space-y-1">
            <Badge variant={getStatusVariant(row.status)}>
              {SUBMISSION_STATUS_LABELS[row.status] || row.status}
            </Badge>
            {overdue && (
              <Badge variant="rejected" className="text-2xs ml-1">
                Overdue
              </Badge>
            )}
            {row.remarks && (
              <div className="flex items-start gap-1 text-2xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1 max-w-xs">
                <HiOutlineChatBubbleBottomCenterText className="w-3.5 h-3.5 shrink-0 mt-0.2" />
                <span className="italic">{row.remarks}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (_, row) => {
        if (row.status === 'pending' || row.status === 'rejected') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(row._id)}
              loading={submitting === row._id}
              icon={<HiOutlineArrowUpTray className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {row.status === 'rejected' ? 'Resubmit' : 'Mark Submitted'}
            </Button>
          );
        }
        if (row.status === 'submitted') {
          return (
            <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 justify-end">
              <HiOutlineClock className="w-4 h-4" />
              Awaiting Review
            </span>
          );
        }
        return (
          <span className="text-xs font-semibold text-green-600 flex items-center gap-1 justify-end">
            <HiOutlineCheckCircle className="w-4 h-4" />
            Verified
          </span>
        );
      },
    },
  ];

  const FILTERS = [
    { key: 'all', label: 'All Submissions' },
    { key: 'pending', label: 'Pending' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <DashboardLayout title="Coursework & Submissions Portal">
      {/* Header Info */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">
            Semester Coursework & Lab Work
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Submit your practical records and assignments. Teacher verifications are prerequisites for Phase 3 Clearance.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="student-submissions-search"
            name="search"
            type="text"
            aria-label="Search by subject or item"
            placeholder="Search by subject or item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => {
          const count = countByStatus(f.key);
          const isSelected = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface text-ink-secondary border border-border-subtle hover:bg-canvas'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-canvas text-ink-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Overdue Warning Callout */}
      {submissions.some((s) => isOverdue(s.deadline, s.status)) && (
        <div className="mb-4 p-4 rounded-xl bg-red-50/80 border border-red-200 flex items-center gap-3">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-status-rejected shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-900">Overdue Submissions Notice</p>
            <p className="text-xs text-red-700 mt-0.5">
              You have past-deadline coursework. Please submit immediately to ensure faculty can clear your requirements.
            </p>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-surface border border-border-subtle rounded-2xl shadow-xs overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage={
            search ? `No submissions matching "${search}"` : 'No coursework submissions found in this category.'
          }
          emptyIcon={<HiOutlineDocumentText className="w-10 h-10 text-ink-muted" />}
        />
      </div>
    </DashboardLayout>
  );
}

