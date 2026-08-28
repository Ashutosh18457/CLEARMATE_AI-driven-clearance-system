import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineAcademicCap,
  HiOutlineArrowDownTray,
} from 'react-icons/hi2';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { CLEARANCE_STATUS_LABELS, DEPARTMENT_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function ClassInchargeDashboard() {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('cohort'); // 'cohort' | 'pending' | 'completed'
  const [cohortData, setCohortData] = useState({ scope: {}, stats: {}, students: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approved' | 'rejected'
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student Details / Chain Breakdown Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  const fetchCohortOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/clearances/ci/cohort-overview');
      setCohortData(res.data.data || { scope: {}, stats: {}, students: [] });
    } catch (err) {
      setError(err.message || 'Failed to load cohort clearance overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCohortOverview();
  }, [fetchCohortOverview]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchCohortOverview();
    };

    socket.on('new_notification', handleUpdate);
    socket.on('clearance_updated', handleUpdate);
    socket.on('section_cleared', handleUpdate);
    socket.on('submission_verified', handleUpdate);

    return () => {
      socket.off('new_notification', handleUpdate);
      socket.off('clearance_updated', handleUpdate);
      socket.off('section_cleared', handleUpdate);
      socket.off('submission_verified', handleUpdate);
    };
  }, [socket, fetchCohortOverview]);

  const stats = cohortData.stats || {
    totalAssigned: 0,
    actionableCI: 0,
    inProgress: 0,
    hodReview: 0,
    completed: 0,
    rejected: 0,
    notInitiated: 0,
  };

  // Filter students based on active tab, search, and status dropdown
  const filteredStudents = useMemo(() => {
    const list = cohortData.students || [];
    return list.filter((item) => {
      // Tab filtering
      if (activeTab === 'pending' && !item.isActionableForCI) return false;
      if (activeTab === 'completed' && item.clearanceStatus !== 'completed') return false;

      // Status dropdown filtering
      if (filterStatus !== 'all') {
        if (filterStatus === 'actionable' && !item.isActionableForCI) return false;
        if (filterStatus === 'in_progress' && !['initiated', 'items_review', 'sections_review'].includes(item.clearanceStatus)) return false;
        if (filterStatus === 'completed' && item.clearanceStatus !== 'completed') return false;
        if (filterStatus === 'not_initiated' && item.clearanceStatus !== 'not_initiated') return false;
        if (filterStatus === 'rejected' && item.clearanceStatus !== 'rejected') return false;
      }

      // Search filtering
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const name = item.student.name?.toLowerCase() || '';
        const enroll = item.student.enrollmentNo?.toLowerCase() || '';
        const sec = item.student.section?.toLowerCase() || '';
        if (!name.includes(query) && !enroll.includes(query) && !sec.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [cohortData.students, activeTab, filterStatus, search]);

  const openReviewModal = (item, action) => {
    setSelectedReviewItem(item);
    setModalAction(action);
    setRemarks('');
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedReviewItem(null);
    setModalAction(null);
    setRemarks('');
  };

  const handleReview = async () => {
    if (!selectedReviewItem || !modalAction) return;
    const reqId = selectedReviewItem.requestId || selectedReviewItem._id;
    if (!reqId) return;

    setSubmitting(true);
    try {
      await api.patch(`/clearances/ci/${reqId}/review`, {
        status: modalAction,
        remarks: remarks.trim(),
      });
      toast.success(
        modalAction === 'approved'
          ? 'Clearance approved and advanced to Stage 4 (HOD Review)!'
          : 'Clearance rejected'
      );
      closeReviewModal();
      fetchCohortOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const openStudentDetail = (item) => {
    setSelectedStudentDetail(item);
    setDetailModalOpen(true);
  };

  // Helper for Status Badge & Stage Label
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ci_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            ⚡ Action Needed (Stage 3)
          </span>
        );
      case 'items_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Stage 1: Faculty Review
          </span>
        );
      case 'sections_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Stage 2: Dept Clearances
          </span>
        );
      case 'hod_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Stage 4: HOD Review
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            ✅ Fully Cleared
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            ❌ Rejected / Hold
          </span>
        );
      case 'not_initiated':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-100 text-ink-muted border border-border-subtle">
            Not Initiated
          </span>
        );
    }
  };

  // Main Columns for Cohort Table
  const columns = [
    {
      key: 'student',
      label: 'Student Name & Enrollment',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand font-semibold flex items-center justify-center text-xs border border-brand/20">
            {row.student.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <span className="font-semibold text-ink-primary block text-sm">{row.student.name}</span>
            <span className="font-mono text-xs text-ink-muted">{row.student.enrollmentNo || 'No Enroll'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'cohort',
      label: 'Cohort Level',
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-semibold text-ink-primary">{row.student.program}</span>
          <span className="text-ink-muted block">Sem {row.student.currentSemester} • Sec {row.student.section || '—'}</span>
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Clearance Progress',
      render: (_, row) => {
        if (!row.hasRequest) {
          return <span className="text-xs text-ink-muted">Prerequisites / Not Started</span>;
        }

        const totalItems = row.totalItemsCount || 0;
        const approvedItems = row.itemsApprovedCount || 0;
        const totalSections = row.totalSectionsCount || 0;
        const approvedSections = row.sectionsApprovedCount || 0;

        const total = totalItems + totalSections;
        const approved = approvedItems + approvedSections;
        const percent = total > 0 ? Math.round((approved / total) * 100) : 0;

        return (
          <div className="w-44 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-secondary">Faculty ({approvedItems}/{totalItems})</span>
              <span className="text-ink-secondary">Depts ({approvedSections}/{totalSections})</span>
            </div>
            <div className="w-full bg-surface-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  row.clearanceStatus === 'completed'
                    ? 'bg-green-500'
                    : row.clearanceStatus === 'rejected'
                    ? 'bg-red-500'
                    : 'bg-brand'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-ink-muted font-mono">{percent}% Approved</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Current Status / Stage',
      render: (_, row) => renderStatusBadge(row.clearanceStatus),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openStudentDetail(row)}
            title="View Live Clearance Chain"
          >
            <HiOutlineEye className="w-4 h-4 text-ink-secondary hover:text-brand" />
            <span className="text-xs">Details</span>
          </Button>

          {row.isActionableForCI && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => openReviewModal(row, 'approved')}
                icon={<HiOutlineCheckCircle className="w-3.5 h-3.5" />}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => openReviewModal(row, 'rejected')}
                icon={<HiOutlineXCircle className="w-3.5 h-3.5" />}
              >
                Reject
              </Button>
            </div>
          )}

          {row.clearanceStatus === 'completed' && row.request?.certificateUrl && (
            <a
              href={row.request.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold border border-green-200 transition-colors ml-1"
              title="Download Clearance Certificate"
            >
              <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
              Certificate
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Class Incharge Clearance Portal">
      {/* ─── Assigned Cohort Scope Info Banner ─── */}
      <div className="bg-canvas border border-border-subtle rounded-lg p-4 mb-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand/20 text-brand flex items-center justify-center">
            <HiOutlineUserGroup className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">Assigned Cohort Scope</p>
            <h2 className="text-base font-bold text-ink-primary">
              {cohortData.scope?.program || 'Department'} • {cohortData.scope?.semester || 'All Semesters'} • {cohortData.scope?.section || 'All Sections'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-ink-muted">Total Assigned Students</p>
            <p className="text-xl font-extrabold text-ink-primary font-tabular">{stats.totalAssigned}</p>
          </div>
        </div>
      </div>

      {/* ─── Metric Stat Cards Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-surface border border-border-subtle rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Cohort Total</p>
          <p className="text-2xl font-bold text-ink-primary mt-1 font-tabular">{stats.totalAssigned}</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">⚡ Ready for CI</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1 font-tabular">{stats.actionableCI}</p>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-bold text-blue-700 mt-1 font-tabular">{stats.inProgress}</p>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">At HOD Review</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1 font-tabular">{stats.hodReview}</p>
        </div>

        <div className="bg-green-50/70 border border-green-200 rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider">✅ Fully Cleared</p>
          <p className="text-2xl font-bold text-green-700 mt-1 font-tabular">{stats.completed}</p>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Not Started</p>
          <p className="text-2xl font-bold text-ink-muted mt-1 font-tabular">{stats.notInitiated}</p>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-border-subtle mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('cohort')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'cohort'
              ? 'border-brand text-brand bg-brand-50/40 rounded-t-md'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-t-md'
          }`}
        >
          <HiOutlineUserGroup className="w-4 h-4" />
          <span>All Assigned Students</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-canvas border border-border-subtle text-ink-secondary">
            {stats.totalAssigned}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'pending'
              ? 'border-brand text-brand bg-brand-50/40 rounded-t-md'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-t-md'
          }`}
        >
          <HiOutlineCheckCircle className="w-4 h-4 text-amber-600" />
          <span>Action Needed (Pending My Approval)</span>
          {stats.actionableCI > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
              {stats.actionableCI}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'completed'
              ? 'border-brand text-brand bg-brand-50/40 rounded-t-md'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-t-md'
          }`}
        >
          <HiOutlineShieldCheck className="w-4 h-4 text-green-600" />
          <span>Completed Clearances</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
            {stats.completed}
          </span>
        </button>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[220px]">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              id="ci-search-students-input"
              name="search"
              aria-label="Search student by name, enrollment number, or section"
              type="search"
              placeholder="Search student by name, enrollment no, or section..."
              className="input-base pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {activeTab === 'cohort' && (
            <select
              id="ci-filter-status-select"
              name="filterStatus"
              aria-label="Filter students by status"
              className="select-base w-40 text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="actionable">⚡ Ready for CI ({stats.actionableCI})</option>
              <option value="in_progress">In Progress ({stats.inProgress})</option>
              <option value="completed">Completed ({stats.completed})</option>
              <option value="not_initiated">Not Started ({stats.notInitiated})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>Showing {filteredStudents.length} of {stats.totalAssigned} students</span>
        </div>
      </div>

      {/* ─── Error state ─── */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-status-rejected">
          {error}
        </div>
      )}

      {/* ─── Main Cohort Table ─── */}
      <Table
        columns={columns}
        data={filteredStudents}
        loading={loading}
        emptyMessage={
          activeTab === 'pending'
            ? 'No clearance requests currently waiting for your approval.'
            : activeTab === 'completed'
            ? 'No students have completed clearance yet.'
            : 'No students found matching current filters.'
        }
        emptyIcon={<HiOutlineClipboardDocumentList className="w-10 h-10 text-ink-muted" />}
      />

      {/* ─── Review Modal (Approve / Reject Action) ─── */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={closeReviewModal}
        title={modalAction === 'approved' ? 'Approve Class Clearance (Stage 3)' : 'Reject Class Clearance'}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeReviewModal}>
              Cancel
            </Button>
            <Button
              variant={modalAction === 'approved' ? 'primary' : 'danger'}
              size="sm"
              loading={submitting}
              onClick={handleReview}
            >
              {modalAction === 'approved' ? 'Confirm Approval & Advance to HOD' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-canvas border border-border-subtle rounded-md">
            <p className="text-xs text-ink-muted">Student Details:</p>
            <p className="text-sm font-bold text-ink-primary">{selectedReviewItem?.student?.name}</p>
            <p className="text-xs text-ink-secondary font-mono">
              Enrollment: {selectedReviewItem?.student?.enrollmentNo || '—'} • Sem {selectedReviewItem?.student?.currentSemester} (Sec {selectedReviewItem?.student?.section || '—'})
            </p>
          </div>

          <div>
            <label htmlFor="ci-review-remarks" className="label-base text-xs font-semibold">
              Class Incharge Remarks
            </label>
            <textarea
              id="ci-review-remarks"
              name="remarks"
              className="input-base min-h-[80px] text-xs resize-y"
              placeholder={
                modalAction === 'approved'
                  ? 'e.g. Verified cohort academic performance and all prerequisite clearances. Approved for final HOD authorization.'
                  : 'Specify reason for rejection or pending academic obligations...'
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Student Live Clearance Chain Breakdown Modal ─── */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Student Live Clearance Chain"
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedStudentDetail && (
          <div className="space-y-4">
            {/* Student Header */}
            <div className="flex items-center justify-between p-3 bg-canvas border border-border-subtle rounded-md">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">{selectedStudentDetail.student.name}</h3>
                <p className="text-xs text-ink-muted font-mono">
                  {selectedStudentDetail.student.enrollmentNo || 'No Enroll'} • {selectedStudentDetail.student.program} • Sem {selectedStudentDetail.student.currentSemester} Sec {selectedStudentDetail.student.section || '—'}
                </p>
              </div>
              <div>{renderStatusBadge(selectedStudentDetail.clearanceStatus)}</div>
            </div>

            {/* If Not Initiated */}
            {!selectedStudentDetail.hasRequest ? (
              <div className="p-6 text-center text-xs text-ink-muted bg-canvas rounded-md border border-border-subtle">
                Student has not initiated clearance yet. Submissions and prerequisites may be pending.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stage 1: Faculty Subject Items */}
                <div className="border border-border-subtle rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-ink-primary">Stage 1: Faculty Subject Items</span>
                    <span className="text-xs font-semibold text-brand">
                      {selectedStudentDetail.itemsApprovedCount} / {selectedStudentDetail.totalItemsCount} Approved
                    </span>
                  </div>
                  {selectedStudentDetail.items?.length > 0 ? (
                    <div className="divide-y divide-border-subtle text-xs">
                      {selectedStudentDetail.items.map((item) => (
                        <div key={item._id} className="py-2 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-ink-primary">{item.title}</p>
                            <p className="text-[11px] text-ink-muted capitalize">Type: {item.type}</p>
                          </div>
                          <div>
                            <Badge variant={getStatusVariant(item.status)}>
                              {CLEARANCE_STATUS_LABELS[item.status] || item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">No subject clearance items defined.</p>
                  )}
                </div>

                {/* Stage 2: Department Section Clearances */}
                <div className="border border-border-subtle rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-ink-primary">Stage 2: Department Section Clearances</span>
                    <span className="text-xs font-semibold text-purple-700">
                      {selectedStudentDetail.sectionsApprovedCount} / {selectedStudentDetail.totalSectionsCount} Approved
                    </span>
                  </div>
                  {selectedStudentDetail.sections?.length > 0 ? (
                    <div className="divide-y divide-border-subtle text-xs">
                      {selectedStudentDetail.sections.map((sec) => (
                        <div key={sec._id} className="py-2 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-ink-primary capitalize">
                              {DEPARTMENT_LABELS[sec.department] || sec.department} Section
                            </p>
                            {sec.remarks && <p className="text-[11px] text-ink-muted">Remarks: {sec.remarks}</p>}
                          </div>
                          <div>
                            <Badge variant={getStatusVariant(sec.status)}>
                              {CLEARANCE_STATUS_LABELS[sec.status] || sec.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">No section clearances defined.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
