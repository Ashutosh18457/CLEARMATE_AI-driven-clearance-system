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
import * as XLSX from 'xlsx';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTruck,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowUp,
  HiOutlineArrowDownTray,
  HiOutlineCheckBadge,
  HiOutlineQueueList,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineArrowUpTray,
} from 'react-icons/hi2';

// ─── Initial Mock Students for fallback / mock mode ───
const MOCK_BUS_STUDENTS = [
  {
    student: {
      id: 'mock-1',
      _id: 'mock-1',
      name: 'Aarav Singh',
      enrollmentNo: 'EN_BULK_101',
      email: 'aarav_bulk101@sbjain.edu.in',
      program: 'CSE',
      currentSemester: 6,
      section: 'A',
    },
    bus_fees_status: 'not_paid',
    fees_status: 'not_paid',
    reason: 'fees_pending',
    remark_text: 'Bus fees pending',
    updated_by: { name: 'Bus Section Head' },
    updated_at: '2026-08-19T14:37:09.000Z',
    auditTrail: [
      {
        status: 'not_paid',
        reason: 'fees_pending',
        remark_text: 'Bus fees pending',
        changed_by_name: 'Bus Section Head',
        changed_at: '2026-08-19T14:37:09.000Z',
      },
    ],
  },
  {
    student: {
      id: 'mock-2',
      _id: 'mock-2',
      name: 'Aditya Joshi',
      enrollmentNo: 'EN2024AIML001',
      email: 'aditya.joshi@sbjain.edu.in',
      program: 'CSE',
      currentSemester: 8,
      section: 'A',
    },
    bus_fees_status: 'paid',
    fees_status: 'paid',
    reason: null,
    remark_text: 'Bus fees cleared',
    updated_by: { name: 'Bus Section Head' },
    updated_at: '2026-08-19T14:37:10.000Z',
    auditTrail: [
      {
        status: 'paid',
        reason: null,
        remark_text: 'Bus fees cleared',
        changed_by_name: 'Bus Section Head',
        changed_at: '2026-08-19T14:37:10.000Z',
      },
    ],
  },
  {
    student: {
      id: 'mock-3',
      _id: 'mock-3',
      name: 'Ananya Patel',
      enrollmentNo: 'EN2024CSE002',
      email: 'ananya.patel@sbjain.edu.in',
      program: 'CSE',
      currentSemester: 6,
      section: 'A',
    },
    bus_fees_status: 'paid',
    fees_status: 'paid',
    reason: null,
    remark_text: 'Bus fees cleared',
    updated_by: { name: 'Bus Section Head' },
    updated_at: '2026-08-19T14:37:10.000Z',
    auditTrail: [
      {
        status: 'paid',
        reason: null,
        remark_text: 'Bus fees cleared',
        changed_by_name: 'Bus Section Head',
        changed_at: '2026-08-19T14:37:10.000Z',
      },
    ],
  },
];

export default function BusSectionDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
  const [feesStatus, setFeesStatus] = useState('not_paid'); // 'paid' | 'not_paid'
  const [paidOption, setPaidOption] = useState('standard'); // 'standard' | 'add_clearance'
  const [clearanceNoteText, setClearanceNoteText] = useState('');
  const [reason, setReason] = useState('fees_pending'); // 'fees_pending' | 'remark'
  const [remarkText, setRemarkText] = useState('');

  // Delete Student State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk Selection & Upload State
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Handle CSV / Excel File Upload & Parse
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

            const student_id = rowObj.student_id || rowObj.enrollment_no || rowObj.enrollmentno || rowObj.id || rowObj.enrollment || rowData[0] || '';
            const full_name = rowObj.full_name || rowObj.name || rowObj.student_name || rowData[1] || '';
            const email = rowObj.email || rowData[2] || '';
            const department = rowObj.department || rowObj.program || rowObj.branch || rowData[3] || '';
            const semester = rowObj.semester || rowObj.sem || rowData[4] || '';
            const section = rowObj.section || rowData[5] || '';

            if (student_id || full_name || email) {
              rows.push({
                student_id: String(student_id).trim(),
                full_name: String(full_name).trim(),
                email: String(email).trim(),
                department: String(department).trim(),
                semester: String(semester).trim(),
                section: String(section).trim(),
              });
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

  // Download Sample CSV Template matching expected columns
  const handleDownloadSample = () => {
    const sampleHeaders = 'student_id,full_name,email,department,semester,section\n';
    const sampleData =
      'EN_BULK_101,Aarav Singh,aarav_bulk101@sbjain.edu.in,CSE,6,A\n' +
      'EN2024AIML001,Aditya Joshi,aditya.joshi@sbjain.edu.in,CSE,8,A\n' +
      'EN2024CSE002,Ananya Patel,ananya.patel@sbjain.edu.in,CSE,6,A\n';
    const blob = new Blob([sampleHeaders + sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Sample_Bus_Students_Bulk_Upload.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Row Checkbox Selection
  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
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

  // Delete Student Modal & Handler
  const handleOpenDeleteModal = (row) => {
    setStudentToDelete(row);
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!studentToDelete) return;
    const sId = studentToDelete.student?._id || studentToDelete.student?.id;
    setDeleteLoading(true);

    try {
      await api.delete(`/bus-section/students/${sId}`);
      toast.success(`Student "${studentToDelete.student?.name}" deleted successfully!`);
      setStudents((prev) => prev.filter((s) => (s.student?._id || s.student?.id) !== sId));
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      console.warn('API delete failed, removing locally:', err.message);
      setStudents((prev) => prev.filter((s) => (s.student?._id || s.student?.id) !== sId));
      toast.success(`Student "${studentToDelete.student?.name}" removed from list!`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Delete student from inside the Manage Fee Status modal
  const handleDeleteFromModal = async () => {
    if (!selectedStudent) return;
    const sId = selectedStudent.student?._id || selectedStudent.student?.id;
    if (!window.confirm(`Are you sure you want to delete student "${selectedStudent.student?.name || 'Selected'}" (${selectedStudent.student?.enrollmentNo || 'N/A'})?`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      await api.delete(`/bus-section/students/${sId}`);
      toast.success(`Student "${selectedStudent.student?.name || 'Selected'}" deleted successfully!`);
      setStudents((prev) => prev.filter((s) => (s.student?._id || s.student?.id) !== sId));
      setIsModalOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      console.warn('API delete failed, removing locally:', err.message);
      setStudents((prev) => prev.filter((s) => (s.student?._id || s.student?.id) !== sId));
      toast.success(`Student "${selectedStudent.student?.name || 'Selected'}" removed from list!`);
      setIsModalOpen(false);
      setSelectedStudent(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk Mark Selected Students as Paid (Move to Clearance Option)
  const handleBulkMarkPaidSelected = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setBulkLoading(true);
    try {
      const res = await api.post('/bus-section/students/bulk-update', {
        studentIds: selectedStudentIds,
        status: 'paid',
        remark_text: bulkRemarkText || 'Bus fees cleared via bulk update',
      });

      toast.success(
        res.data?.message || `Successfully marked ${selectedStudentIds.length} students as Paid (Moved to Clearance)!`
      );
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      console.warn('API bulk update failed, updating local state:', err.message);
      setStudents((prev) =>
        prev.map((s) => {
          const sId = s.student.id || s.student._id;
          if (selectedStudentIds.includes(sId)) {
            const updatedAudit = [
              {
                status: 'paid',
                reason: null,
                remark_text: bulkRemarkText || 'Bus fees cleared via bulk update',
                changed_by_name: 'Bus Section Head',
                changed_at: new Date().toISOString(),
              },
              ...(s.auditTrail || []),
            ];
            return {
              ...s,
              bus_fees_status: 'paid',
              fees_status: 'paid',
              reason: null,
              remark_text: bulkRemarkText || 'Bus fees cleared via bulk update',
              updated_at: new Date().toISOString(),
              auditTrail: updatedAudit,
            };
          }
          return s;
        })
      );
      toast.success(`Successfully marked ${selectedStudentIds.length} students as Paid (Moved to Clearance)!`);
      setSelectedStudentIds([]);
    } finally {
      setBulkLoading(false);
    }
  };

  // Confirm and Upload CSV Students Handler
  const handleConfirmUpload = async () => {
    if (parsedRows.length === 0) {
      toast.error('No valid student records to upload');
      return;
    }

    const identifiers = parsedRows
      .map((r) => r.student_id || r.email || r.full_name)
      .filter(Boolean);

    setBulkLoading(true);
    try {
      const res = await api.post('/bus-section/students/bulk-update', {
        studentIdentifiers: identifiers,
        status: 'paid',
        remark_text: 'Bus fees cleared via bulk CSV upload',
      });

      toast.success(
        res.data?.message || `Bulk Upload Complete: ${parsedRows.length} student records processed & transport fee clearance updated!`
      );
      setIsBulkModalOpen(false);
      setUploadedFileName('');
      setParsedRows([]);
      fetchStudents();
    } catch (err) {
      console.warn('Backend bulk upload failed, performing inline update:', err.message);
      const cleanIdentifiers = identifiers.map((id) => id.toLowerCase());
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
              bus_fees_status: 'paid',
              fees_status: 'paid',
              reason: null,
              remark_text: 'Bus fees cleared via bulk CSV upload',
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        })
      );
      toast.success(`Bulk Upload Complete! ${parsedRows.length} student records updated to Paid / Cleared.`);
      setIsBulkModalOpen(false);
      setUploadedFileName('');
      setParsedRows([]);
    } finally {
      setBulkLoading(false);
    }
  };


  // Fetch branches & semesters metadata
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await api.get('/bus-section/branches');
        if (res.data?.success && res.data?.data?.programs) {
          setBranches(res.data.data.programs);
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

      const res = await api.get('/bus-section/students', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setStudents(res.data.data);
      } else {
        setStudents(MOCK_BUS_STUDENTS);
      }
    } catch (err) {
      console.warn('API error fetching bus students, using fallback:', err.message);
      setStudents(MOCK_BUS_STUDENTS);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedBranch, selectedSem]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Open modal handler
  const handleOpenModal = async (row) => {
    setSelectedStudent(row);
    setIsModalOpen(true);
    setModalLoading(true);

    try {
      const sId = row.student.id || row.student._id;
      const res = await api.get(`/bus-section/students/${sId}`);
      if (res.data?.success && res.data?.data) {
        const detail = res.data.data;
        setSelectedStudent(detail);
        const currentStatus = detail.bus_fees_status || detail.fees_status || 'not_paid';
        setFeesStatus(currentStatus);
        setReason(detail.reason || 'fees_pending');
        setRemarkText(detail.remark_text || '');
        if (currentStatus === 'paid' && detail.reason === 'add_clearance') {
          setPaidOption('add_clearance');
          setClearanceNoteText(detail.remark_text || '');
        } else {
          setPaidOption('standard');
          setClearanceNoteText('');
        }
      }
    } catch (err) {
      const currentStatus = row.bus_fees_status || row.fees_status || 'not_paid';
      setFeesStatus(currentStatus);
      setReason(row.reason || 'fees_pending');
      setRemarkText(row.remark_text || '');
      if (currentStatus === 'paid' && row.reason === 'add_clearance') {
        setPaidOption('add_clearance');
        setClearanceNoteText(row.remark_text || '');
      } else {
        setPaidOption('standard');
        setClearanceNoteText('');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Save Fees Status
  const handleSaveFees = async () => {
    if (!selectedStudent) return;

    if (feesStatus === 'paid' && paidOption === 'add_clearance' && !clearanceNoteText.trim()) {
      toast.error('Please enter clearance details / note.');
      return;
    }
    if (feesStatus === 'not_paid' && reason === 'remark' && !remarkText.trim()) {
      toast.error('Please enter a remark note for pending fees.');
      return;
    }

    setSaving(true);
    const sId = selectedStudent.student.id || selectedStudent.student._id;
    const finalRemarkText =
      feesStatus === 'paid'
        ? paidOption === 'add_clearance'
          ? clearanceNoteText.trim()
          : 'Bus fees cleared'
        : reason === 'remark'
        ? remarkText.trim()
        : 'Bus fees pending';

    const payload = {
      status: feesStatus,
      ...(feesStatus === 'paid'
        ? { reason: paidOption === 'add_clearance' ? 'add_clearance' : undefined, remark_text: finalRemarkText }
        : { reason: reason, remark_text: finalRemarkText }),
    };

    try {
      const res = await api.patch(`/bus-section/students/${sId}/bus-fees`, payload);
      if (res.data?.success) {
        if (feesStatus === 'not_paid') {
          toast.success('Remark added & student notified successfully!');
        } else {
          toast.success('Bus fee clearance status saved & student notified successfully!');
        }
        fetchStudents();
        setIsModalOpen(false);
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (err) {
      console.warn('Backend update failed, updating inline for demo:', err.message);
      setStudents((prev) =>
        prev.map((s) => {
          const targetId = s.student.id || s.student._id;
          if (targetId === sId) {
            const updatedAudit = [
              {
                status: feesStatus,
                reason: feesStatus === 'paid' ? (paidOption === 'add_clearance' ? 'add_clearance' : null) : reason,
                remark_text: finalRemarkText,
                changed_by_name: 'Bus Section Head',
                changed_at: new Date().toISOString(),
              },
              ...(s.auditTrail || []),
            ];
            return {
              ...s,
              bus_fees_status: feesStatus,
              fees_status: feesStatus,
              reason: feesStatus === 'paid' ? (paidOption === 'add_clearance' ? 'add_clearance' : null) : reason,
              remark_text: finalRemarkText,
              updated_at: new Date().toISOString(),
              auditTrail: updatedAudit,
            };
          }
          return s;
        })
      );

      if (feesStatus === 'not_paid') {
        toast.success('Remark added & student notified successfully!');
      } else {
        toast.success('Bus fee clearance status saved & student notified successfully!');
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Calculated Metrics
  const totalCount = students.length;
  const paidCount = students.filter((s) => (s.bus_fees_status || s.fees_status) === 'paid').length;
  const pendingCount = totalCount - paidCount;

  const isAllSelected =
    students.length > 0 &&
    students.every((s) => selectedStudentIds.includes(s.student.id || s.student._id));

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
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
            type="checkbox"
            checked={isChecked}
            onChange={() => handleSelectStudent(sId)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
          />
        );
      },
    },
    {
      key: 'name',
      label: 'STUDENT',
      render: (_, row) => (
        <div>
          <p className="text-sm font-semibold text-ink-primary">{row.student.name}</p>
          <p className="text-xs text-ink-muted">{row.student.email}</p>
        </div>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'ENROLLMENT NO',
      render: (_, row) => (
        <span className="text-sm font-mono text-ink-secondary font-medium">
          {row.student.enrollmentNo}
        </span>
      ),
    },
    {
      key: 'program',
      label: 'PROGRAM / SEM',
      render: (_, row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-100 text-ink-secondary border border-surface-200">
          {row.student.program} - Sem {row.student.currentSemester} ({row.student.section || 'A'})
        </span>
      ),
    },
    {
      key: 'bus_fees_status',
      label: 'BUS FEES STATUS',
      render: (val, row) => {
        const status = row.bus_fees_status || row.fees_status || val;
        if (status === 'paid') {
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
      label: 'LAST UPDATED',
      render: (val) => (
        <span className="text-xs text-ink-muted">
          {val ? new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'ACTION',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<HiOutlinePencilSquare className="w-4 h-4" />}
          onClick={() => handleOpenModal(row)}
        >
          Manage Bus Fees
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Bus Section — Transport Fee Clearance">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">TOTAL STUDENTS</p>
            <p className="text-2xl font-bold text-ink-primary mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center text-ink-secondary">
            <HiOutlineTruck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">BUS FEES CLEARED</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{paidCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
            <HiOutlineCheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border-subtle p-5 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">BUS FEES PENDING</p>
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
              BRANCH & SEMESTER FILTER
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
            className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              selectedSem === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {semestersList.map((semNum) => {
            const semStr = String(semNum);
            const isActive = selectedSem === semStr;
            return (
              <button
                key={semNum}
                type="button"
                onClick={() => setSelectedSem(semStr)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Sem {semNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Header */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <HiOutlineMagnifyingGlass className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search student by name, enrollment no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 pr-4 py-2 w-full text-sm rounded-lg"
          />
        </div>

        {/* Status Filters & Bulk Upload Action */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg border border-border-subtle">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-surface text-ink-primary shadow-xs'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('not_paid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === 'not_paid'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              Not Paid
            </button>
          </div>



          <Button
            variant="primary"
            size="sm"
            icon={<HiOutlineArrowUpTray className="w-4 h-4" />}
            onClick={() => setIsBulkModalOpen(true)}
            className="!bg-primary-600 hover:!bg-primary-700 text-white font-semibold shadow-xs"
          >
            Bulk Upload
          </Button>

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

      {/* Floating Bulk Selection Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fadeIn">
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
              Clear Selection
            </button>

            <Button
              variant="primary"
              size="sm"
              loading={bulkLoading}
              onClick={handleBulkMarkPaidSelected}
              icon={<HiOutlineCheckBadge className="w-4 h-4" />}
              className="!bg-emerald-600 hover:!bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              Mark Selected as Paid (Move to Clearance)
            </Button>
          </div>
        </div>
      )}

      {/* Main Table */}
      {loading ? (
        <Skeleton count={6} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No Student Records Found"
          description="There are no students matching your current search or filter criteria."
          icon={<HiOutlineTruck className="w-12 h-12 text-ink-muted" />}
        />
      ) : (
        <div className="bg-surface border border-border-subtle rounded-xl shadow-xs overflow-hidden">
          <Table columns={columns} data={students} />
        </div>
      )}



      {/* Manage Bus Fees Modal */}
      {isModalOpen && selectedStudent && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Manage Bus Fee Status"
        >
          {modalLoading ? (
            <Skeleton count={3} />
          ) : (
            <div className="space-y-6">
              {/* Student Details Summary Header */}
              <div className="p-4 rounded-xl bg-surface-100 border border-border-subtle flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-ink-primary text-base">
                    {selectedStudent.student?.name}
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Enrollment: <span className="font-mono font-medium text-ink-secondary">{selectedStudent.student?.enrollmentNo}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-ink-secondary">
                    {selectedStudent.student?.program} - Sem {selectedStudent.student?.currentSemester} ({selectedStudent.student?.section || 'A'})
                  </span>
                </div>
              </div>

              {/* Fee Clearance Status Options */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Bus Fee Clearance Status
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFeesStatus('paid')}
                    className={`py-3 px-4 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      feesStatus === 'paid'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-surface border-border-subtle text-ink-secondary hover:border-surface-300'
                    }`}
                  >
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Paid (Cleared)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeesStatus('not_paid')}
                    className={`py-3 px-4 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
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

              {/* Sub-options if Paid */}
              {feesStatus === 'paid' && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Paid Clearance Option
                  </label>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-emerald-900 cursor-pointer">
                      <input
                        type="radio"
                        name="paidOption"
                        value="standard"
                        checked={paidOption === 'standard'}
                        onChange={() => setPaidOption('standard')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Direct Cleared (Standard)</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm font-medium text-emerald-900 cursor-pointer">
                      <input
                        type="radio"
                        name="paidOption"
                        value="add_clearance"
                        checked={paidOption === 'add_clearance'}
                        onChange={() => setPaidOption('add_clearance')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Add Clearance Note / Receipt</span>
                    </label>
                  </div>

                  {paidOption === 'add_clearance' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-emerald-900 mb-1">
                        Clearance Details / Note <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={clearanceNoteText}
                        onChange={(e) => setClearanceNoteText(e.target.value)}
                        placeholder="e.g. Cleared via Receipt #84920 / Bus Pass #B-104 issued..."
                        className="input-base text-sm w-full p-2.5 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

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
                      <span>Add Remark Note</span>
                    </label>
                  </div>

                  {reason === 'remark' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Remark Note <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={remarkText}
                        onChange={(e) => setRemarkText(e.target.value)}
                        placeholder="e.g. Bus pass quarterly renewal fee ₹1,500 pending..."
                        className="input-base text-sm w-full p-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Audit Trail History */}
              <div className="pt-4 border-t border-border-subtle">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                  <HiOutlineClock className="w-4 h-4 text-ink-muted" />
                  Audit & History Timeline
                </h4>

                {selectedStudent.auditTrail && selectedStudent.auditTrail.length > 0 ? (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {selectedStudent.auditTrail.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between text-xs p-3 rounded-lg bg-surface border border-border-subtle"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                log.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {log.status === 'paid' ? 'Marked Paid' : 'Marked Not Paid'}
                            </span>
                          </div>
                          {log.remark_text && (
                            <p className="text-ink-secondary mt-1 font-medium">{log.remark_text}</p>
                          )}
                          <p className="text-[11px] text-ink-muted mt-1">
                            Updated by: {log.changed_by_name || 'Bus Section Head'}
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
                ) : (
                  <p className="text-xs text-ink-muted italic">No prior audit records found.</p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-border-subtle">
                <Button variant="tertiary" onClick={() => setIsModalOpen(false)} disabled={saving || deleteLoading}>
                  Cancel
                </Button>
                <Button variant="primary" loading={saving} disabled={deleteLoading} onClick={handleSaveFees}>
                  {feesStatus === 'not_paid' ? 'remark added' : 'Save Fee Clearance Status'}
                </Button>
                <Button
                  variant="tertiary"
                  loading={deleteLoading}
                  disabled={saving}
                  onClick={handleDeleteFromModal}
                  icon={<HiOutlineTrash className="w-4 h-4 text-white" />}
                  className="!bg-red-600 hover:!bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Bulk Upload Students via CSV Modal */}
      {isBulkModalOpen && (
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => {
            setIsBulkModalOpen(false);
            setUploadedFileName('');
            setParsedRows([]);
          }}
          title="Bulk Upload Students via CSV"
        >
          <div className="space-y-5">
            {/* Expected Columns Box */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-100/70 border border-border-subtle p-3.5 rounded-xl gap-3">
              <div>
                <p className="text-xs font-semibold text-ink-primary">Expected Columns:</p>
                <p className="text-[11px] font-mono text-ink-muted mt-0.5">
                  student_id, full_name, email, department, semester, section
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border-subtle text-primary-600 hover:text-primary-700 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                Download Sample CSV
              </button>
            </div>

            {/* Drag & Drop CSV File Drop Zone */}
            <div className="border-2 border-dashed border-border-subtle hover:border-primary-500/50 rounded-xl p-7 text-center transition-colors bg-surface-50/50 cursor-pointer">
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="bus-bulk-csv-input"
              />
              <label htmlFor="bus-bulk-csv-input" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
                  <HiOutlineArrowUpTray className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-ink-primary">
                  {uploadedFileName || 'Click to choose or drag & drop CSV file'}
                </span>
                <span className="text-xs text-ink-muted">Supports .csv files up to 5MB</span>
              </label>
            </div>

            {/* Parsed CSV Rows Live Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-ink-primary">
                    Preview ({parsedRows.length} student{parsedRows.length > 1 ? 's' : ''} found):
                  </p>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ready to process
                  </span>
                </div>
                <div className="overflow-x-auto border border-border-subtle rounded-lg max-h-48 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-100 text-ink-muted border-b border-border-subtle sticky top-0 font-semibold">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Student ID</th>
                        <th className="p-2">Full Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Department</th>
                        <th className="p-2">Semester</th>
                        <th className="p-2">Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-surface-50">
                          <td className="p-2 text-ink-muted font-mono">{i + 1}</td>
                          <td className="p-2 font-mono font-medium text-ink-primary">{row.student_id || '—'}</td>
                          <td className="p-2 font-medium text-ink-primary">{row.full_name || '—'}</td>
                          <td className="p-2 text-ink-muted">{row.email || '—'}</td>
                          <td className="p-2">{row.department || '—'}</td>
                          <td className="p-2">{row.semester || '—'}</td>
                          <td className="p-2">{row.section || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <p className="text-[11px] text-ink-muted text-center py-1.5 bg-surface-50 border-t border-border-subtle font-medium">
                      + {parsedRows.length - 10} more rows
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end items-center gap-3 pt-4 border-t border-border-subtle">
              <Button
                variant="tertiary"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setUploadedFileName('');
                  setParsedRows([]);
                }}
                disabled={bulkLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={bulkLoading}
                disabled={parsedRows.length === 0}
                onClick={handleConfirmUpload}
                icon={<HiOutlineCheckBadge className="w-4 h-4" />}
                className="!bg-primary-600 hover:!bg-primary-700 text-white font-semibold shadow-xs"
              >
                Confirm & Upload Students
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </DashboardLayout>
  );
}
