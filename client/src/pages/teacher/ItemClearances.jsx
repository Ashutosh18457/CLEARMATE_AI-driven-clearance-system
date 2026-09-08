import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import { ITEM_STATUSES, SUBMISSION_ITEM_TYPE_LABELS } from '../../utils/constants';

const STATUS_LABELS = {
  [ITEM_STATUSES.PENDING]: 'Pending',
  [ITEM_STATUSES.APPROVED]: 'Approved',
  [ITEM_STATUSES.REJECTED]: 'Rejected',
};

export default function ItemClearances() {
  const { socket } = useSocket() || {};
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review modal
  const [reviewModal, setReviewModal] = useState({ open: false, type: null, item: null });
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClearances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/clearances/items/pending');
      setClearances(res.data.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearances();
  }, [fetchClearances]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchClearances();
    };
    socket.on('clearance_initiated', handleUpdate);
    socket.on('new_notification', handleUpdate);

    return () => {
      socket.off('clearance_initiated', handleUpdate);
      socket.off('new_notification', handleUpdate);
    };
  }, [socket, fetchClearances]);

  const openReviewModal = (type, item) => {
    setReviewModal({ open: true, type, item });
    setRemarks('');
  };

  const closeReviewModal = () => {
    setReviewModal({ open: false, type: null, item: null });
    setRemarks('');
  };

  const handleReview = async () => {
    const { type, item } = reviewModal;
    if (!item) return;

    setSubmitting(true);
    try {
      await api.patch(`/clearances/items/${item._id}/review`, {
        status: type === 'approve' ? 'approved' : 'rejected',
        remarks: remarks.trim() || undefined,
      });
      toast.success(
        type === 'approve'
          ? 'Item clearance approved'
          : 'Item clearance rejected'
      );
      closeReviewModal();
      fetchClearances();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (_, row) => {
        const name = row.studentId?.name || row.studentName || '—';
        const enrollment = row.studentId?.enrollmentNo || row.enrollmentNo || '';
        return (
          <div>
            <p className="text-sm font-medium text-ink-primary">{name}</p>
            {enrollment && (
              <p className="text-xs text-ink-muted font-tabular">{enrollment}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'itemTitle',
      label: 'Item',
      render: (val, row) => (
        <span className="text-sm text-ink-primary">
          {val || row.clearanceItemId?.title || '—'}
        </span>
      ),
    },
    {
      key: 'itemType',
      label: 'Type',
      render: (val, row) => {
        const type = val || row.clearanceItemId?.itemType;
        return (
          <Badge variant="info">
            {SUBMISSION_ITEM_TYPE_LABELS[type] || type || '—'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={getStatusVariant(val)}>
          {STATUS_LABELS[val] || val}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => {
        if (row.status !== 'pending') {
          return (
            <span className="text-xs text-ink-muted">
              {STATUS_LABELS[row.status] || row.status}
            </span>
          );
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="!text-status-success hover:!bg-green-50"
              icon={<HiOutlineCheckCircle className="w-4 h-4" />}
              onClick={() => openReviewModal('approve', row)}
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="!text-status-rejected hover:!bg-red-50"
              icon={<HiOutlineXCircle className="w-4 h-4" />}
              onClick={() => openReviewModal('reject', row)}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Item Clearances">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-primary">Item Clearances</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Review and approve pending item clearance requests from students
        </p>
      </div>

      {error && !clearances.length ? (
        <div className="bg-surface border border-border-subtle rounded-md p-8 text-center">
          <p className="text-sm text-ink-secondary mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchClearances}>
            Retry
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={clearances}
          loading={loading}
          emptyMessage="No pending clearances"
          emptyIcon={<HiOutlineShieldCheck className="w-10 h-10" />}
        />
      )}

      {/* Approve / Reject Modal */}
      <Modal
        isOpen={reviewModal.open}
        onClose={closeReviewModal}
        title={reviewModal.type === 'approve' ? 'Approve Clearance' : 'Reject Clearance'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeReviewModal}>
              Cancel
            </Button>
            <Button
              variant={reviewModal.type === 'approve' ? 'primary' : 'danger'}
              size="sm"
              loading={submitting}
              onClick={handleReview}
            >
              {reviewModal.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Rejection Warning */}
          {reviewModal.type === 'reject' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <HiOutlineExclamationTriangle className="w-5 h-5 text-status-rejected shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">This will reject the entire clearance</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Rejecting this item will cause the student's overall clearance request to be
                  marked as rejected. The student will need to address this before proceeding.
                </p>
              </div>
            </div>
          )}

          {reviewModal.type === 'approve' && (
            <p className="text-sm text-ink-secondary">
              Confirm approval for this clearance item. The student's clearance will progress to the
              next stage once all items are approved.
            </p>
          )}

          {/* Item info */}
          {reviewModal.item && (
            <div className="bg-canvas rounded-md p-3 border border-border-subtle">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-muted">Student</span>
                  <p className="text-ink-primary font-medium mt-0.5">
                    {reviewModal.item.studentId?.name || reviewModal.item.studentName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-ink-muted">Item</span>
                  <p className="text-ink-primary font-medium mt-0.5">
                    {reviewModal.item.itemTitle || reviewModal.item.clearanceItemId?.title || '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label htmlFor="item-clearance-remarks" className="block text-sm font-medium text-ink-primary mb-1">
              Remarks <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="item-clearance-remarks"
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder={
                reviewModal.type === 'reject'
                  ? 'Reason for rejection...'
                  : 'Add any remarks...'
              }
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
