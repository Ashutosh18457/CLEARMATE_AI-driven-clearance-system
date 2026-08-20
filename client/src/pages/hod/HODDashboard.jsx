import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineShieldCheck,
  HiOutlineBuildingLibrary,
  HiOutlineDocumentCheck,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { CLEARANCE_STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function HODDashboard() {
  const [activeTab, setActiveTab] = useState('clearances'); // 'clearances' | 'teachers'
  const [clearances, setClearances] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approved' | 'rejected'
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student Clearance Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const fetchClearances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clearancesRes, teachersRes] = await Promise.all([
        api.get('/clearances/hod/pending'),
        api.get('/clearances/hod/teachers-overview').catch(() => ({ data: { data: [] } })),
      ]);
      setClearances(clearancesRes.data.data || []);
      setTeachers(teachersRes.data.data || []);
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
    return { pending, completed, rejected, totalTeachers: teachers.length };
  }, [clearances, teachers]);

  const openReviewModal = (item, action) => {
    setSelectedItem(item);
    setModalAction(action);
    setRemarks('');
    setModalOpen(true);
  };

  const closeReviewModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
    setModalAction(null);
    setRemarks('');
  };

  const openDetailModal = (item) => {
    setDetailItem(item);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setDetailItem(null);
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
          ? 'Clearance marked FULL CLEARED! Official certificate is now available.'
          : 'Clearance rejected'
      );
      closeReviewModal();
      if (detailModalOpen) closeDetailModal();
      fetchClearances();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const clearanceColumns = [
    {
      key: 'studentName',
      label: 'Student',
      render: (_, row) => (
        <div>
          <button
            onClick={() => openDetailModal(row)}
            className="font-semibold text-brand hover:underline text-left block"
          >
            {row.studentId?.name || '—'}
          </button>
          <span className="text-xs text-ink-muted">{row.studentId?.email}</span>
        </div>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment No.',
      render: (_, row) => (
        <span className="font-mono text-xs font-semibold text-ink-secondary">
          {row.studentId?.enrollmentNo || '—'}
        </span>
      ),
    },
    {
      key: 'semester',
      label: 'Semester / Section',
      render: (_, row) => (
        <span className="text-xs text-ink-secondary">
          {row.semesterId?.name || `Sem ${row.semesterId?.semNumber || '—'}`}{' '}
          {row.studentId?.section ? `(Sec ${row.studentId.section})` : ''}
        </span>
      ),
    },
    {
      key: 'teacherClearances',
      label: 'Teacher Clearances',
      render: (_, row) => {
        const items = row.itemClearances || [];
        const approvedCount = items.filter((i) => i.status === 'approved').length;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-success bg-green-50 px-2 py-0.5 rounded border border-green-200">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" />
            {approvedCount}/{items.length || 0} Subjects Approved
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Pipeline Stage',
      render: (val) => (
        <Badge variant={getStatusVariant(val || 'hod_review')}>
          {CLEARANCE_STATUS_LABELS[val] || 'HOD Final Review'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => {
        const isPending = row.status === 'hod_review' || row.status === 'pending';
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openDetailModal(row)}
            >
              Verify Chain
            </Button>
            {isPending && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openReviewModal(row, 'approved')}
                  icon={<HiOutlineCheckCircle className="w-4 h-4" />}
                >
                  Approve (Full Clear)
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => openReviewModal(row, 'rejected')}
                  icon={<HiOutlineXCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const teacherColumns = [
    {
      key: 'name',
      label: 'Faculty Name',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-sm text-ink-primary">{val}</p>
          <p className="text-xs text-ink-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'assignedItems',
      label: 'Assigned Clearance Subjects & Labs',
      render: (val) => {
        const items = val || [];
        if (items.length === 0) {
          return <span className="text-xs text-ink-muted italic">No clearance subjects assigned</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5 max-w-lg">
            {items.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-canvas border border-border-subtle text-ink-primary font-medium"
              >
                <span className="font-mono text-brand font-semibold">[{item.type.toUpperCase()}]</span>
                <span>{item.title}</span>
                {item.semester && <span className="text-ink-muted text-[10px]">({item.semester})</span>}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'totalItemsCount',
      label: 'Subjects Count',
      align: 'center',
      render: (val) => (
        <span className="text-xs font-bold font-tabular px-2.5 py-0.5 rounded-full bg-brand-50 text-brand">
          {val || 0}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="HOD Clearance Portal">
      {/* Top Header Summary */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-primary flex items-center gap-2">
            <HiOutlineAcademicCap className="w-6 h-6 text-brand" />
            Head of Department (HOD) Review & Clearance Console
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Supervise department faculty subject evaluations, verify teacher clearance chains, and perform Stage 4 final approval to issue verifiable Clearance Certificates.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border-subtle rounded-md p-4">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Pending Final HOD Reviews
          </p>
          <p className="text-2xl font-bold font-tabular text-status-pending">
            {loading ? '—' : stats.pending}
          </p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-4">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Department Faculty
          </p>
          <p className="text-2xl font-bold font-tabular text-brand">
            {loading ? '—' : stats.totalTeachers}
          </p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-4">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Fully Cleared Students
          </p>
          <p className="text-2xl font-bold font-tabular text-status-success">
            {loading ? '—' : stats.completed}
          </p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-4">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Rejected Clearances
          </p>
          <p className="text-2xl font-bold font-tabular text-status-rejected">
            {loading ? '—' : stats.rejected}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle mb-5 pb-2">
        <button
          onClick={() => setActiveTab('clearances')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'clearances'
              ? 'bg-brand text-white shadow-sm'
              : 'bg-surface hover:bg-canvas text-ink-secondary border border-border-subtle'
          }`}
        >
          <HiOutlineClipboardDocumentList className="w-4 h-4" />
          <span>Pending Student Approvals ({clearances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
            activeTab === 'teachers'
              ? 'bg-brand text-white shadow-sm'
              : 'bg-surface hover:bg-canvas text-ink-secondary border border-border-subtle'
          }`}
        >
          <HiOutlineUsers className="w-4 h-4" />
          <span>Department Faculty & Assigned Subjects ({teachers.length})</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected">
          {error}
        </div>
      )}

      {/* TAB 1: CLEARANCES TABLE */}
      {activeTab === 'clearances' ? (
        <Table
          columns={clearanceColumns}
          data={clearances}
          loading={loading}
          emptyMessage="No students currently pending final HOD approval."
          emptyIcon={<HiOutlineClipboardDocumentList className="w-10 h-10 text-ink-muted" />}
        />
      ) : (
        /* TAB 2: TEACHERS TABLE */
        <Table
          columns={teacherColumns}
          data={teachers}
          loading={loading}
          emptyMessage="No faculty members found in this department."
          emptyIcon={<HiOutlineUsers className="w-10 h-10 text-ink-muted" />}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DETAILED TEACHER-TO-STUDENT CLEARANCE CHAIN VERIFICATION MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {detailItem && (
        <Modal
          isOpen={detailModalOpen}
          onClose={closeDetailModal}
          title={
            <div className="flex items-center gap-2">
              <HiOutlineDocumentCheck className="w-5 h-5 text-brand" />
              <span>Full Clearance Verification Chain — {detailItem.studentId?.name}</span>
            </div>
          }
          size="lg"
          footer={
            <div className="w-full flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={closeDetailModal}>
                Close
              </Button>
              {detailItem.status === 'hod_review' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      closeDetailModal();
                      openReviewModal(detailItem, 'rejected');
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      closeDetailModal();
                      openReviewModal(detailItem, 'approved');
                    }}
                    icon={<HiOutlineCheckCircle className="w-4 h-4" />}
                  >
                    Approve (Mark FULL CLEARED)
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            {/* Student Info Card */}
            <div className="bg-canvas p-3 rounded-lg border border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-ink-muted block">Student Name</span>
                <strong className="text-ink-primary font-medium">{detailItem.studentId?.name}</strong>
              </div>
              <div>
                <span className="text-ink-muted block">Enrollment No</span>
                <strong className="text-ink-primary font-mono">{detailItem.studentId?.enrollmentNo || '—'}</strong>
              </div>
              <div>
                <span className="text-ink-muted block">Semester & Section</span>
                <strong className="text-ink-primary font-medium">
                  {detailItem.semesterId?.name || `Sem ${detailItem.semesterId?.semNumber}`} (Sec {detailItem.studentId?.section || '—'})
                </strong>
              </div>
              <div>
                <span className="text-ink-muted block">Current Stage</span>
                <Badge variant={getStatusVariant(detailItem.status)}>
                  {CLEARANCE_STATUS_LABELS[detailItem.status] || detailItem.status}
                </Badge>
              </div>
            </div>

            {/* Stage 1: Teacher Item Clearances */}
            <div>
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HiOutlineBookOpen className="w-4 h-4 text-brand" />
                <span>Stage 1: Faculty Subject Evaluations ({detailItem.itemClearances?.length || 0})</span>
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {detailItem.itemClearances?.length > 0 ? (
                  detailItem.itemClearances.map((ic, idx) => (
                    <div key={idx} className="p-2.5 bg-surface border border-border-subtle rounded-md flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-ink-primary">{ic.itemTitle}</p>
                        <p className="text-[11px] text-ink-muted">
                          Evaluated by:{' '}
                          <span className="font-medium text-ink-secondary">{ic.teacherId?.name || 'Assigned Teacher'}</span>
                          {ic.teacherId?.email && ` (${ic.teacherId.email})`}
                        </p>
                        {ic.remarks && <p className="text-[11px] text-ink-secondary italic mt-0.5">Remarks: "{ic.remarks}"</p>}
                      </div>
                      <Badge variant={ic.status === 'approved' ? 'success' : ic.status === 'rejected' ? 'rejected' : 'pending'}>
                        {ic.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-muted italic">No item clearances recorded.</p>
                )}
              </div>
            </div>

            {/* Stage 2: Section Clearances */}
            <div>
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HiOutlineBuildingLibrary className="w-4 h-4 text-purple-600" />
                <span>Stage 2: Institutional Department Clearances</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {detailItem.sectionClearances?.map((sec, idx) => (
                  <div key={idx} className="p-2.5 bg-surface border border-border-subtle rounded-md text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-ink-primary uppercase">{sec.department}</span>
                      <Badge variant={sec.status === 'approved' ? 'success' : sec.status === 'rejected' ? 'rejected' : 'pending'}>
                        {sec.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-ink-muted truncate">
                      {sec.reviewerId ? `Verified by ${sec.reviewerId.name}` : 'Awaiting review'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeReviewModal}
        title={modalAction === 'approved' ? 'Final HOD Approval (Mark FULL CLEARED)' : 'Reject Student Clearance'}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeReviewModal} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'approved' ? 'primary' : 'danger'}
              size="md"
              loading={submitting}
              onClick={handleReview}
            >
              {modalAction === 'approved' ? 'Confirm Final Approval' : 'Reject Clearance'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink-secondary">
              Student:{' '}
              <span className="font-semibold text-ink-primary">
                {selectedItem?.studentId?.name || '—'}
              </span>
            </p>
            <p className="text-sm text-ink-secondary mt-0.5">
              Enrollment:{' '}
              <span className="font-mono font-semibold text-ink-primary">
                {selectedItem?.studentId?.enrollmentNo || '—'}
              </span>
            </p>
            {modalAction === 'approved' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-900 leading-relaxed">
                <strong>Certificate Generation Notice:</strong> Approving this clearance marks the student as <strong>FULL CLEARED</strong> across all academic and institutional requirements. An official verifiable clearance certificate with unique ID will be instantly generated for download.
              </div>
            )}
          </div>

          <div>
            <label htmlFor="hod-review-remarks" className="label-base">
              HOD Remarks
            </label>
            <textarea
              id="hod-review-remarks"
              className="input-base min-h-[80px] resize-y text-xs"
              placeholder={
                modalAction === 'approved'
                  ? 'e.g. All academic and departmental clearance requirements successfully met.'
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
