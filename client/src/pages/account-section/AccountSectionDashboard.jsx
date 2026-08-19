import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCurrencyRupee,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

export default function AccountSectionDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Branch & Semester Filter State
  const [selectedBranch, setSelectedBranch] = useState('all'); // 'all' or program code/id
  const [selectedSem, setSelectedSem] = useState('all'); // 'all' or semester number (1-8)
  const [branches, setBranches] = useState([]);
  const [semestersList, setSemestersList] = useState([1, 2, 3, 4, 5, 6, 7, 8]);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State inside Modal
  const [feesStatus, setFeesStatus] = useState('not_paid'); // 'paid' | 'not_paid'
  const [reason, setReason] = useState('fees_pending'); // 'fees_pending' | 'remark'
  const [remarkText, setRemarkText] = useState('');
  const [auditTrail, setAuditTrail] = useState([]);

  // Mock data fallback handler
  const mockStudents = [
    {
      student: {
        id: 'mock1',
        _id: 'mock1',
        name: 'Rahul Verma',
        email: 'student@sbjit.edu.in',
        enrollmentNo: 'EN2021CSE042',
        section: 'A',
        currentSemester: 6,
        program: 'CSE',
      },
      fees_status: 'not_paid',
      reason: 'fees_pending',
      remark_text: 'Fees pending for Sem 6',
      updated_by: { name: 'Account Section Admin' },
      updated_at: new Date().toISOString(),
      auditTrail: [
        {
          status: 'not_paid',
          reason: 'fees_pending',
          remark_text: 'Fees pending for Sem 6',
          changed_by_name: 'Account Section Admin',
          changed_at: new Date().toISOString(),
        },
      ],
    },
    {
      student: {
        id: 'mock2',
        _id: 'mock2',
        name: 'Priya Sharma',
        email: 'priya@sbjit.edu.in',
        enrollmentNo: 'EN2021CSE088',
        section: 'B',
        currentSemester: 6,
        program: 'CSE',
      },
      fees_status: 'paid',
      reason: null,
      remark_text: 'Fees cleared',
      updated_by: { name: 'Account Section Admin' },
      updated_at: new Date().toISOString(),
      auditTrail: [
        {
          status: 'paid',
          reason: null,
          remark_text: 'Fees cleared',
          changed_by_name: 'Account Section Admin',
          changed_at: new Date().toISOString(),
        },
      ],
    },
    {
      student: {
        id: 'mock3',
        _id: 'mock3',
        name: 'Amit Patel',
        email: 'amit@sbjit.edu.in',
        enrollmentNo: 'EN2022AIDS015',
        section: 'A',
        currentSemester: 4,
        program: 'AI&DS',
      },
      fees_status: 'not_paid',
      reason: 'remark',
      remark_text: 'Pending Bus Fee Rs 5000',
      updated_by: { name: 'Account Section Admin' },
      updated_at: new Date().toISOString(),
      auditTrail: [
        {
          status: 'not_paid',
          reason: 'remark',
          remark_text: 'Pending Bus Fee Rs 5000',
          changed_by_name: 'Account Section Admin',
          changed_at: new Date().toISOString(),
        },
      ],
    },
  ];

  // Fetch branches metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const res = await api.get('/account-section/branches');
      if (res.data && res.data.data) {
        setBranches(res.data.data.programs || []);
      }
    } catch (err) {
      console.warn('Metadata fetch fallback:', err.message);
      setBranches([
        { _id: 'cse', code: 'CSE', name: 'Computer Science & Engineering' },
        { _id: 'aids', code: 'AI&DS', name: 'Artificial Intelligence & Data Science' },
        { _id: 'ece', code: 'ECE', name: 'Electronics & Communication' },
        { _id: 'me', code: 'ME', name: 'Mechanical Engineering' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedSem !== 'all') params.sem = selectedSem;

      const res = await api.get('/account-section/students', { params });
      if (res.data && res.data.data) {
        setStudents(res.data.data);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.warn('API call failed, fallback to mock state:', err.message);
      // Filter mock students
      let filtered = [...mockStudents];
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.student.name.toLowerCase().includes(q) ||
            s.student.enrollmentNo.toLowerCase().includes(q) ||
            s.student.email.toLowerCase().includes(q)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter((s) => s.fees_status === statusFilter);
      }
      if (selectedBranch !== 'all') {
        filtered = filtered.filter(
          (s) => s.student.program === selectedBranch || s.student.programId === selectedBranch
        );
      }
      if (selectedSem !== 'all') {
        filtered = filtered.filter(
          (s) => String(s.student.currentSemester) === String(selectedSem)
        );
      }
      setStudents(filtered);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedBranch, selectedSem]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Open Manage Fees Modal
  const handleOpenModal = async (item) => {
    setSelectedStudent(item);
    setIsModalOpen(true);
    setModalLoading(true);

    try {
      const res = await api.get(`/account-section/students/${item.student.id || item.student._id}`);
      const data = res.data?.data;
      if (data) {
        setFeesStatus(data.fees_status || 'not_paid');
        setReason(data.reason || 'fees_pending');
        setRemarkText(data.remark_text || '');
        setAuditTrail(data.auditTrail || []);
      }
    } catch (err) {
      // Use existing item values
      setFeesStatus(item.fees_status || 'not_paid');
      setReason(item.reason || 'fees_pending');
      setRemarkText(item.remark_text || '');
      setAuditTrail(item.auditTrail || []);
    } finally {
      setModalLoading(false);
    }
  };

  // Save Fee Status Update
  const handleSaveFees = async () => {
    if (feesStatus === 'not_paid' && reason === 'remark' && !remarkText.trim()) {
      toast.error('Please enter a remark explaining the fee status.');
      return;
    }

    setSaving(true);
    const studentId = selectedStudent.student.id || selectedStudent.student._id;
    const payload = {
      status: feesStatus,
      ...(feesStatus === 'not_paid' ? { reason, remark_text: remarkText.trim() } : {}),
    };

    try {
      const res = await api.patch(`/account-section/students/${studentId}/fees`, payload);
      const updatedData = res.data?.data;

      toast.success(
        feesStatus === 'paid' ? 'Student fees marked as Paid' : 'Student fee status updated to Not Paid'
      );

      // Update student row in state inline
      setStudents((prev) =>
        prev.map((s) => {
          const sId = s.student.id || s.student._id;
          if (sId === studentId) {
            return {
              ...s,
              fees_status: feesStatus,
              reason: feesStatus === 'paid' ? null : reason,
              remark_text: feesStatus === 'paid' ? 'Fees cleared' : reason === 'remark' ? remarkText.trim() : 'Fees pending',
              updated_at: new Date().toISOString(),
              auditTrail: updatedData?.auditTrail || [
                ...(s.auditTrail || []),
                {
                  status: feesStatus,
                  reason: feesStatus === 'paid' ? null : reason,
                  remark_text: feesStatus === 'paid' ? 'Fees cleared' : remarkText.trim(),
                  changed_by_name: 'Account Section Admin',
                  changed_at: new Date().toISOString(),
                },
              ],
            };
          }
          return s;
        })
      );

      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update fee clearance status');
    } finally {
      setSaving(false);
    }
  };

  // Calculated Metrics
  const totalCount = students.length;
  const paidCount = students.filter((s) => s.fees_status === 'paid').length;
  const pendingCount = students.filter((s) => s.fees_status === 'not_paid').length;

  const columns = [
    {
      key: 'name',
      label: 'Student',
      render: (_, row) => (
        <div>
          <p className="text-sm font-semibold text-ink-primary">{row.student.name}</p>
          <p className="text-xs text-ink-muted">{row.student.email}</p>
        </div>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment No',
      render: (_, row) => (
        <span className="text-sm font-mono text-ink-secondary font-medium">
          {row.student.enrollmentNo}
        </span>
      ),
    },
    {
      key: 'program',
      label: 'Program / Sem',
      render: (_, row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-100 text-ink-secondary border border-surface-200">
          {row.student.program} - Sem {row.student.currentSemester} ({row.student.section})
        </span>
      ),
    },
    {
      key: 'fees_status',
      label: 'Fees Status',
      render: (val, row) => {
        if (val === 'paid') {
          return (
            <Badge variant="success" className="gap-1.5 py-1 px-3">
              <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Paid</span>
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="gap-1.5 py-1 px-3">
            <HiOutlineExclamationCircle className="w-4 h-4 text-amber-600" />
            <span>
              Not Paid {row.reason === 'remark' ? `(${row.remark_text || 'Remark'})` : ''}
            </span>
          </Badge>
        );
      },
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (val) => (
        <span className="text-xs text-ink-muted">
          {val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<HiOutlinePencilSquare className="w-4 h-4" />}
          onClick={() => handleOpenModal(row)}
        >
          Manage Fees
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Account Section — Fee Clearance">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-ink-primary mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center text-ink-secondary">
            <HiOutlineCurrencyRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Fees Cleared</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{paidCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
            <HiOutlineCheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Fees Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
            <HiOutlineExclamationCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Branch & Semester Selection Bar */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-subtle pb-4">
          <div>
            <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">
              Branch & Semester Filter
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Select student branch and academic semester to view fee status records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Branch / Program Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-secondary whitespace-nowrap">Branch:</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input-base text-xs font-semibold py-1.5 px-3 rounded-lg border border-surface-300 bg-white text-ink-primary focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id || b.code} value={b.code || b._id}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-secondary whitespace-nowrap">Semester:</label>
              <select
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
                className="input-base text-xs font-semibold py-1.5 px-3 rounded-lg border border-surface-300 bg-white text-ink-primary focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Semesters</option>
                {semestersList.map((semNum) => (
                  <option key={semNum} value={String(semNum)}>
                    Semester {semNum}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Semester Quick-Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-ink-secondary whitespace-nowrap shrink-0">Quick Sem:</span>
          <button
            type="button"
            onClick={() => setSelectedSem('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
              selectedSem === 'all'
                ? 'bg-primary-600 text-white border-primary-700 shadow-xs font-bold'
                : 'bg-white text-ink-secondary hover:bg-surface-100 hover:text-ink-primary border-surface-300'
            }`}
          >
            All Semesters
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
            const isActive = String(selectedSem) === String(semNum);
            return (
              <button
                key={semNum}
                type="button"
                onClick={() => setSelectedSem(String(semNum))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                  isActive
                    ? 'bg-primary-600 text-white border-primary-700 shadow-xs font-bold'
                    : 'bg-white text-ink-secondary hover:bg-surface-100 hover:text-ink-primary border-surface-300'
                }`}
              >
                Sem {semNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Controls */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            className="input-base pl-9 w-full"
            placeholder="Search student by name, enrollment no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-surface-100 p-1 rounded-lg border border-surface-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-ink-primary shadow-xs border border-surface-200'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('not_paid')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                statusFilter === 'not_paid'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Not Paid
            </button>
          </div>

          <Button
            variant="tertiary"
            size="sm"
            icon={<HiOutlineArrowPath className="w-4 h-4" />}
            onClick={fetchStudents}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <Skeleton rows={6} columns={6} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<HiOutlineCurrencyRupee className="w-10 h-10" />}
          title="No students found"
          description="No student records match the current search or filter criteria."
        />
      ) : (
        <Table columns={columns} data={students} />
      )}

      {/* Fee Status Management Modal */}
      {isModalOpen && selectedStudent && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Manage Student Fee Clearance"
          size="lg"
        >
          {modalLoading ? (
            <Skeleton rows={4} columns={2} />
          ) : (
            <div className="space-y-6">
              {/* Student Header */}
              <div className="p-4 rounded-xl bg-surface-100 border border-surface-200 flex justify-between items-center">
                <div>
                  <p className="text-base font-bold text-ink-primary">{selectedStudent.student.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Enrollment: <span className="font-mono font-semibold">{selectedStudent.student.enrollmentNo}</span> | Section: {selectedStudent.student.section}
                  </p>
                </div>
                <Badge variant={feesStatus === 'paid' ? 'success' : 'warning'}>
                  {feesStatus === 'paid' ? 'Paid' : 'Not Paid'}
                </Badge>
              </div>

              {/* Status Selector Segmented Control */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Select Fee Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFeesStatus('paid')}
                    className={`py-3 px-4 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      feesStatus === 'paid'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-surface border-border-subtle text-ink-secondary hover:border-surface-300'
                    }`}
                  >
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Paid (Clear Fees)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeesStatus('not_paid')}
                    className={`py-3 px-4 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      feesStatus === 'not_paid'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                        : 'bg-surface border-border-subtle text-ink-secondary hover:border-surface-300'
                    }`}
                  >
                    <HiOutlineExclamationCircle className="w-5 h-5 text-amber-600" />
                    <span>Not Paid (Pending)</span>
                  </button>
                </div>
              </div>

              {/* Sub-options if Not Paid */}
              {feesStatus === 'not_paid' && (
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-800">
                    Not Paid Sub-Option
                  </label>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                      <input
                        type="radio"
                        name="notPaidReason"
                        value="fees_pending"
                        checked={reason === 'fees_pending'}
                        onChange={() => setReason('fees_pending')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Fees Pending (Default Status Flag)</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm font-medium text-amber-900 cursor-pointer">
                      <input
                        type="radio"
                        name="notPaidReason"
                        value="remark"
                        checked={reason === 'remark'}
                        onChange={() => setReason('remark')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Add Custom Remark / Reason</span>
                    </label>
                  </div>

                  {reason === 'remark' && (
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Remark Text <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={remarkText}
                        onChange={(e) => setRemarkText(e.target.value)}
                        placeholder="e.g. Tuition fee second installment pending of Rs 15,000..."
                        className="w-full text-sm p-3 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-ink-primary"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Audit Trail Timeline */}
              <div className="pt-2 border-t border-border-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <HiOutlineClock className="w-4 h-4 text-ink-muted" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Fee Status Audit History
                  </h4>
                </div>

                {auditTrail.length === 0 ? (
                  <p className="text-xs text-ink-muted italic">No previous status changes recorded.</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {auditTrail.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-surface-50 border border-surface-200 text-xs flex justify-between items-start"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                log.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {log.status === 'paid' ? 'Paid' : 'Not Paid'}
                            </span>
                            {log.reason && (
                              <span className="text-ink-muted">({log.reason})</span>
                            )}
                          </div>
                          {log.remark_text && (
                            <p className="text-ink-secondary mt-1 font-medium">{log.remark_text}</p>
                          )}
                          <p className="text-[11px] text-ink-muted mt-1">
                            Updated by: {log.changed_by_name || 'Account Admin'}
                          </p>
                        </div>

                        <span className="text-[10px] text-ink-muted whitespace-nowrap">
                          {log.changed_at
                            ? new Date(log.changed_at).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <Button variant="tertiary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={saving} onClick={handleSaveFees}>
                  Save Fee Clearance Status
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </DashboardLayout>
  );
}
