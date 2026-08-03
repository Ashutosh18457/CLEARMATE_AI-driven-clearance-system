import { useState, useEffect, useCallback, useMemo } from 'react';
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import api from '../../api/axios';
import { CLEARANCE_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function HODDashboard() {
  const [clearances, setClearances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approved' | 'rejected'
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClearances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/clearances/hod/pending');
      setClearances(res.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearances();
  }, [fetchClearances]);

  const stats = useMemo(() => {
    const pending = clearances.filter((c) => c.status === 'hod_review' || c.status === 'pending').length;
    const completed = clearances.filter((c) => c.status === 'completed').length;
    const rejected = clearances.filter((c) => c.status === 'rejected').length;
    return { pending, completed, rejected };
  }, [clearances]);

  const openModal = (item, action) => {
    setSelectedItem(item);
    setModalAction(action);
    setRemarks('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setModalAction(null);
    setRemarks('');
  };

  const handleReview = async () => {
    if (!selectedItem || !modalAction) return;
    setSubmitting(true);
    try {
      await api.patch(`/clearances/hod/${selectedItem._id}/review`, {
        status: modalAction,
        remarks: remarks.trim(),
      });
      toast.success(
        modalAction === 'approved'
          ? 'Clearance completed — certificate can be generated'
          : 'Clearance rejected'
      );
      closeModal();
      fetchClearances();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (_, row) => (
        <span className="font-medium text-ink-primary">
          {row.studentId?.name || '—'}
        </span>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment No.',
      render: (_, row) => (
        <span className="font-tabular text-ink-secondary">
          {row.studentId?.enrollmentNo || '—'}
        </span>
      ),
    },
    {
      key: 'section',
      label: 'Section',
      render: (_, row) => row.studentId?.section || '—',
    },
    {
      key: 'program',
      label: 'Program',
      render: (_, row) => row.studentId?.program || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {CLEARANCE_STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => {
        const isPending = row.status === 'hod_review' || row.status === 'pending';
        if (!isPending) {
          return <span className="text-xs text-ink-muted">Reviewed</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openModal(row, 'approved')}
              icon={<HiOutlineCheckCircle className="w-4 h-4" />}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => openModal(row, 'rejected')}
              icon={<HiOutlineXCircle className="w-4 h-4" />}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const statCards = [
    { label: 'Pending Final Reviews', value: stats.pending, color: 'text-status-pending' },
    { label: 'Completed', value: stats.completed, color: 'text-status-success' },
    { label: 'Rejected', value: stats.rejected, color: 'text-status-rejected' },
  ];

  return (
    <DashboardLayout title="HOD Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface border border-border-subtle rounded-md p-4"
          >
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <p className={`text-2xl font-semibold font-tabular ${card.color}`}>
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mb-2">
        <h2 className="text-base font-semibold text-ink-primary mb-3">Pending HOD Reviews</h2>
      </div>
      <Table
        columns={columns}
        data={clearances}
        loading={loading}
        emptyMessage="No pending HOD reviews"
        emptyIcon={<HiOutlineClipboardDocumentList className="w-10 h-10" />}
      />

      {/* Review Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalAction === 'approved' ? 'Final Approval' : 'Reject Clearance'}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'approved' ? 'primary' : 'danger'}
              size="md"
              loading={submitting}
              onClick={handleReview}
            >
              {modalAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-secondary">
              Student:{' '}
              <span className="font-medium text-ink-primary">
                {selectedItem?.studentId?.name || '—'}
              </span>
            </p>
            <p className="text-sm text-ink-secondary mt-1">
              Enrollment:{' '}
              <span className="font-medium text-ink-primary font-tabular">
                {selectedItem?.studentId?.enrollmentNo || '—'}
              </span>
            </p>
            {selectedItem?.studentId?.program && (
              <p className="text-sm text-ink-secondary mt-1">
                Program:{' '}
                <span className="font-medium text-ink-primary">
                  {selectedItem.studentId.program}
                </span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="hod-review-remarks" className="label-base">
              Remarks
            </label>
            <textarea
              id="hod-review-remarks"
              className="input-base min-h-[80px] resize-y"
              placeholder={
                modalAction === 'approved'
                  ? 'Optional remarks...'
                  : 'Reason for rejection...'
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
