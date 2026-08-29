import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  HiOutlineCloudArrowUp,
  HiOutlineDocumentArrowDown,
  HiOutlineDocumentDuplicate,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineUsers,
  HiOutlineArrowRight,
  HiOutlineArrowPath,
  HiOutlineTableCells,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function BulkSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Active Main Tab: 'upload' | 'clone'
  const [activeTab, setActiveTab] = useState('upload');

  // Programs & Semesters list for dropdowns
  const [programs, setPrograms] = useState([]);
  const [existingSemesters, setExistingSemesters] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Uploaded File & Parsed State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Execution State
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Clone Tab Form State
  const [cloneForm, setCloneForm] = useState({
    sourceSemesterId: '',
    newAcademicYear: '2025-26',
    studentsCsvText: '',
  });
  const [cloneStudents, setCloneStudents] = useState([]);

  // Fetch initial programs and semesters
  useEffect(() => {
    async function loadData() {
      setLoadingInitial(true);
      try {
        const [progRes, semRes] = await Promise.all([
          api.get('/admin/programs'),
          api.get('/admin/semesters'),
        ]);
        const progList = Array.isArray(progRes.data.data)
          ? progRes.data.data
          : progRes.data.data?.programs || [];
        const semList = Array.isArray(semRes.data.data)
          ? semRes.data.data
          : semRes.data.data?.semesters || [];

        setPrograms(progList);
        setExistingSemesters(semList);
      } catch (err) {
        toast.error('Failed to load programs or semesters');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // ──────────────────────────────────────────────
  // EXCEL / CSV TEMPLATE GENERATOR
  // ──────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Semester Config
    const semConfigData = [
      {
        program_code: programs[0]?.code || 'AIDS',
        sem_number: 5,
        academic_year: '2025-26',
        type: 'ODD',
        start_date: '2025-07-15',
        end_date: '2025-12-15',
        clearance_deadline: '2025-12-01',
      },
    ];
    const ws1 = XLSX.utils.json_to_sheet(semConfigData);
    XLSX.utils.book_append_sheet(wb, ws1, 'semester_config');

    // Sheet 2: Clearance Items
    const clearanceItemsData = [
      {
        sr_no: 1,
        title: 'Theory of Computation',
        type: 'theory',
        subject_code: 'CS501',
        teacher_email: 'teacher@sbjit.edu.in',
        lab_batches: '',
        elective_group: '',
        elective_options: '',
      },
      {
        sr_no: 2,
        title: 'Database Management Lab',
        type: 'lab',
        subject_code: 'CS502L',
        teacher_email: '',
        lab_batches: 'Batch A:teacher1@sbjit.edu.in,Batch B:teacher2@sbjit.edu.in,Batch C:teacher1@sbjit.edu.in',
        elective_group: '',
        elective_options: '',
      },
      {
        sr_no: 3,
        title: 'Professional Elective I',
        type: 'elective',
        subject_code: 'PE503',
        teacher_email: '',
        lab_batches: '',
        elective_group: 'PE-I',
        elective_options: 'Machine Learning:teacher1@sbjit.edu.in,Cloud Computing:teacher2@sbjit.edu.in',
      },
    ];
    const ws2 = XLSX.utils.json_to_sheet(clearanceItemsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'clearance_items');

    // Sheet 3: Students Roster
    const studentsData = [
      {
        enrollment_no: 'EN2024AIDS001',
        full_name: 'Rahul Sharma',
        email: 'rahul.sharma@sbjit.edu.in',
        section: 'A',
        batch: 'Batch A',
        elective_choice: 'Machine Learning',
      },
      {
        enrollment_no: 'EN2024AIDS002',
        full_name: 'Priya Patel',
        email: 'priya.patel@sbjit.edu.in',
        section: 'A',
        batch: 'Batch B',
        elective_choice: 'Cloud Computing',
      },
      {
        enrollment_no: 'EN2024AIDS003',
        full_name: 'Amit Verma',
        email: 'amit.verma@sbjit.edu.in',
        section: 'A',
        batch: 'Batch C',
        elective_choice: 'Machine Learning',
      },
    ];
    const ws3 = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, ws3, 'students');

    // Export file
    XLSX.writeFile(wb, 'clearmate_bulk_semester_template.xlsx');
    toast.success('Excel template downloaded successfully');
  };

  // ──────────────────────────────────────────────
  // FILE UPLOAD & PARSING
  // ──────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    parseUploadedFile(file);
  };

  const parseUploadedFile = async (file) => {
    setParsing(true);
    setValidationErrors([]);
    setExecutionResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      // Look for expected sheets or parse single sheet
      const sheetNames = wb.SheetNames;
      let semesterConfig = null;
      let clearanceItems = [];
      let students = [];
      const errors = [];

      if (sheetNames.length >= 2 || wb.Sheets['semester_config']) {
        // Multi-sheet format
        const wsSem = wb.Sheets['semester_config'] || wb.Sheets[sheetNames[0]];
        const wsItems = wb.Sheets['clearance_items'] || wb.Sheets[sheetNames[1]];
        const wsStudents = wb.Sheets['students'] || wb.Sheets[sheetNames[2]];

        const semRows = XLSX.utils.sheet_to_json(wsSem);
        if (semRows.length > 0) {
          semesterConfig = semRows[0];
        } else {
          errors.push('Sheet "semester_config" is empty or missing required row.');
        }

        if (wsItems) {
          clearanceItems = XLSX.utils.sheet_to_json(wsItems);
        } else {
          errors.push('Sheet "clearance_items" not found in workbook.');
        }

        if (wsStudents) {
          students = XLSX.utils.sheet_to_json(wsStudents);
        } else {
          errors.push('Sheet "students" not found in workbook.');
        }
      } else {
        // Single sheet fallback (treat as students list)
        const ws = wb.Sheets[sheetNames[0]];
        students = XLSX.utils.sheet_to_json(ws);
        errors.push('Multi-sheet structure not detected. Please use the official ClearMate template for full setup.');
      }

      // Pre-flight checks
      if (semesterConfig) {
        if (!semesterConfig.program_code && !semesterConfig.programCode) {
          errors.push('Semester Config: Missing "program_code"');
        }
        if (!semesterConfig.sem_number && !semesterConfig.semNumber) {
          errors.push('Semester Config: Missing "sem_number"');
        }
        if (!semesterConfig.academic_year && !semesterConfig.academicYear) {
          errors.push('Semester Config: Missing "academic_year"');
        }
      }

      if (clearanceItems.length === 0) {
        errors.push('Clearance Items: No items found in Sheet 2.');
      }

      if (students.length === 0) {
        errors.push('Students: No student rows found in Sheet 3.');
      }

      setValidationErrors(errors);
      setParsedData({
        semesterConfig,
        clearanceItems,
        students,
      });

      if (errors.length === 0) {
        toast.success(`Workbook parsed: ${clearanceItems.length} items & ${students.length} students detected`);
      } else {
        toast('Workbook parsed with diagnostics', { icon: '⚠️' });
      }
    } catch (err) {
      toast.error('Failed to parse file: ' + err.message);
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedData(null);
    setValidationErrors([]);
    setExecutionResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ──────────────────────────────────────────────
  // EXECUTE BULK SETUP SUBMISSION
  // ──────────────────────────────────────────────
  const handleExecuteBulkSetup = async () => {
    if (!parsedData || !parsedData.semesterConfig) {
      toast.error('Please upload and validate a valid template file first.');
      return;
    }

    setSubmitting(true);
    setExecutionResult(null);

    try {
      // Helper to find a value across various possible key names in Excel
      const getVal = (obj, ...keys) => {
        for (const k of keys) {
          if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
            return obj[k];
          }
          // Case-insensitive match
          const foundKey = Object.keys(obj).find((actualKey) => actualKey.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
          if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') {
            return obj[foundKey];
          }
        }
        return '';
      };

      // Normalize semesterConfig
      const raw = parsedData.semesterConfig;
      const normalizedSemesterConfig = {
        programCode: String(getVal(raw, 'programCode', 'program_code', 'program', 'branch', 'code', 'degree') || 'AIML').toUpperCase().trim(),
        semNumber: parseInt(getVal(raw, 'semNumber', 'sem_number', 'semester', 'sem', 'semester_number') || 5, 10),
        academicYear: String(getVal(raw, 'academicYear', 'academic_year', 'session', 'year') || '2025-26').trim(),
        type: String(getVal(raw, 'type', 'term_type', 'semester_type') || '').toUpperCase() || undefined,
        startDate: getVal(raw, 'startDate', 'start_date') || undefined,
        endDate: getVal(raw, 'endDate', 'end_date') || undefined,
        clearanceDeadline: getVal(raw, 'clearanceDeadline', 'clearance_deadline', 'deadline') || undefined,
      };

      const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

      // Normalize clearance items: ultra-flexible mapping
      const normalizedItems = (parsedData.clearanceItems || [])
        .map((item, idx) => {
          const title = String(getVal(item, 'title', 'subject_name', 'subject', 'course_title', 'name') || '').trim();
          let type = String(getVal(item, 'type', 'course_type', 'item_type') || 'theory').toLowerCase().trim();
          if (!['theory', 'lab', 'elective', 'special'].includes(type)) {
            if (type.includes('lab') || type.includes('practical')) type = 'lab';
            else if (type.includes('elec')) type = 'elective';
            else if (type.includes('proj') || type.includes('special')) type = 'special';
            else type = 'theory';
          }
          const teacherEmailRaw = String(getVal(item, 'teacherEmail', 'teacher_email', 'faculty_email', 'teacher', 'faculty') || '').trim();
          const subjectCode = String(getVal(item, 'subjectCode', 'subject_code', 'code', 'course_code') || '').trim();
          const labBatches = String(getVal(item, 'labBatches', 'lab_batches', 'batches', 'batch_teachers') || '').trim();
          const electiveGroup = String(getVal(item, 'electiveGroup', 'elective_group', 'group') || '').trim();
          const electiveOptions = String(getVal(item, 'electiveOptions', 'elective_options', 'options') || '').trim();

          return {
            srNo: parseInt(getVal(item, 'srNo', 'sr_no', 'sr') || idx + 1, 10),
            title,
            type,
            subjectCode,
            ...(teacherEmailRaw && isValidEmail(teacherEmailRaw) ? { teacherEmail: teacherEmailRaw } : {}),
            labBatches,
            electiveGroup,
            electiveOptions,
            isRequired: item.isRequired !== false,
          };
        })
        .filter((item) => item.title !== '');

      // Normalize students: ultra-flexible mapping
      const normalizedStudents = (parsedData.students || [])
        .map((s) => ({
          enrollmentNo: String(getVal(s, 'enrollmentNo', 'enrollment_no', 'roll_no', 'rollNo', 'enrolment_no', 'student_id') || '').trim(),
          name: String(getVal(s, 'name', 'full_name', 'student_name', 'studentName') || '').trim(),
          email: String(getVal(s, 'email', 'student_email', 'mail') || '').toLowerCase().trim(),
          section: String(getVal(s, 'section', 'sec') || 'A').trim(),
          batch: String(getVal(s, 'batch', 'practical_batch', 'lab_batch') || '').trim(),
          electiveChoice: String(getVal(s, 'electiveChoice', 'elective_choice', 'elective', 'subject_choice') || '').trim(),
        }))
        .filter((s) => s.email !== '');

      const payload = {
        semesterConfig: normalizedSemesterConfig,
        clearanceItems: normalizedItems,
        students: normalizedStudents,
      };

      const res = await api.post('/admin/bulk-setup', payload);
      const data = res.data.data;

      setExecutionResult(data);
      toast.success(res.data.message || `Bulk setup complete: ${data?.clearanceItemsCreated?.length || 0} items created!`);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Bulk setup failed';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────
  // EXECUTE CLONE SEMESTER
  // ──────────────────────────────────────────────
  const handleExecuteClone = async (e) => {
    e.preventDefault();
    if (!cloneForm.sourceSemesterId) {
      toast.error('Please select a source semester to clone.');
      return;
    }
    if (!cloneForm.newAcademicYear.trim()) {
      toast.error('Please specify the new academic year.');
      return;
    }

    setSubmitting(true);
    setExecutionResult(null);

    try {
      const payload = {
        sourceSemesterId: cloneForm.sourceSemesterId,
        newAcademicYear: cloneForm.newAcademicYear.trim(),
        students: cloneStudents,
      };

      const res = await api.post('/admin/clone-semester', payload);
      const data = res.data.data;

      setExecutionResult(data);
      toast.success(res.data.message || 'Semester cloned successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Clone failed';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Parse Student CSV for Clone Tab
  const handleCloneStudentsFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      setCloneStudents(rows);
      toast.success(`Loaded ${rows.length} students for the new cloned semester.`);
    } catch (err) {
      toast.error('Failed to parse students list: ' + err.message);
    }
  };

  return (
    <DashboardLayout title="Bulk Semester Setup">
      {/* Header Banner */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-2">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-300" />
              Admin Workload Reduction Engine
            </div>
            <h1 className="text-2xl font-black font-display tracking-wide">
              1-Click Bulk Semester Setup
            </h1>
            <p className="text-sm text-slate-200/90 mt-1 max-w-2xl">
              Initialize an entire semester in 30 seconds. Automatically provisions Academic Semesters, Student Batches, Clearance Items with faculty mappings, and Enrolled Student Rosters from a single structured file.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="!bg-white/10 hover:!bg-white/20 !text-white !border-white/20 text-xs"
              icon={<HiOutlineDocumentArrowDown className="w-4 h-4 text-amber-300" />}
              onClick={handleDownloadTemplate}
            >
              Download Excel Template (.xlsx)
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border-subtle mb-6 gap-2">
        <button
          onClick={() => { setActiveTab('upload'); setExecutionResult(null); }}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'upload'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-muted hover:text-ink-primary'
          }`}
        >
          <HiOutlineCloudArrowUp className="w-5 h-5" />
          Single-File Full Semester Setup
        </button>

        <button
          onClick={() => { setActiveTab('clone'); setExecutionResult(null); }}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'clone'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-muted hover:text-ink-primary'
          }`}
        >
          <HiOutlineDocumentDuplicate className="w-5 h-5" />
          Clone Previous Semester Structure
        </button>
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* TAB 1: BULK EXCEL UPLOAD WIZARD               */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Step 1: Upload Box */}
          {!parsedData && (
            <div className="bg-surface border border-border-subtle rounded-2xl p-8 shadow-xs">
              <div className="max-w-xl mx-auto text-center">
                <div className="w-16 h-16 bg-brand-50 text-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HiOutlineCloudArrowUp className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-ink-primary">
                  Upload Completed Semester Setup File
                </h3>
                <p className="text-xs text-ink-muted mt-1 mb-6">
                  Select a populated <span className="font-semibold text-ink-secondary">.xlsx</span>, <span className="font-semibold text-ink-secondary">.xls</span>, or <span className="font-semibold text-ink-secondary">.csv</span> workbook containing the 3 structured sheets.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="bulk-excel-upload"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label
                    htmlFor="bulk-excel-upload"
                    className="cursor-pointer px-5 py-2.5 bg-brand hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    <HiOutlineCloudArrowUp className="w-4 h-4" />
                    Browse & Choose Workbook
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    icon={<HiOutlineDocumentArrowDown className="w-4 h-4" />}
                  >
                    Get Blank Template
                  </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="p-3 bg-canvas/50 rounded-lg border border-border-subtle/60">
                    <p className="text-2xs font-bold text-brand uppercase">Sheet 1</p>
                    <p className="text-xs font-semibold text-ink-primary mt-0.5">Semester Config</p>
                    <p className="text-2xs text-ink-muted mt-0.5">Degree, Sem No, Dates & Academic Year</p>
                  </div>
                  <div className="p-3 bg-canvas/50 rounded-lg border border-border-subtle/60">
                    <p className="text-2xs font-bold text-indigo-600 uppercase">Sheet 2</p>
                    <p className="text-xs font-semibold text-ink-primary mt-0.5">Clearance Items</p>
                    <p className="text-2xs text-ink-muted mt-0.5">Subjects, Labs, Electives & Faculty Emails</p>
                  </div>
                  <div className="p-3 bg-canvas/50 rounded-lg border border-border-subtle/60">
                    <p className="text-2xs font-bold text-green-600 uppercase">Sheet 3</p>
                    <p className="text-xs font-semibold text-ink-primary mt-0.5">Student Roster</p>
                    <p className="text-2xs text-ink-muted mt-0.5">Roll No, Email, Batch & Electives</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Parsed File Preview & Pre-Flight Diagnostics */}
          {parsedData && (
            <div className="space-y-6">
              {/* File Info & Action Bar */}
              <div className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <HiOutlineCheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink-primary truncate max-w-sm">
                        {selectedFile?.name || 'Uploaded Workbook'}
                      </p>
                      <Badge variant={validationErrors.length === 0 ? 'success' : 'warning'}>
                        {validationErrors.length === 0 ? 'Validated & Ready' : `${validationErrors.length} Warning(s)`}
                      </Badge>
                    </div>
                    <p className="text-2xs text-ink-muted mt-0.5">
                      {parsedData.clearanceItems.length} clearance items • {parsedData.students.length} students detected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClearFile}
                    icon={<HiOutlineTrash className="w-4 h-4 text-red-500" />}
                  >
                    Discard File
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={validationErrors.length > 0 && !parsedData.semesterConfig}
                    loading={submitting}
                    onClick={handleExecuteBulkSetup}
                    className="!bg-brand hover:!bg-brand-600 font-bold"
                    icon={<HiOutlineSparkles className="w-4 h-4" />}
                  >
                    Execute
                  </Button>
                </div>
              </div>

              {/* Validation Warnings Alert */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
                    Pre-Flight Validation Diagnostics
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3 Preview Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Panel 1: Semester Info */}
                <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <HiOutlineCalendarDays className="w-4 h-4 text-brand" />
                    1. Academic Semester
                  </h3>
                  {parsedData.semesterConfig ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-border-subtle/50 pb-1.5">
                        <span className="text-ink-muted">Program Code:</span>
                        <span className="font-bold text-ink-primary">
                          {parsedData.semesterConfig.program_code || parsedData.semesterConfig.programCode || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border-subtle/50 pb-1.5">
                        <span className="text-ink-muted">Semester Number:</span>
                        <span className="font-bold text-ink-primary">
                          Sem {parsedData.semesterConfig.sem_number || parsedData.semesterConfig.semNumber || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border-subtle/50 pb-1.5">
                        <span className="text-ink-muted">Academic Year:</span>
                        <span className="font-bold text-ink-primary">
                          {parsedData.semesterConfig.academic_year || parsedData.semesterConfig.academicYear || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border-subtle/50 pb-1.5">
                        <span className="text-ink-muted">Term Type:</span>
                        <span className="font-semibold text-ink-secondary">
                          {parsedData.semesterConfig.type || 'ODD'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-ink-muted">Clearance Deadline:</span>
                        <span className="font-mono text-2xs text-ink-secondary">
                          {parsedData.semesterConfig.clearance_deadline || parsedData.semesterConfig.clearanceDeadline || 'Default (+140d)'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-red-600">Missing semester configuration</p>
                  )}
                </div>

                {/* Panel 2: Clearance Items Count */}
                <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <HiOutlineClipboardDocumentList className="w-4 h-4 text-indigo-600" />
                    2. Clearance Items ({parsedData.clearanceItems.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                    {parsedData.clearanceItems.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-primary truncate">{item.title || item.title_text || `Item ${idx+1}`}</p>
                          <p className="text-2xs text-ink-muted">{item.subject_code || item.subjectCode || 'No Code'} • {item.type}</p>
                        </div>
                        <Badge variant="default" className="capitalize text-2xs shrink-0">
                          {item.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel 3: Students Preview */}
                <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <HiOutlineUsers className="w-4 h-4 text-green-600" />
                    3. Students ({parsedData.students.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle/50 text-xs custom-scrollbar">
                    {parsedData.students.slice(0, 10).map((st, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-primary truncate">{st.full_name || st.name || st.email}</p>
                          <p className="text-2xs text-ink-muted font-mono">{st.enrollment_no || st.enrollmentNo || 'N/A'}</p>
                        </div>
                        <span className="text-2xs px-1.5 py-0.5 bg-canvas border border-border-subtle rounded font-mono text-ink-secondary shrink-0">
                          {st.batch || 'Batch A'}
                        </span>
                      </div>
                    ))}
                    {parsedData.students.length > 10 && (
                      <p className="text-2xs text-ink-muted pt-2 text-center">
                        + {parsedData.students.length - 10} more students in roster
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Execution Result Card */}
          {executionResult && (
            <div className="bg-surface border border-green-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <HiOutlineCheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-primary">
                    🎉 Bulk Semester Provisioning Successful!
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Created academic semester infrastructure and enrolled cohorts in MongoDB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="p-3.5 bg-green-50/60 rounded-xl border border-green-100 text-center">
                  <p className="text-2xs font-bold text-green-700 uppercase">Semester</p>
                  <p className="text-lg font-bold text-ink-primary mt-0.5">{executionResult.semester?.name || 'Active'}</p>
                </div>
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                  <p className="text-2xs font-bold text-blue-700 uppercase">Batches Created</p>
                  <p className="text-lg font-bold text-ink-primary mt-0.5">{executionResult.batchesCreated?.length || 0}</p>
                </div>
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
                  <p className="text-2xs font-bold text-purple-700 uppercase">Clearance Items</p>
                  <p className="text-lg font-bold text-ink-primary mt-0.5">{executionResult.clearanceItemsCreated?.length || 0}</p>
                </div>
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                  <p className="text-2xs font-bold text-indigo-700 uppercase">Students Enrolled</p>
                  <p className="text-lg font-bold text-ink-primary mt-0.5">{executionResult.studentsCreated?.length || 0}</p>
                </div>
              </div>

              {executionResult.warnings?.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-2xs text-amber-800 space-y-1">
                  <p className="font-bold">Execution Notes & Skipped Mappings:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {executionResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-end gap-2">
                <Link
                  to="/admin/semesters"
                  className="px-4 py-2 text-xs font-semibold text-ink-primary bg-canvas hover:bg-border-subtle rounded-lg transition-colors"
                >
                  View Semesters
                </Link>
                <Link
                  to="/admin/users"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand-600 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>View Student Roster</span>
                  <HiOutlineArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────── */}
      {/* TAB 2: CLONE PREVIOUS SEMESTER                 */}
      {/* ────────────────────────────────────────────── */}
      {activeTab === 'clone' && (
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-xs max-w-3xl">
          <div className="mb-6">
            <h2 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <HiOutlineDocumentDuplicate className="w-5 h-5 text-brand" />
              Clone Semester Structure (Zero-Config Replication)
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Select an existing semester (e.g. Sem 5, 2024-25). ClearMate will copy all subjects, labs, elective groups, and faculty assignments into the new academic year automatically.
            </p>
          </div>

          <form onSubmit={handleExecuteClone} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                Source Semester to Replicate *
              </label>
              <select
                value={cloneForm.sourceSemesterId}
                onChange={(e) => setCloneForm({ ...cloneForm, sourceSemesterId: e.target.value })}
                required
                className="w-full text-xs py-2 px-3 bg-canvas border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="">Select a previous semester...</option>
                {existingSemesters.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.academicYear}) — {s.programId?.code || s.programId?.name || 'Program'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1.5">
                New Target Academic Year *
              </label>
              <input
                type="text"
                placeholder="e.g. 2025-26"
                value={cloneForm.newAcademicYear}
                onChange={(e) => setCloneForm({ ...cloneForm, newAcademicYear: e.target.value })}
                required
                className="w-full text-xs py-2 px-3 bg-canvas border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            {/* Optional New Students Roster Upload */}
            <div className="p-4 bg-canvas/60 rounded-xl border border-dashed border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-ink-primary">
                  New Student Roster (Optional)
                </label>
                {cloneStudents.length > 0 && (
                  <Badge variant="success">{cloneStudents.length} Students Loaded</Badge>
                )}
              </div>
              <p className="text-2xs text-ink-muted mb-3">
                Upload student CSV/Excel with columns: <span className="font-mono">enrollment_no, full_name, email, batch, elective_choice</span>
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleCloneStudentsFile}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand hover:file:bg-brand-100"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submitting}
                disabled={!cloneForm.sourceSemesterId}
                icon={<HiOutlineSparkles className="w-4 h-4" />}
                className="!bg-brand font-bold"
              >
                Clone Semester & Initialize
              </Button>
            </div>
          </form>

          {executionResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-xs">
              <p className="font-bold text-green-900 flex items-center gap-1.5">
                <HiOutlineCheckCircle className="w-4 h-4" />
                Cloning Complete!
              </p>
              <p className="text-green-800 mt-1">
                Semester "{executionResult.semester?.name}" created with {executionResult.clearanceItemsCreated?.length || 0} replicated clearance items.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
