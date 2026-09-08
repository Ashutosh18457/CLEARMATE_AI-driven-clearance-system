import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineScale,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
  HiOutlineCheckBadge,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';



export default function DisciplinarySectionDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'cleared' | 'not_cleared'

  // Branch & Semester Filter State
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedSem, setSelectedSem] = useState('all');
  const [branches, setBranches] = useState([]);
  const [semestersList] = useState([1, 2, 3, 4, 5, 6, 7, 8]);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State inside Modal
  const [disciplinaryStatus, setDisciplinaryStatus] = useState('not_cleared'); // 'cleared' | 'not_cleared'
  const [reason, setReason] = useState('fine_pending');
  const [remarkText, setRemarkText] = useState('');

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRemarkText, setBulkRemarkText] = useState('');

  // Fetch metadata: active programs & semesters
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await api.get('/disciplinary-section/branches');
        if (res.data?.success && res.data?.data?.programs) {
          setBranches(res.data.data.programs);
        } else if (res.data?.programs) {
          setBranches(res.data.programs);
        }
      } catch (err) {
        setBranches([]);
        toast.error('Failed to load branches');
      }
    }
    fetchMetadata();
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedSem !== 'all') params.sem = selectedSem;

      const res = await api.get('/disciplinary-section/students', { params });
      const studentData = res.data?.data || res.data?.students || [];

      if (Array.isArray(studentData)) {
        setStudents(studentData);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('API error fetching disciplinary records:', err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedBranch, selectedSem]);

  const { socket } = useSocket();

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchStudents();
    };

    socket.on('disciplinary_status_updated', handleUpdate);
    socket.on('section_cleared', handleUpdate);

    return () => {
      socket.off('disciplinary_status_updated', handleUpdate);
      socket.off('section_cleared', handleUpdate);
    };
  }, [socket, fetchStudents]);

  // Checkbox selections
  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const currentIds = students.map((s) => s.student.id || s.student._id);
    const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(currentIds);
    }
  };

  // Open modal handler
  const handleOpenModal = async (row) => {
    setSelectedStudent(row);
    const initialStatus = row.disciplinary_status || (row.fees_status === 'paid' ? 'cleared' : 'not_cleared');
    setDisciplinaryStatus(initialStatus);
    setReason(row.reason || 'fine_pending');
    setRemarkText(row.remark_text || '');
    setIsModalOpen(true);
    setModalLoading(true);

    try {
      const res = await api.get(`/disciplinary-section/students/${row.student.id || row.student._id}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setDisciplinaryStatus(d.disciplinary_status || (d.fees_status === 'paid' ? 'cleared' : 'not_cleared'));
        setReason(d.reason || 'fine_pending');
        setRemarkText(d.remark_text || '');
        setSelectedStudent((prev) => ({
          ...prev,
          ...d,
        }));
      }
    } catch (err) {
      console.warn('Could not fetch full student disciplinary details:', err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setRemarkText('');
  };

  // Save single student status update
  const handleSaveStatus = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStudent) return;

    setSaving(true);
    try {
      const payload = {
        disciplinary_status: disciplinaryStatus,
        fees_status: disciplinaryStatus === 'cleared' ? 'paid' : 'not_paid',
        reason: disciplinaryStatus === 'cleared' ? undefined : reason,
        remark_text: remarkText,
      };

      const res = await api.patch(
        `/disciplinary-section/students/${selectedStudent.student.id || selectedStudent.student._id}/status`,
        payload
      );

      if (res.data?.success || res.status === 200) {
        toast.success(
          disciplinaryStatus === 'cleared'
            ? 'Disciplinary NOC granted & student notified'
            : 'Disciplinary remark saved & student notified'
        );
        fetchStudents();
        handleCloseModal();
      } else {
        throw new Error(res.data?.message || 'Failed to update disciplinary status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update disciplinary status');
    } finally {
      setSaving(false);
    }
  };

  // Bulk mark selected students as cleared
  const handleBulkMarkClearedSelected = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setBulkLoading(true);
    try {
      const res = await api.post('/disciplinary-section/students/bulk-update', {
        studentIds: selectedStudentIds,
        status: 'cleared',
        remark_text: bulkRemarkText || 'Disciplinary clearance granted via bulk update',
      });

      toast.success(
        res.data?.message || `Successfully granted Disciplinary NOC to ${selectedStudentIds.length} students!`
      );
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Bulk disciplinary update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Metrics calculation
  const totalStudents = students.length;
  const clearedCount = students.filter(
    (s) => s.disciplinary_status === 'cleared' || s.fees_status === 'paid'
  ).length;
  const pendingCount = totalStudents - clearedCount;

  const isAllSelected =
    students.length > 0 &&
    students.every((s) => selectedStudentIds.includes(s.student.id || s.student._id));

  // Table columns mapping matching exact screenshot design
  const columns = [
    {
      key: 'select',
      label: (
        <input
          id="disciplinary-select-all-students"
          name="selectAll"
          type="checkbox"
          aria-label="Select all students"
          checked={isAllSelected}
          onChange={handleSelectAll}
          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
          title="Select all students"
        />
      ),
      render: (_, row) => {
        const sId = row.student.id || row.student._id;
        const isChecked = selectedStudentIds.includes(sId);
        return (
          <input
            id={`disciplinary-select-student-${sId}`}
            name={`student_select_${sId}`}
            aria-label={`Select student ${row.student.name}`}
            type="checkbox"
            checked={isChecked}
            onChange={() => handleSelectStudent(sId)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
          />
        );
      },
    },
    {
      key: 'student',
      label: 'STUDENT',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-ink-primary text-sm">
            {row.student?.name || 'N/A'}
          </div>
          <div className="text-xs text-ink-muted">{row.student?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'ENROLLMENT NO',
      render: (_, row) => (
        <span className="font-tabular text-sm font-medium text-ink-secondary">
          {row.student?.enrollmentNo || 'N/A'}
        </span>
      ),
    },
    {
      key: 'programSem',
      label: 'PROGRAM / SEM',
      render: (_, row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.student?.program || 'CSE'} - Sem {row.student?.currentSemester || 1}{' '}
          {row.student?.section ? `(${row.student.section})` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'DISCIPLINARY STATUS',
      render: (_, row) => {
        const isCleared = row.disciplinary_status === 'cleared' || row.fees_status === 'paid';
        return isCleared ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cleared</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <HiOutlineExclamationCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Not Cleared{' '}
              {row.reason === 'fine_pending'
                ? '(Fine pending)'
                : row.reason === 'misconduct_record'
                ? '(Misconduct record)'
                : row.remark_text
                ? `(${row.remark_text})`
                : '(Action pending)'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'lastUpdated',
      label: 'LAST UPDATED',
      render: (_, row) => {
        if (!row.updated_at) return <span className="text-sm text-ink-muted">—</span>;
        const dateObj = new Date(row.updated_at);
        return (
          <span className="text-xs text-ink-secondary font-tabular">
            {dateObj.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: 'ACTION',
      align: 'right',
      render: (_, row) => (
        <button
          onClick={() => handleOpenModal(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-primary bg-surface hover:bg-canvas border border-border-subtle shadow-2xs transition-colors"
        >
          <HiOutlinePencilSquare className="w-3.5 h-3.5 text-ink-muted" />
          <span>Manage Disciplinary</span>
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Disciplinary Section — Conduct Clearance">
      {/* ─── Header bar / User Info ─── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink-primary font-display tracking-tight">
            Disciplinary Section — Conduct Clearance
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Manage student conduct records, disciplinary fines, and clearance approvals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand/20 flex items-center justify-center text-brand font-semibold text-xs">
            DS
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-primary">Disciplinary Head</p>
            <p className="text-[11px] text-ink-muted">Disciplinary Section</p>
          </div>
        </div>
      </div>

      {/* ─── Top 3 Stat Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Total Students */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              TOTAL STUDENTS
            </p>
            <p className="text-3xl font-extrabold text-ink-primary font-tabular">
              {loading ? '—' : totalStudents}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <HiOutlineScale className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Conduct Cleared */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              CONDUCT CLEARED
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 font-tabular">
              {loading ? '—' : clearedCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <HiOutlineCheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Action Pending */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              ACTION PENDING
            </p>
            <p className="text-3xl font-extrabold text-amber-600 font-tabular">
              {loading ? '—' : pendingCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <HiOutlineExclamationCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── Branch & Semester Filter Card ─── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border-subtle">
          <div>
            <h3 className="text-xs font-extrabold text-ink-primary uppercase tracking-wider">
              BRANCH &amp; SEMESTER FILTER
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Select academic branch and semester to view disciplinary status records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="branch-select" className="text-xs font-medium text-ink-secondary shrink-0">
                Branch:
              </label>
              <select
                id="branch-select"
                className="input-base text-xs py-1.5 px-3 min-w-[140px]"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map((b) => {
                  const val = typeof b === 'string' ? b : b.code || b._id;
                  const label = typeof b === 'string' ? b : b.code || b.name;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sem-select" className="text-xs font-medium text-ink-secondary shrink-0">
                Semester:
              </label>
              <select
                id="sem-select"
                className="input-base text-xs py-1.5 px-3 min-w-[130px]"
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
              >
                <option value="all">All Semesters</option>
                {semestersList.map((sem) => (
                  <option key={sem} value={sem}>
                    Sem {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Sem Pills */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto custom-scrollbar">
          <span className="text-xs font-semibold text-ink-secondary shrink-0 mr-1">
            Quick Sem:
          </span>
          <button
            onClick={() => setSelectedSem('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
              selectedSem === 'all'
                ? 'bg-brand text-white border-brand'
                : 'bg-surface text-ink-secondary border-border-subtle hover:bg-canvas'
            }`}
          >
            All
          </button>
          {semestersList.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSem(sem.toString())}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
                selectedSem === sem.toString()
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface text-ink-secondary border-border-subtle hover:bg-canvas'
              }`}
            >
              Sem {sem}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Search & Status Filter Bar ─── */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative w-full md:w-80">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="input-base pl-9 text-xs py-2 w-full"
            placeholder="Search student by name, enrollment no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Right: Status filter tabs + Refresh */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="inline-flex rounded-md p-1 bg-slate-100 border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-surface text-ink-primary shadow-2xs font-semibold'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('cleared')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'cleared'
                  ? 'bg-surface text-emerald-700 shadow-2xs font-semibold'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Cleared
            </button>
            <button
              onClick={() => setStatusFilter('not_cleared')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'not_cleared'
                  ? 'bg-surface text-amber-700 shadow-2xs font-semibold'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Action Pending
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStudents}
            icon={<HiOutlineArrowPath className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Floating Bulk Selection Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <HiOutlineCheckBadge className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">
              {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedStudentIds([])}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded hover:bg-emerald-100/70"
            >
              Deselect All
            </button>
            <Button
              variant="primary"
              size="sm"
              loading={bulkLoading}
              onClick={handleBulkMarkClearedSelected}
              className="!bg-emerald-600 hover:!bg-emerald-700 text-white font-semibold text-xs shadow-xs"
            >
              Grant Disciplinary Clearance ({selectedStudentIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* ─── Main Table Container ─── */}
      <div className="bg-surface border border-border-subtle rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={HiOutlineShieldCheck}
            title="No Disciplinary Records Found"
            description="No student records match the active search criteria or filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setSelectedBranch('all');
                  setSelectedSem('all');
                }}
              >
                Reset Filters
              </Button>
            }
          />
        ) : (
          <Table columns={columns} data={students} keyExtractor={(item) => item.student.id || item.student._id} />
        )}
      </div>

      {/* ─── Single Student Update Modal ─── */}
      {isModalOpen && selectedStudent && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`Manage Disciplinary Status — ${selectedStudent.student.name}`}
          size="md"
        >
          {modalLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSaveStatus} className="space-y-5">
              {/* Student Header Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap justify-between items-center text-xs gap-2">
                <div>
                  <p className="font-semibold text-ink-primary">{selectedStudent.student.name}</p>
                  <p className="text-ink-muted">{selectedStudent.student.email}</p>
                </div>
                <div className="text-right">
                  <span className="font-tabular font-medium text-slate-700 block">
                    {selectedStudent.student.enrollmentNo}
                  </span>
                  <span className="text-ink-muted text-[11px]">
                    {selectedStudent.student.program} - Sem {selectedStudent.student.currentSemester} ({selectedStudent.student.section || 'A'})
                  </span>
                </div>
              </div>

              {/* Status Radio Choice */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-2">
                  Disciplinary Clearance Status:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      disciplinaryStatus === 'cleared'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-surface border-border-subtle text-ink-secondary hover:bg-canvas'
                    }`}
                  >
                    <input
                      type="radio"
                      name="disciplinaryStatus"
                      value="cleared"
                      checked={disciplinaryStatus === 'cleared'}
                      onChange={() => setDisciplinaryStatus('cleared')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs">Cleared</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      disciplinaryStatus === 'not_cleared'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                        : 'bg-surface border-border-subtle text-ink-secondary hover:bg-canvas'
                    }`}
                  >
                    <input
                      type="radio"
                      name="disciplinaryStatus"
                      value="not_cleared"
                      checked={disciplinaryStatus === 'not_cleared'}
                      onChange={() => setDisciplinaryStatus('not_cleared')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs">Not Cleared (Action Pending)</span>
                  </label>
                </div>
              </div>


              {/* Remark Details */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                  Remarks / Disciplinary Notes:
                </label>
                <textarea
                  rows={3}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Enter details regarding fine amount, misconduct ticket number, or NOC notes..."
                  className="input-base text-xs p-3 w-full"
                />
              </div>

              {/* Audit Trail Timeline */}
              {selectedStudent.auditTrail && selectedStudent.auditTrail.length > 0 && (
                <div className="pt-3 border-t border-border-subtle space-y-2">
                  <p className="text-xs font-bold text-ink-primary flex items-center gap-1.5">
                    <HiOutlineClock className="w-3.5 h-3.5 text-ink-muted" /> Audit Log History
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {selectedStudent.auditTrail.map((log, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-semibold text-ink-primary">
                          <span>{log.changed_by_name || 'Disciplinary Head'}</span>
                          <span className="text-ink-muted font-normal">
                            {log.changed_at ? new Date(log.changed_at).toLocaleString('en-IN') : ''}
                          </span>
                        </div>
                        <p className="text-ink-secondary">{log.remark_text || 'Status updated'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <Button variant="secondary" size="sm" type="button" onClick={handleCloseModal} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={saving}>
                  Save Disciplinary Status
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

    </DashboardLayout>
  );
}
