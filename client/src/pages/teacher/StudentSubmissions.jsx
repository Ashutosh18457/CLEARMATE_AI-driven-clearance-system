import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineShieldExclamation,
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

const REJECTION_REASON_PRESETS = [
  'Incomplete lab record / assignment',
  'Plagiarism or copied content detected',
  'Corrupted or unreadable submission file',
  'Missing required index or signatures',
  'Format requirements not met',
];

export default function StudentSubmissions() {
  const { submissionItemId: paramItemId } = useParams();

  const [selectedItemId, setSelectedItemId] = useState(paramItemId || '');
  const [submissionItems, setSubmissionItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Single review modal
  const [reviewModal, setReviewModal] = useState({ open: false, type: null, submission: null });
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk review state
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [bulkModal, setBulkModal] = useState({ open: false, type: null });
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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
    setSelectedSubIds([]);
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

  // Extract all currently selectable submissions (only 'submitted' status)
  const selectableRows = useMemo(() => {
    return students.filter(
      (row) =>
        (row.submission?.status === 'submitted' || row.status === 'submitted') &&
        (row.submission?._id || row._id)
    );
  }, [students]);

  const isAllSelectableChecked =
    selectableRows.length > 0 &&
    selectableRows.every((r) =>
      selectedSubIds.includes((r.submission?._id || r._id).toString())
    );

  const isPartiallyChecked =
    selectableRows.some((r) =>
      selectedSubIds.includes((r.submission?._id || r._id).toString())
    ) && !isAllSelectableChecked;

  const handleToggleSelectAll = () => {
    if (isAllSelectableChecked) {
      setSelectedSubIds([]);
    } else {
      const ids = selectableRows.slice(0, 50).map((r) => (r.submission?._id || r._id).toString());
      setSelectedSubIds(ids);
      if (selectableRows.length > 50) {
        toast('Selected first 50 submissions (maximum batch limit)', { icon: 'ℹ️' });
      }
    }
  };

  const handleToggleRow = (id) => {
    const idStr = id.toString();
    setSelectedSubIds((prev) =>
      prev.includes(idStr) ? prev.filter((i) => i !== idStr) : [...prev, idStr]
    );
  };

  // Single review handlers
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

  // Bulk review handlers
  const openBulkModal = (type) => {
    if (selectedSubIds.length === 0) {
      toast.error('Please select at least one submitted student first');
      return;
    }
    if (type === 'reject' && selectedSubIds.length > 20) {
      toast.error('Bulk rejection is limited to maximum 20 submissions at once for safety');
      return;
    }
    setBulkModal({ open: true, type });
    setBulkRemarks('');
    setBulkConfirmed(false);
  };

  const closeBulkModal = () => {
    setBulkModal({ open: false, type: null });
    setBulkRemarks('');
    setBulkConfirmed(false);
  };

  const handleBulkSubmit = async () => {
    const { type } = bulkModal;
    if (!type || selectedSubIds.length === 0) return;

    if (type === 'reject') {
      if (!bulkRemarks.trim() || bulkRemarks.trim().length < 5) {
        toast.error('Please enter a rejection reason of at least 5 characters');
        return;
      }
      if (!bulkConfirmed) {
        toast.error('Please check the confirmation box before proceeding');
        return;
      }
    }

    setBulkSubmitting(true);
    try {
      const payload = {
        submissionIds: selectedSubIds,
        status: type === 'verify' ? 'verified' : 'rejected',
        remarks: bulkRemarks.trim() || undefined,
      };

      const res = await api.patch('/submissions/bulk/verify', payload);
      const data = res.data.data;

      if (data?.failedCount > 0) {
        toast.success(
          `Processed ${data.processedCount} submission(s). ${data.failedCount} item(s) skipped (already updated).`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          res.data.message ||
            `Successfully ${type === 'verify' ? 'verified' : 'rejected'} ${data.processedCount || selectedSubIds.length} submission(s)`
        );
      }

      closeBulkModal();
      setSelectedSubIds([]);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk operation failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Selected students details for preview in modal
  const selectedStudentsList = useMemo(() => {
    return students
      .filter((s) => selectedSubIds.includes((s.submission?._id || s._id)?.toString()))
      .map((s) => ({
        id: (s.submission?._id || s._id)?.toString(),
        name: s.student?.name || s.studentName || 'Student',
        enrollmentNo: s.student?.enrollmentNo || s.enrollmentNo || '',
      }));
  }, [students, selectedSubIds]);

  const selectedItem = submissionItems.find((i) => i._id === selectedItemId);

  const columns = [
    {
      key: 'select',
      label: (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="select-all-submissions"
            aria-label="Select all submitted submissions"
            checked={isAllSelectableChecked}
            ref={(el) => {
              if (el) el.indeterminate = isPartiallyChecked;
            }}
            onChange={handleToggleSelectAll}
            disabled={selectableRows.length === 0}
            className="w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      ),
      align: 'center',
      render: (_, row) => {
        const subId = (row.submission?._id || row._id)?.toString();
        const status = row.submission?.status || row.status || 'pending';
        const isSubmitted = status === 'submitted';
        const isChecked = subId && selectedSubIds.includes(subId);

        if (!isSubmitted) {
          return (
            <span className="text-ink-muted/30 text-xs select-none">
              —
            </span>
          );
        }

        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select submission for ${row.student?.name || 'student'}`}
              checked={isChecked}
              onChange={() => handleToggleRow(subId)}
              className="w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand cursor-pointer"
            />
          </div>
        );
      },
    },
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Student Submissions</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            View, verify individually, or bulk-process student submissions for a clearance task
          </p>
        </div>
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

      {/* Sticky / Floating Bulk Action Bar */}
      {selectedSubIds.length > 0 && (
        <div className="sticky top-4 z-20 mb-4 bg-brand text-white px-4 py-3 rounded-lg shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
              {selectedSubIds.length} selected
            </span>
            <span className="text-sm font-medium">Bulk Action Options</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="!bg-white !text-status-success hover:!bg-green-50 border-transparent font-medium"
              icon={<HiOutlineCheckCircle className="w-4 h-4 text-status-success" />}
              onClick={() => openBulkModal('verify')}
            >
              Bulk Verify ({selectedSubIds.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!bg-white !text-status-rejected hover:!bg-red-50 border-transparent font-medium"
              icon={<HiOutlineXCircle className="w-4 h-4 text-status-rejected" />}
              onClick={() => openBulkModal('reject')}
            >
              Bulk Reject ({selectedSubIds.length})
            </Button>
            <button
              onClick={() => setSelectedSubIds([])}
              className="p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
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

      {/* Single Verify / Reject Modal */}
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
              ? "Confirm that this student's submission is verified."
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

      {/* Bulk Verify / Reject Modal */}
      <Modal
        isOpen={bulkModal.open}
        onClose={closeBulkModal}
        title={bulkModal.type === 'verify' ? `Bulk Verify (${selectedSubIds.length}) Submissions` : `Bulk Reject (${selectedSubIds.length}) Submissions`}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeBulkModal} disabled={bulkSubmitting}>
              Cancel
            </Button>
            <Button
              variant={bulkModal.type === 'verify' ? 'primary' : 'danger'}
              size="sm"
              loading={bulkSubmitting}
              disabled={bulkModal.type === 'reject' && (!bulkConfirmed || !bulkRemarks.trim() || bulkRemarks.trim().length < 5)}
              onClick={handleBulkSubmit}
            >
              {bulkModal.type === 'verify' ? `Confirm Verify (${selectedSubIds.length})` : `Confirm Reject (${selectedSubIds.length})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {bulkModal.type === 'reject' ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2.5">
              <HiOutlineShieldExclamation className="w-5 h-5 text-status-rejected shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 leading-relaxed">
                <strong className="font-semibold block text-red-950">Bulk Rejection Safety Warning</strong>
                Rejecting submissions will reset their clearance progress and automatically notify all {selectedSubIds.length} student(s) to redo and resubmit their work.
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">
              You are about to verify all <strong className="font-semibold text-ink-primary">{selectedSubIds.length}</strong> selected student submissions.
            </p>
          )}

          {/* Student preview tags */}
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
              Selected Students ({selectedStudentsList.length})
            </label>
            <div className="max-h-28 overflow-y-auto border border-border-subtle rounded-md p-2 bg-canvas/50 flex flex-wrap gap-1.5">
              {selectedStudentsList.map((stu) => (
                <span
                  key={stu.id}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-ink-primary font-medium"
                >
                  <span>{stu.name}</span>
                  {stu.enrollmentNo && (
                    <span className="text-ink-muted text-[10px]">({stu.enrollmentNo})</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Reason presets for reject */}
          {bulkModal.type === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Quick Reason Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkRemarks(preset)}
                    className="text-xs px-2.5 py-1 rounded-md border border-border-subtle bg-surface hover:bg-canvas text-ink-secondary hover:text-ink-primary transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Remarks text area */}
          <div>
            <label className="block text-sm font-medium text-ink-primary mb-1">
              Remarks {bulkModal.type === 'reject' ? (
                <span className="text-status-rejected font-semibold">* (required)</span>
              ) : (
                <span className="text-ink-muted font-normal">(optional)</span>
              )}
            </label>
            <textarea
              value={bulkRemarks}
              onChange={(e) => setBulkRemarks(e.target.value)}
              rows={3}
              placeholder={bulkModal.type === 'reject' ? 'State clearly why these submissions are being rejected...' : 'Add any optional remarks for the students...'}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
            {bulkModal.type === 'reject' && bulkRemarks.trim().length > 0 && bulkRemarks.trim().length < 5 && (
              <p className="text-xs text-status-rejected mt-1">
                Remarks must be at least 5 characters long.
              </p>
            )}
          </div>

          {/* Confirmation Checkbox for Bulk Reject */}
          {bulkModal.type === 'reject' && (
            <div className="pt-2 border-t border-border-subtle">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkConfirmed}
                  onChange={(e) => setBulkConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-border-subtle text-status-rejected focus:ring-status-rejected cursor-pointer"
                />
                <span className="text-xs text-ink-secondary leading-normal">
                  I confirm that I want to reject these <strong className="font-semibold text-ink-primary">{selectedSubIds.length}</strong> submission(s) and understand that students will need to resubmit.
                </span>
              </label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
