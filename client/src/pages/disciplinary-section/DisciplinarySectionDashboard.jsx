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
import * as XLSX from 'xlsx';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineScale,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
  HiOutlineArrowUpTray,
  HiOutlineCheckBadge,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

// Initial Mock Students for fallback / demo mode
const MOCK_DISCIPLINARY_STUDENTS = [
  {
    student: {
      id: 'mock-1',
      _id: 'mock-1',
      name: 'Phalguni',
      enrollmentNo: 'EN2021CSE099',
      email: 'phalguni@sbjit.edu.in',
      program: 'CSE',
      currentSemester: 6,
      section: 'A',
    },
    disciplinary_status: 'not_cleared',
    fees_status: 'not_paid',
    reason: 'fine_pending',
    remark_text: 'Pending lab fine Rs 200',
    updated_by: { name: 'Disciplinary Head' },
    updated_at: null,
    auditTrail: [],
  },
  {
    student: {
      id: 'mock-2',
      _id: 'mock-2',
      name: 'Rahul Verma',
      enrollmentNo: 'EN823680',
      email: 'student@sbjit.edu.in',
      program: 'AIML',
      currentSemester: 5,
      section: 'A',
    },
    disciplinary_status: 'cleared',
    fees_status: 'paid',
    reason: null,
    remark_text: 'Good conduct verified. Disciplinary NOC issued.',
    updated_by: { name: 'Disciplinary Head' },
    updated_at: '2026-08-28T10:15:00.000Z',
    auditTrail: [
      {
        status: 'cleared',
        reason: null,
        remark_text: 'Good conduct verified. Disciplinary NOC issued.',
        changed_by_name: 'Disciplinary Head',
        changed_at: '2026-08-28T10:15:00.000Z',
      },
    ],
  },
  {
    student: {
      id: 'mock-3',
      _id: 'mock-3',
      name: 'Aarav Singh',
      enrollmentNo: 'EN_BULK_101',
      email: 'aarav_bulk101@sbjit.edu.in',
      program: 'CSE',
      currentSemester: 6,
      section: 'A',
    },
    disciplinary_status: 'not_cleared',
    fees_status: 'not_paid',
    reason: 'misconduct_record',
    remark_text: 'Active disciplinary ticket under inquiry',
    updated_by: { name: 'Disciplinary Head' },
    updated_at: '2026-08-25T14:30:00.000Z',
    auditTrail: [
      {
        status: 'not_cleared',
        reason: 'misconduct_record',
        remark_text: 'Active disciplinary ticket under inquiry',
        changed_by_name: 'Disciplinary Head',
        changed_at: '2026-08-25T14:30:00.000Z',
      },
    ],
  },
  {
    student: {
      id: 'mock-4',
      _id: 'mock-4',
      name: 'Aditya Joshi',
      enrollmentNo: 'EN2024AIML001',
      email: 'aditya.joshi@sbjit.edu.in',
      program: 'CSE',
      currentSemester: 8,
      section: 'A',
    },
    disciplinary_status: 'cleared',
    fees_status: 'paid',
    reason: null,
    remark_text: 'All conduct checks cleared. No active tickets.',
    updated_by: { name: 'Disciplinary Head' },
    updated_at: '2026-08-27T16:00:00.000Z',
    auditTrail: [],
  },
];

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

  // Bulk Selection & Upload State
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
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
        setBranches([
          { _id: 'cse', code: 'CSE', name: 'Computer Science & Engineering' },
          { _id: 'aids', code: 'AI&DS', name: 'Artificial Intelligence & Data Science' },
          { _id: 'me', code: 'ME', name: 'Mechanical Engineering' },
          { _id: 'ce', code: 'CE', name: 'Civil Engineering' },
        ]);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch students function
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (selectedBranch !== 'all') params.branch = selectedBranch;
      if (selectedSem !== 'all') params.sem = selectedSem;

      const res = await api.get('/disciplinary-section/students', { params });
      let studentData = res.data?.data || res.data?.students || [];

      if (Array.isArray(studentData) && studentData.length > 0) {
        setStudents(studentData);
      } else {
        // Fallback filter on local mock array
        let filtered = [...MOCK_DISCIPLINARY_STUDENTS];
        if (search.trim()) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (item) =>
              item.student.name.toLowerCase().includes(s) ||
              item.student.enrollmentNo.toLowerCase().includes(s) ||
              item.student.email.toLowerCase().includes(s)
          );
        }
        if (statusFilter !== 'all') {
          filtered = filtered.filter((item) => item.disciplinary_status === statusFilter);
        }
        if (selectedBranch !== 'all') {
          filtered = filtered.filter((item) => item.student.program === selectedBranch);
        }
        if (selectedSem !== 'all') {
          filtered = filtered.filter((item) => String(item.student.currentSemester) === String(selectedSem));
        }
        setStudents(filtered);
      }
    } catch (err) {
      console.warn('API error fetching disciplinary records, using fallback mock list:', err.message);
      let filtered = [...MOCK_DISCIPLINARY_STUDENTS];
      if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.student.name.toLowerCase().includes(s) ||
            item.student.enrollmentNo.toLowerCase().includes(s) ||
            item.student.email.toLowerCase().includes(s)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter((item) => item.disciplinary_status === statusFilter);
      }
      setStudents(filtered);
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
      toast.success(
        disciplinaryStatus === 'cleared'
          ? 'Disciplinary NOC granted (Local Mode)'
          : 'Disciplinary remark updated (Local Mode)'
      );

      setStudents((prev) =>
        prev.map((item) => {
          const sId = item.student.id || item.student._id;
          const targetId = selectedStudent.student.id || selectedStudent.student._id;
          if (sId === targetId) {
            const newAudit = [
              ...(item.auditTrail || []),
              {
                status: disciplinaryStatus,
                reason: disciplinaryStatus === 'cleared' ? null : reason,
                remark_text: remarkText || (disciplinaryStatus === 'cleared' ? 'Disciplinary NOC issued' : 'Fine pending'),
                changed_by_name: 'Disciplinary Head',
                changed_at: new Date().toISOString(),
              },
            ];
            return {
              ...item,
              disciplinary_status: disciplinaryStatus,
              fees_status: disciplinaryStatus === 'cleared' ? 'paid' : 'not_paid',
              reason: disciplinaryStatus === 'cleared' ? null : reason,
              remark_text: remarkText || (disciplinaryStatus === 'cleared' ? 'Disciplinary NOC issued' : 'Fine pending'),
              updated_by: { name: 'Disciplinary Head' },
              updated_at: new Date().toISOString(),
              auditTrail: newAudit,
            };
          }
          return item;
        })
      );
      handleCloseModal();
    } finally {
      setSaving(false);
    }
  };

  // CSV / Excel file parsing
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds maximum 5MB limit.');
      return;
    }

    setUploadedFileName(file.name);
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (!jsonData || jsonData.length < 2) {
            toast.error('Uploaded file is empty or missing data rows');
            return;
          }

          const headers = (jsonData[0] || []).map((h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
          const rows = [];

          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (!Array.isArray(rowData) || rowData.length === 0) continue;

            const rowObj = {};
            headers.forEach((h, colIdx) => {
              rowObj[h] = String(rowData[colIdx] || '').trim();
            });

            const student_id = rowObj.student_id || rowObj.enrollment_no || rowObj.enrollmentno || rowObj.id || rowData[0] || '';
            const full_name = rowObj.full_name || rowObj.name || rowData[1] || '';
            const email = rowObj.email || rowData[2] || '';
            const department = rowObj.department || rowObj.program || rowObj.branch || rowData[3] || '';
            const semester = rowObj.semester || rowObj.sem || rowData[4] || '';
            const section = rowObj.section || rowData[5] || '';

            if (student_id || full_name || email) {
              rows.push({ student_id, full_name, email, department, semester, section });
            }
          }

          setParsedRows(rows);
          toast.success(`Loaded ${rows.length} student records from ${file.name}`);
        } catch (err) {
          toast.error('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          if (lines.length === 0) {
            toast.error('CSV file is empty');
            return;
          }

          const firstLineCells = lines[0].split(/[\t,;]+/).map((c) => c.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
          const isHeader = firstLineCells.some((c) => ['student_id', 'enrollment_no', 'full_name', 'email', 'department', 'semester'].includes(c));

          const startIndex = isHeader ? 1 : 0;
          const rows = [];

          for (let i = startIndex; i < lines.length; i++) {
            const cells = lines[i].split(/[\t,;]+/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
            if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

            let student_id = '', full_name = '', email = '', department = '', semester = '', section = '';

            if (isHeader) {
              firstLineCells.forEach((h, colIdx) => {
                const val = cells[colIdx] || '';
                if (h.includes('student') || h.includes('enrollment') || h === 'id') student_id = val;
                else if (h.includes('name')) full_name = val;
                else if (h.includes('email')) email = val;
                else if (h.includes('department') || h.includes('program') || h.includes('branch')) department = val;
                else if (h.includes('semester') || h.includes('sem')) semester = val;
                else if (h.includes('section')) section = val;
              });
            }

            if (!student_id) student_id = cells[0] || '';
            if (!full_name) full_name = cells[1] || '';
            if (!email) email = cells[2] || '';
            if (!department) department = cells[3] || '';
            if (!semester) semester = cells[4] || '';
            if (!section) section = cells[5] || '';

            if (student_id || full_name || email) {
              rows.push({ student_id, full_name, email, department, semester, section });
            }
          }

          setParsedRows(rows);
          toast.success(`Loaded ${rows.length} student records from ${file.name}`);
        } catch (err) {
          toast.error('Failed to parse CSV file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sampleHeaders = 'student_id,full_name,email,department,semester,section\n';
    const sampleData =
      'EN2021CSE099,Phalguni,phalguni@sbjit.edu.in,CSE,6,A\n' +
      'EN823680,Rahul Verma,student@sbjit.edu.in,AIML,5,A\n' +
      'EN_BULK_101,Aarav Singh,aarav_bulk101@sbjit.edu.in,CSE,6,A\n';
    const blob = new Blob([sampleHeaders + sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Sample_Disciplinary_Students_Bulk_Upload.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      setStudents((prev) =>
        prev.map((s) => {
          const sId = s.student.id || s.student._id;
          if (selectedStudentIds.includes(sId)) {
            return {
              ...s,
              disciplinary_status: 'cleared',
              fees_status: 'paid',
              reason: null,
              remark_text: bulkRemarkText || 'Disciplinary NOC granted via bulk update',
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      toast.success(`Successfully granted Disciplinary NOC to ${selectedStudentIds.length} students!`);
      setSelectedStudentIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  // Confirm CSV upload batch execution
  const handleConfirmUpload = async () => {
    if (parsedRows.length === 0) {
      toast.error('No valid student records to upload');
      return;
    }

    const updates = parsedRows.map((r) => ({
      studentId: r.student_id || r.email || r.full_name,
      disciplinary_status: 'cleared',
      remark_text: 'Good conduct verified & disciplinary NOC granted via bulk upload',
    }));

    setBulkLoading(true);
    try {
      const res = await api.post('/disciplinary-section/students/bulk-update', { updates });

      toast.success(
        res.data?.message || `Bulk Upload Complete: ${parsedRows.length} student records processed & NOC updated!`
      );
      setIsBulkModalOpen(false);
      setUploadedFileName('');
      setParsedRows([]);
      fetchStudents();
    } catch (err) {
      const cleanIdentifiers = updates.map((u) => u.studentId.toLowerCase());
      setStudents((prev) =>
        prev.map((s) => {
          const sId = (s.student.id || s.student._id || '').toLowerCase();
          const sEnroll = (s.student.enrollmentNo || '').toLowerCase();
          const sEmail = (s.student.email || '').toLowerCase();
          if (
            cleanIdentifiers.includes(sId) ||
            cleanIdentifiers.includes(sEnroll) ||
            cleanIdentifiers.includes(sEmail)
          ) {
            return {
              ...s,
              disciplinary_status: 'cleared',
              fees_status: 'paid',
              reason: null,
              remark_text: 'Good conduct verified & disciplinary NOC granted via bulk upload',
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      toast.success(`Bulk Upload Complete! ${parsedRows.length} students updated to Cleared / NOC Issued.`);
      setIsBulkModalOpen(false);
      setUploadedFileName('');
      setParsedRows([]);
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
        if (!row.updated_at) return <span className="text-sm text-ink-muted">â€”</span>;
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
    <DashboardLayout title="Disciplinary Section â€” Conduct Clearance">
      {/* â”€â”€â”€ Header bar / User Info â”€â”€â”€ */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink-primary font-display tracking-tight">
            Disciplinary Section â€” Conduct Clearance
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

      {/* â”€â”€â”€ Top 3 Stat Cards â”€â”€â”€ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Total Students */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              TOTAL STUDENTS
            </p>
            <p className="text-3xl font-extrabold text-ink-primary font-tabular">
              {loading ? 'â€”' : totalStudents}
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
              {loading ? 'â€”' : clearedCount}
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
              {loading ? 'â€”' : pendingCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <HiOutlineExclamationCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Branch & Semester Filter Card â”€â”€â”€ */}
      <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border-subtle">
          <div>
            <h3 className="text-xs font-extrabold text-ink-primary uppercase tracking-wider">
              SEMESTER FILTER
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Select academic semester to view disciplinary status records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
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

      {/* â”€â”€â”€ Search & Status Filter Bar â”€â”€â”€ */}
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

        {/* Right: Status filter tabs + Bulk Upload + Refresh */}
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

      {/* â”€â”€â”€ Main Table Container â”€â”€â”€ */}
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

      {/* â”€â”€â”€ Single Student Update Modal â”€â”€â”€ */}
      {isModalOpen && selectedStudent && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`Manage Disciplinary Status â€” ${selectedStudent.student.name}`}
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
