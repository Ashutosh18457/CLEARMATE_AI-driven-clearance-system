import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import {
  SUBMISSION_STATUS_LABELS,
} from '../../utils/constants';

export default function StudentSubmissions() {
  const { submissionItemId: paramItemId } = useParams();

  const [selectedItemId, setSelectedItemId] = useState(paramItemId || '');
  const [submissionItems, setSubmissionItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Review modal
  const [reviewModal, setReviewModal] = useState({ open: false, type: null, submission: null });
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch submission items for selector
  const fetchSubmissionItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await api.get('/submissions/items');
      const data = res.data.data;
      setSubmissionItems(Array.isArray(data) ? data : data.items || data.docs || []);
    } catch (err) {
      toast.error('Failed to load submission items: ' + err.message);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!paramItemId) {
      fetchSubmissionItems();
    }
  }, [paramItemId, fetchSubmissionItems]);

  // Fetch student submissions for selected item
  const fetchStudents = useCallback(async () => {
    if (!selectedItemId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/submissions/items/${selectedItemId}/students`);
      setStudents(res.data.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedItemId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const openReviewModal = (type, submission) => {
    setReviewModal({ open: true, type, submission });
    setRemarks('');
  };

  const closeReviewModal = () => {
    setReviewModal({ open: false, type: null, submission: null });
    setRemarks('');
  };

  const handleReview = async () => {
    const { type, submission } = reviewModal;
    if (!submission) return;

    const submissionId = submission._id || submission.submissionId;
    if (!submissionId) {
      toast.error('Submission ID not found');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/submissions/${submissionId}/verify`, {
        status: type === 'verify' ? 'verified' : 'rejected',
        remarks: remarks.trim() || undefined,
      });
      toast.success(type === 'verify' ? 'Submission verified' : 'Submission rejected');
      closeReviewModal();
      fetchStudents();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = submissionItems.find((i) => i._id === selectedItemId);

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (val, row) => {
        const name = val?.name || row.studentName || '—';
        return <span className="font-medium text-ink-primary">{name}</span>;
      },
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment No',
      render: (_, row) => (
        <span className="text-xs text-ink-secondary font-tabular">
          {row.student?.enrollmentNo || row.enrollmentNo || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const status = row.submission?.status || row.status || 'pending';
        return (
          <Badge variant={getStatusVariant(status)}>
            {SUBMISSION_STATUS_LABELS[status] || status}
          </Badge>
        );
      },
    },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (_, row) => {
        const date = row.submission?.submittedAt || row.submittedAt;
        return date ? (
          <span className="text-xs text-ink-secondary font-tabular">
            {new Date(date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">Not submitted</span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => {
        const status = row.submission?.status || row.status;
        const submission = row.submission || row;
        if (status !== 'submitted') {
          return <span className="text-xs text-ink-muted">—</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="!text-status-success hover:!bg-green-50"
              icon={<HiOutlineCheckCircle className="w-4 h-4" />}
              onClick={() => openReviewModal('verify', submission)}
            >
              Verify
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="!text-status-rejected hover:!bg-red-50"
              icon={<HiOutlineXCircle className="w-4 h-4" />}
              onClick={() => openReviewModal('reject', submission)}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Student Submissions">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-primary">Student Submissions</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          View and verify student submissions for a submission item
        </p>
      </div>

      {/* Item Selector */}
      {!paramItemId && (
        <div className="bg-surface border border-border-subtle rounded-md p-4 mb-6">
          <label htmlFor="select-sub-item" className="block text-sm font-medium text-ink-primary mb-2">
            Select Submission Item
          </label>
          <select
            id="select-sub-item"
            name="submissionItem"
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            disabled={itemsLoading}
            className="w-full max-w-md px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
          >
            <option value="">
              {itemsLoading ? 'Loading items...' : 'Choose an item'}
            </option>
            {submissionItems.map((item) => (
              <option key={item._id} value={item._id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {paramItemId && selectedItem && (
        <div className="bg-surface border border-border-subtle rounded-md px-4 py-3 mb-6">
          <p className="text-sm text-ink-secondary">
            Viewing submissions for:{' '}
            <span className="font-medium text-ink-primary">{selectedItem.title}</span>
          </p>
        </div>
      )}

      {!selectedItemId ? (
        <div className="bg-surface border border-border-subtle rounded-md">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center text-ink-muted mb-4">
              <HiOutlineDocumentText className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-ink-primary mb-1">Select a submission item</p>
            <p className="text-sm text-ink-muted">
              Choose a submission item above to view student submissions
            </p>
          </div>
        </div>
      ) : error && !students.length ? (
        <div className="bg-surface border border-border-subtle rounded-md p-8 text-center">
          <p className="text-sm text-ink-secondary mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchStudents}>
            Retry
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage="No student submissions found"
          emptyIcon={<HiOutlineUsers className="w-10 h-10" />}
        />
      )}

      {/* Verify / Reject Modal */}
      <Modal
        isOpen={reviewModal.open}
        onClose={closeReviewModal}
        title={reviewModal.type === 'verify' ? 'Verify Submission' : 'Reject Submission'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeReviewModal}>
              Cancel
            </Button>
            <Button
              variant={reviewModal.type === 'verify' ? 'primary' : 'danger'}
              size="sm"
              loading={submitting}
              onClick={handleReview}
            >
              {reviewModal.type === 'verify' ? 'Verify' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-secondary">
            {reviewModal.type === 'verify'
              ? 'Confirm that this student\'s submission is verified.'
              : 'Are you sure you want to reject this submission? The student will need to resubmit.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Remarks <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Add any remarks..."
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
