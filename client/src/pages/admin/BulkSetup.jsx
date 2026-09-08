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
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

// Helper to extract structured Program Elective allotments from student rows
export const extractStudentElectives = (st) => {
  if (!st || typeof st !== 'object') return [];
  const results = [];
  const seenChoices = new Set();

  // Bulletproof patterns matching any format:
  // "ELECTIVE CHOICE 1:", "ELECTIVE CHOICE 1", "elective_1", "PE_I_Allotment", "PE 1", "Program Elective I", etc.
  const patterns = [
    { track: 'PE-I', regex: /(pe[-_ ]?(i\b|1\b)|elective[-_ ]?(choice[-_ ]?)?(1\b|i\b)|program[-_ ]?elective[-_ ]?(1\b|i\b))/i },
    { track: 'PE-II', regex: /(pe[-_ ]?(ii\b|2\b)|elective[-_ ]?(choice[-_ ]?)?(2\b|ii\b)|program[-_ ]?elective[-_ ]?(2\b|ii\b))/i },
    { track: 'PE-III', regex: /(pe[-_ ]?(iii\b|3\b)|elective[-_ ]?(choice[-_ ]?)?(3\b|iii\b)|program[-_ ]?elective[-_ ]?(3\b|iii\b))/i },
    { track: 'PE-IV', regex: /(pe[-_ ]?(iv\b|4\b)|elective[-_ ]?(choice[-_ ]?)?(4\b|iv\b)|program[-_ ]?elective[-_ ]?(4\b|iv\b))/i },
    { track: 'OE', regex: /(oe[-_ ]?[0-9i]*|open[-_ ]?elective)/i },
    { track: 'MDM', regex: /(mdm[-_ ]?([0-9i]*|allotment|choice)?|minor|multidisciplinary)/i },
  ];

  const matchedKeys = new Set();

  for (const { track, regex } of patterns) {
    for (const key of Object.keys(st)) {
      if (regex.test(key) && st[key] && String(st[key]).trim() !== '') {
        const val = String(st[key]).trim();
        if (!seenChoices.has(val.toLowerCase())) {
          seenChoices.add(val.toLowerCase());
          results.push({ track, choice: val, label: `${track}: ${val}` });
          matchedKeys.add(key);
        }
      }
    }
  }

  // Fallback for any other elective/MDM-related keys
  for (const key of Object.keys(st)) {
    if (matchedKeys.has(key)) continue;
    const lk = key.toLowerCase();
    if (
      (lk.includes('elective') || lk.includes('mdm') || lk.includes('minor') || lk.includes('multidisciplinary') || lk.startsWith('pe_') || lk.startsWith('pe-') || lk.startsWith('pe') || lk.startsWith('p_')) &&
      st[key] &&
      String(st[key]).trim() !== ''
    ) {
      const val = String(st[key]).trim();
      if (!seenChoices.has(val.toLowerCase())) {
        seenChoices.add(val.toLowerCase());
        let cleanTrack = key.replace(/[:_=-]/g, ' ').replace(/\ballotment\b|\bchoice\b/gi, '').trim();
        if (/mdm|minor|multi/i.test(cleanTrack)) cleanTrack = 'MDM';
        else if (/(^|\D)1($|\D)|(^|\D)i($|\D)/i.test(cleanTrack)) cleanTrack = 'PE-I';
        else if (/(^|\D)2($|\D)|(^|\D)ii($|\D)/i.test(cleanTrack)) cleanTrack = 'PE-II';
        else if (/(^|\D)3($|\D)|(^|\D)iii($|\D)/i.test(cleanTrack)) cleanTrack = 'PE-III';
        else if (/(^|\D)4($|\D)|(^|\D)iv($|\D)/i.test(cleanTrack)) cleanTrack = 'PE-IV';
        else cleanTrack = 'PE';

        results.push({ track: cleanTrack, choice: val, label: `${cleanTrack}: ${val}` });
      }
    }
  }

  return results;
};

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
  const [showAllStudentsModal, setShowAllStudentsModal] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

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
    const defaultProgCode = programs[0]?.code || 'CSE';
    const semConfigData = [
      {
        program_code: defaultProgCode,
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
        subject_code: 'PE503A / PE503B',
        teacher_email: '',
        lab_batches: '',
        elective_group: 'PE-I',
        elective_options: 'Machine Learning:teacher1@sbjit.edu.in,Cloud Computing:teacher2@sbjit.edu.in',
      },
      {
        sr_no: 4,
        title: 'Professional Elective I Lab',
        type: 'elective_lab',
        subject_code: 'PE503LA / PE503LB',
        teacher_email: '',
        lab_batches: '',
        elective_group: 'PE-I Lab',
        elective_options: 'Machine Learning Lab (Batch A:teacher1@sbjit.edu.in, Batch B:teacher2@sbjit.edu.in), Cloud Computing Lab (Batch A:teacher2@sbjit.edu.in, Batch B:teacher1@sbjit.edu.in)',
      },
      {
        sr_no: 5,
        title: 'Minor Multidisciplinary Course (MDM)',
        type: 'elective',
        subject_code: 'MDM601A / MDM601B',
        teacher_email: '',
        lab_batches: '',
        elective_group: 'MDM',
        elective_options: 'Course A:teacher1@sbjit.edu.in,Course B:teacher2@sbjit.edu.in',
      },
      {
        sr_no: 6,
        title: 'Minor Multidisciplinary Course Lab (MDM Lab)',
        type: 'elective_lab',
        subject_code: 'MDM601LB',
        teacher_email: '',
        lab_batches: '',
        elective_group: 'MDM Lab',
        elective_options: 'Course B Lab (Batch A:teacher2@sbjit.edu.in, Batch B:teacher1@sbjit.edu.in)',
      },
    ];
    const ws2 = XLSX.utils.json_to_sheet(clearanceItemsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'clearance_items');

    // Sheet 3: Students Roster
    const studentsData = [
      {
        enrollment_no: `EN2024${defaultProgCode}001`,
        full_name: 'Rahul Sharma',
        email: 'rahul.sharma@sbjit.edu.in',
        section: 'A',
        batch: 'Batch A',
        PE_I_Allotment: 'Machine Learning',
        MDM_Allotment: 'Course A',
      },
      {
        enrollment_no: `EN2024${defaultProgCode}002`,
        full_name: 'Priya Patel',
        email: 'priya.patel@sbjit.edu.in',
        section: 'A',
        batch: 'Batch B',
        PE_I_Allotment: 'Cloud Computing',
        MDM_Allotment: 'Course B',
      },
      {
        enrollment_no: `EN2024${defaultProgCode}003`,
        full_name: 'Amit Verma',
        email: 'amit.verma@sbjit.edu.in',
        section: 'A',
        batch: 'Batch C',
        PE_I_Allotment: 'Machine Learning',
        MDM_Allotment: 'Course A',
      },
    ];
    const ws3 = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, ws3, 'students');

    // Sheet 4: Setup Guide & Syntax Reference
    const guideData = [
      {
        Topic: 'Regular Labs',
        Type_Column: 'lab',
        How_To_Configure: 'Provide comma-separated Batch:Email in lab_batches (e.g. Batch A:prof1@sbjit.edu.in, Batch B:prof2@sbjit.edu.in)',
        Student_Roster_Mapping: 'Students are automatically assigned to the teacher for their "batch" column.',
      },
      {
        Topic: 'Theory Electives (PE / MDM)',
        Type_Column: 'elective',
        How_To_Configure: 'Provide Option:Email pairs in elective_options (e.g. Machine Learning:prof1@sbjit.edu.in, Cloud Computing:prof2@sbjit.edu.in)',
        Student_Roster_Mapping: 'Students specify elective name under PE_I_Allotment or MDM_Allotment column.',
      },
      {
        Topic: 'Elective Labs with Batches (PE Lab / MDM Lab)',
        Type_Column: 'elective_lab',
        How_To_Configure: 'Specify batch teachers inside parentheses in elective_options: Machine Learning Lab (Batch A:prof1@sbjit.edu.in, Batch B:prof2@sbjit.edu.in), Cloud Computing Lab (Batch A:prof3@sbjit.edu.in, Batch B:prof4@sbjit.edu.in)',
        Student_Roster_Mapping: 'No extra columns needed! A student\'s single elective choice + their "batch" automatically routes them to their exact lab batch teacher.',
      },
      {
        Topic: 'Asymmetric Electives (Course A = Theory only, Course B = Theory + Lab)',
        Type_Column: 'elective_lab',
        How_To_Configure: 'In the elective lab row, ONLY list Course B Lab in elective_options. Do NOT list Course A (or write Course A (No Lab)).',
        Student_Roster_Mapping: 'Students choosing Course A receive only Theory clearance (no lab item will ever be created for them). Students choosing Course B receive both Theory and Lab clearance automatically!',
      },
      {
        Topic: 'Elective Lab (Single Faculty)',
        Type_Column: 'elective_lab',
        How_To_Configure: 'If one teacher handles all batches for an elective lab, simply write: Machine Learning Lab:prof1@sbjit.edu.in, Cloud Computing Lab:prof2@sbjit.edu.in',
        Student_Roster_Mapping: 'All students choosing that elective are evaluated by that teacher.',
      },
    ];
    const ws4 = XLSX.utils.json_to_sheet(guideData);
    XLSX.utils.book_append_sheet(wb, ws4, 'setup_guide');

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
        .map((s) => {
          const studentObj = {
            enrollmentNo: String(getVal(s, 'enrollmentNo', 'enrollment_no', 'roll_no', 'rollNo', 'enrolment_no', 'student_id') || '').trim(),
            name: String(getVal(s, 'name', 'full_name', 'student_name', 'studentName') || '').trim(),
            email: String(getVal(s, 'email', 'student_email', 'mail') || '').toLowerCase().trim(),
            section: String(getVal(s, 'section', 'sec') || 'A').trim(),
            batch: String(getVal(s, 'batch', 'practical_batch', 'lab_batch') || '').trim(),
            electiveChoice: String(getVal(s, 'electiveChoice', 'elective_choice', 'elective', 'subject_choice') || '').trim(),
          };
          // Also forward any elective_1, elective_2, elective_3, p_i, p_ii, p_iii, etc.
          Object.keys(s).forEach((k) => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (cleanKey.startsWith('elective') || cleanKey.startsWith('pe') || cleanKey.startsWith('p') || cleanKey.startsWith('oe')) {
              studentObj[k] = s[k];
            }
          });
          return studentObj;
        })
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
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Bulk Semester Setup</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Provision academic semesters, clearance items, batches, and student rosters in bulk
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs font-semibold self-start sm:self-auto"
          icon={<HiOutlineDocumentArrowDown className="w-4 h-4 text-brand" />}
          onClick={handleDownloadTemplate}
        >
          Download Excel Template (.xlsx)
        </Button>
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

                <div className="mt-4 p-3 bg-brand/5 border border-brand/15 rounded-xl text-left flex items-start gap-2.5">
                  <span className="text-sm shrink-0">💡</span>
                  <div className="text-2xs text-ink-secondary leading-relaxed">
                    <strong className="text-ink-primary font-semibold">Program Elective & MDM Labs with Batches:</strong>
                    {' '}You can specify batch teachers inside parentheses in <code className="text-brand font-mono px-1 py-0.5 bg-brand/10 rounded">elective_options</code> (e.g. <span className="font-mono text-ink-muted">Cloud Computing Lab (Batch A:prof1@sbjit.edu.in, Batch B:prof2@sbjit.edu.in)</span>). Students only enter their single elective name once in the roster; ClearMate automatically links both Theory & Lab and assigns the clearance to their batch's lab faculty!
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
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle/60 mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-brand flex items-center justify-center border border-blue-200/50 shrink-0">
                          <HiOutlineCalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-ink-primary">
                            1. Academic Semester
                          </h3>
                          <p className="text-3xs text-ink-muted">Cohort configuration</p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-3xs font-mono font-semibold">
                        Sem {parsedData.semesterConfig?.sem_number || parsedData.semesterConfig?.semNumber || '—'}
                      </Badge>
                    </div>

                    {parsedData.semesterConfig ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                          <span className="text-ink-muted text-2xs font-medium">Program Code</span>
                          <span className="font-mono text-xs font-bold text-ink-primary bg-canvas px-2 py-0.5 rounded-md border border-border-subtle">
                            {parsedData.semesterConfig.program_code || parsedData.semesterConfig.programCode || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                          <span className="text-ink-muted text-2xs font-medium">Academic Session</span>
                          <span className="font-semibold text-xs text-ink-primary">
                            {parsedData.semesterConfig.academic_year || parsedData.semesterConfig.academicYear || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-border-subtle/40">
                          <span className="text-ink-muted text-2xs font-medium">Term Type</span>
                          <span className="text-2xs font-bold tracking-wider text-ink-secondary uppercase px-2 py-0.5 bg-canvas rounded-md border border-border-subtle">
                            {parsedData.semesterConfig.type || 'ODD'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-ink-muted text-2xs font-medium">Clearance Deadline</span>
                          <span className="font-mono text-2xs text-ink-secondary">
                            {parsedData.semesterConfig.clearance_deadline || parsedData.semesterConfig.clearanceDeadline || 'Default (+140d)'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600">Missing semester configuration</p>
                    )}
                  </div>
                </div>

                {/* Panel 2: Clearance Items Count */}
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle/60 mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center border border-indigo-200/50 shrink-0">
                          <HiOutlineClipboardDocumentList className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-ink-primary">
                            2. Clearance Items
                          </h3>
                          <p className="text-3xs text-ink-muted">{parsedData.clearanceItems.length} subjects found</p>
                        </div>
                      </div>
                      <Badge variant="info" className="text-3xs font-mono font-semibold">
                        {parsedData.clearanceItems.length} Items
                      </Badge>
                    </div>

                    <div className="divide-y divide-border-subtle/40 overflow-y-auto max-h-52 custom-scrollbar pr-1">
                      {parsedData.clearanceItems.map((item, idx) => (
                        <div key={idx} className="py-2.5 first:pt-0.5 last:pb-1 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-ink-primary truncate">
                              {item.title || item.title_text || `Item ${idx+1}`}
                            </p>
                            <p className="text-3xs text-ink-muted font-mono mt-0.5">
                              {item.subject_code || item.subjectCode || 'No Code'} • {item.type}
                            </p>
                          </div>
                          <span className={`text-3xs font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 border ${
                            item.type === 'theory'
                              ? 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-300'
                              : item.type === 'lab'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : item.type === 'elective'
                              ? 'bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/50 dark:text-purple-300'
                              : 'bg-canvas text-ink-secondary border-border-subtle'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Panel 3: Students Preview */}
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border-subtle/60 mb-3">
                      <h3 className="text-xs font-bold text-ink-primary flex items-center gap-2">
                        <HiOutlineUsers className="w-4 h-4 text-emerald-600" />
                        3. Students ({parsedData.students.length})
                      </h3>
                      {parsedData.students.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setStudentSearchQuery(''); setShowAllStudentsModal(true); }}
                          className="text-2xs font-semibold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <HiOutlineMagnifyingGlass className="w-3 h-3" />
                          View All
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-border-subtle/40 overflow-y-auto max-h-52 custom-scrollbar">
                      {parsedData.students.slice(0, 8).map((st, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-ink-primary truncate">
                              {st.full_name || st.name || st.email}
                            </p>
                            <p className="text-2xs text-ink-muted font-mono mt-0.5">
                              {st.enrollment_no || st.enrollmentNo || st.roll_no || st.rollNo || 'N/A'}
                            </p>
                          </div>
                          <span className="text-2xs px-2 py-0.5 bg-canvas border border-border-subtle rounded-md font-mono text-ink-secondary shrink-0">
                            {st.batch || 'Batch A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {parsedData.students.length > 8 && (
                    <button
                      type="button"
                      onClick={() => { setStudentSearchQuery(''); setShowAllStudentsModal(true); }}
                      className="w-full mt-3 py-2 px-3 bg-brand/5 hover:bg-brand/10 border border-brand/20 rounded-xl text-2xs font-bold text-brand hover:text-brand-dark transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <HiOutlineUsers className="w-3.5 h-3.5" />
                      <span>+ {parsedData.students.length - 8} more students in roster (Click to view full list)</span>
                    </button>
                  )}
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
                Upload student CSV/Excel with columns: <span className="font-mono">enrollment_no, full_name, email, batch, PE_I_Allotment, PE_II_Allotment, PE_III_Allotment</span>
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

      {/* Complete Student Roster Modal */}
      {showAllStudentsModal && parsedData?.students && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-surface border border-border-subtle rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-canvas/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-200 shrink-0">
                  <HiOutlineUsers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink-primary flex items-center gap-2">
                    Complete Student Roster
                    <Badge variant="success" className="text-2xs">
                      {parsedData.students.length} Students
                    </Badge>
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Previewing all students parsed from the template with specific Program Elective allotments
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllStudentsModal(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-hover transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="px-6 py-3 border-b border-border-subtle bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, roll no, batch, elective..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-canvas border border-border-subtle rounded-lg text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 text-2xs text-ink-muted">
                <span>
                  Showing{' '}
                  <strong className="text-ink-primary">
                    {
                      parsedData.students.filter((st) => {
                        if (!studentSearchQuery.trim()) return true;
                        const q = studentSearchQuery.toLowerCase();
                        const name = (st.full_name || st.name || '').toLowerCase();
                        const email = (st.email || '').toLowerCase();
                        const roll = (st.enrollment_no || st.enrollmentNo || st.roll_no || st.rollNo || '').toLowerCase();
                        const batch = (st.batch || '').toLowerCase();
                        const electives = extractStudentElectives(st);
                        const electiveMatch = electives.some(
                          (e) => e.choice.toLowerCase().includes(q) || e.track.toLowerCase().includes(q)
                        );
                        return (
                          name.includes(q) ||
                          email.includes(q) ||
                          roll.includes(q) ||
                          batch.includes(q) ||
                          electiveMatch
                        );
                      }).length
                    }
                  </strong>{' '}
                  of {parsedData.students.length} students
                </span>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {(() => {
                const filtered = parsedData.students.filter((st) => {
                  if (!studentSearchQuery.trim()) return true;
                  const q = studentSearchQuery.toLowerCase();
                  const name = (st.full_name || st.name || '').toLowerCase();
                  const email = (st.email || '').toLowerCase();
                  const roll = (st.enrollment_no || st.enrollmentNo || st.roll_no || st.rollNo || '').toLowerCase();
                  const batch = (st.batch || '').toLowerCase();
                  const electives = extractStudentElectives(st);
                  const electiveMatch = electives.some(
                    (e) => e.choice.toLowerCase().includes(q) || e.track.toLowerCase().includes(q)
                  );
                  return (
                    name.includes(q) ||
                    email.includes(q) ||
                    roll.includes(q) ||
                    batch.includes(q) ||
                    electiveMatch
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-ink-muted text-xs">
                      <p className="font-semibold text-ink-secondary">
                        No students match your search query "{studentSearchQuery}"
                      </p>
                      <button
                        type="button"
                        onClick={() => setStudentSearchQuery('')}
                        className="mt-2 text-brand hover:underline font-medium cursor-pointer"
                      >
                        Clear search query
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="border border-border-subtle rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-canvas border-b border-border-subtle text-ink-muted text-2xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Enrollment / Roll No</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3 text-center">Sec</th>
                          <th className="py-2.5 px-3 text-center">Batch</th>
                          <th className="py-2.5 px-3">Program Elective Allotment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle text-ink-primary">
                        {filtered.map((st, idx) => {
                          const electives = extractStudentElectives(st);

                          return (
                            <tr key={idx} className="hover:bg-surface-hover/60 transition-colors">
                              <td className="py-2.5 px-3 text-center text-ink-muted font-mono text-2xs">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-ink-primary">
                                {st.full_name || st.name || 'Unnamed Student'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-2xs text-ink-secondary">
                                {st.enrollment_no || st.enrollmentNo || st.roll_no || st.rollNo || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-ink-muted font-mono text-2xs">
                                {st.email || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-1.5 py-0.5 bg-canvas border border-border-subtle rounded text-2xs font-mono">
                                  {st.section || 'A'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge variant="info" className="text-2xs font-mono">
                                  {st.batch || 'Batch A'}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3">
                                {electives.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {electives.map((el, i) => {
                                      let colorClasses = "bg-purple-50 text-purple-700 border-purple-200";
                                      let trackBadgeColor = "bg-purple-200/80 text-purple-900";
                                      if (el.track.includes('II') || el.track.includes('2')) {
                                        colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                        trackBadgeColor = "bg-indigo-200/80 text-indigo-900";
                                      } else if (el.track.includes('III') || el.track.includes('3')) {
                                        colorClasses = "bg-teal-50 text-teal-700 border-teal-200";
                                        trackBadgeColor = "bg-teal-200/80 text-teal-900";
                                      } else if (el.track.includes('IV') || el.track.includes('4')) {
                                        colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
                                        trackBadgeColor = "bg-amber-200/80 text-amber-900";
                                      }
                                      return (
                                        <span
                                          key={i}
                                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-2xs font-medium shadow-2xs ${colorClasses}`}
                                        >
                                          <span className={`px-1 py-0.2 rounded font-bold uppercase tracking-wider text-3xs ${trackBadgeColor}`}>
                                            {el.track}
                                          </span>
                                          <span className="font-semibold">{el.choice}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-ink-muted italic text-2xs">None specified</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border-subtle bg-canvas/40 flex items-center justify-between">
              <span className="text-2xs text-ink-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                All {parsedData.students.length} student records validated and ready for provisioning.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllStudentsModal(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
