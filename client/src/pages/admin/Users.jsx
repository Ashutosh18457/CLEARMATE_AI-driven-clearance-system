import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { ROLES, ROLE_LABELS, DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/constants';
import {
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineArrowUpTray,
  HiOutlineNoSymbol,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineMagnifyingGlass,
  HiOutlineCheckBadge,
  HiOutlineBookOpen,
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: 'Pass@123',
  role: 'student',
  enrollmentNo: '',
  programId: '',
  currentSemester: '',
  section: '',
  sectionType: '',
  assignedProgramId: '',
  assignedSemester: '',
  assignedSection: 'all',
  isActive: true,
};

const USER_TABS = [
  { id: 'all', label: 'All Users', icon: HiOutlineUsers, desc: 'Complete directory of all registered accounts across all roles' },
  { id: 'teacher', label: 'Teachers / Faculty', icon: HiOutlineBookOpen, desc: 'Teaching faculty responsible for subject, lab, and elective clearance evaluations' },
  { id: 'class_incharge', label: 'Class Incharges', icon: HiOutlineUserGroup, desc: 'Class Incharges overseeing semester/section cohort approvals (Stage 3 Review)' },
  { id: 'student', label: 'Students', icon: HiOutlineAcademicCap, desc: 'Enrolled students roster, semester levels, and section allocations' },
  { id: 'staff', label: 'Section Heads & Staff', icon: HiOutlineBuildingOffice2, desc: 'Clearance officers for Library, Accounts, Bus, Hostel, and Department Admins' },
];

export default function Users() {
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Bulk upload modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  // Faculty / Class Incharge Student Assignment Modal
  const [ciModalOpen, setCiModalOpen] = useState(false);
  const [selectedCI, setSelectedCI] = useState(null);
  const [ciProgramId, setCiProgramId] = useState('');
  const [ciSemester, setCiSemester] = useState('');
  const [ciSection, setCiSection] = useState('all');
  const [ciSelectedStudents, setCiSelectedStudents] = useState([]);
  const [ciStudentSearch, setCiStudentSearch] = useState('');
  const [ciAllStudents, setCiAllStudents] = useState([]);
  const [ciLoadingStudents, setCiLoadingStudents] = useState(false);
  const [ciSaving, setCiSaving] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch { /* non-critical */ }
  }, []);

  const getQueryRole = useCallback(() => {
    if (activeTab === 'teacher') return 'teacher';
    if (activeTab === 'class_incharge') return 'class_incharge';
    if (activeTab === 'student') return 'student';
    if (activeTab === 'staff') return 'section_head,admin,hod,account_section,bus_section';
    return filterRole;
  }, [activeTab, filterRole]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      const roleParam = getQueryRole();
      if (roleParam) params.role = roleParam;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/users', { params });
      const data = res.data.data;
      setUsers(data.users || data || []);
      setTotalPages(data.totalPages || data.pagination?.pages || 1);
      setTotalCount(data.total || data.pagination?.total || (data.users?.length || 0));
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, getQueryRole, search]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [activeTab, filterRole, search]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearch('');
    if (tabId !== 'all') {
      setFilterRole('');
    }
  };

  const openCreate = (defaultRole) => {
    let role = defaultRole || 'student';
    if (activeTab === 'teacher') role = 'teacher';
    else if (activeTab === 'class_incharge') role = 'class_incharge';
    else if (activeTab === 'student') role = 'student';
    else if (activeTab === 'staff') role = 'section_head';

    setForm({
      ...EMPTY_FORM,
      role,
      isActive: true,
    });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      enrollmentNo: user.enrollmentNo || '',
      programId: user.programId?._id || user.programId || '',
      currentSemester: user.currentSemester || '',
      section: user.section || '',
      sectionType: user.sectionType || '',
      assignedProgramId: user.assignedProgramId?._id || user.assignedProgramId || '',
      assignedSemester: user.assignedSemester || '',
      assignedSection: user.assignedSection || 'all',
      isActive: user.isActive !== false,
    });
    setEditing(user._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) {
      toast.error('Name, email, and role are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!editing && !payload.password) {
        payload.password = 'Pass@123';
      }
      if (editing && !payload.password) {
        delete payload.password;
      }
      if (payload.role !== 'student') {
        delete payload.enrollmentNo;
        delete payload.currentSemester;
        delete payload.section;
      }
      if (payload.role !== 'student' && payload.role !== 'admin' && payload.role !== 'hod') {
        delete payload.programId;
      }
      if (payload.role !== 'section_head') {
        delete payload.sectionType;
      }
      if (payload.role !== 'class_incharge' && payload.role !== 'teacher') {
        delete payload.assignedProgramId;
        delete payload.assignedSemester;
        delete payload.assignedSection;
      }
      if (payload.currentSemester) {
        payload.currentSemester = Number(payload.currentSemester);
      }
      if (payload.assignedSemester) {
        payload.assignedSemester = Number(payload.assignedSemester);
      }

      if (editing) {
        await api.put(`/admin/users/${editing}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User created successfully');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.role === 'admin' || user.role === 'super_admin') {
      toast.error('Admin accounts cannot be deactivated');
      return;
    }
    const isActivating = user.isActive === false;
    try {
      const res = await api.patch(`/admin/users/${user._id}/deactivate`);
      toast.success(res.data?.message || (isActivating ? 'User account activated successfully' : 'User account deactivated'));
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please select a valid .csv file');
      return;
    }

    setFileName(file.name);
    setBulkResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setCsvData(text);

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 11).map((line, idx) => {
          const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          return { rowNo: idx + 2, cells };
        });
        setPreviewRows({ headers, rows });
      } else {
        setPreviewRows({ headers: [], rows: [] });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/admin/students/sample-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_students_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      const csvStr = 'student_id,full_name,email,department,semester,section\nEN2024CSE001,Aarav Sharma,aarav.sharma@sbjain.edu.in,CSE,6,A\nEN2024CSE002,Ananya Patel,ananya.patel@sbjain.edu.in,CSE,6,A\nEN2024ECE001,Rohan Verma,rohan.verma@sbjain.edu.in,ECE,4,B\n';
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample_students_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleBulkUpload = async () => {
    if (!csvData.trim()) {
      toast.error('Please select or paste CSV data');
      return;
    }
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const res = await api.post('/admin/students/bulk-upload', {
        csvContent: csvData,
        filename: fileName || 'students_upload.csv',
      });
      setBulkResults(res.data.data);
      toast.success(res.data.message || 'Bulk CSV upload completed');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Bulk upload failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const openAssignFaculty = async (user) => {
    setSelectedCI(user);
    setCiProgramId(user.assignedProgramId?._id || user.assignedProgramId || '');
    setCiSemester(user.assignedSemester || '');
    setCiSection(user.assignedSection || 'all');
    setCiSelectedStudents(
      Array.isArray(user.assignedStudents)
        ? user.assignedStudents.map((s) => (typeof s === 'object' ? s._id : s))
        : []
    );
    setCiStudentSearch('');
    setCiModalOpen(true);

    setCiLoadingStudents(true);
    try {
      const res = await api.get('/tasks/students');
      setCiAllStudents(res.data.data || []);
    } catch {
      try {
        const fallback = await api.get('/admin/users', { params: { role: 'student', limit: 500 } });
        setCiAllStudents(fallback.data.data.users || fallback.data.data || []);
      } catch {
        setCiAllStudents([]);
      }
    } finally {
      setCiLoadingStudents(false);
    }
  };

  const handleSaveCIAssignment = async () => {
    if (!selectedCI) return;
    setCiSaving(true);
    try {
      const payload = {
        assignedProgramId: ciProgramId || undefined,
        assignedSemester: ciSemester ? Number(ciSemester) : undefined,
        assignedSection: ciSection || undefined,
        assignedStudents: ciSelectedStudents,
      };
      await api.put(`/admin/class-incharges/${selectedCI._id}/assign`, payload);
      const roleName = selectedCI.role === 'teacher' ? 'Faculty / Teacher' : 'Class Incharge';
      toast.success(`${roleName} assignment saved successfully`);
      setCiModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to save student assignment');
    } finally {
      setCiSaving(false);
    }
  };

  // Columns for Teacher Tab
  const teacherColumns = [
    {
      key: 'name',
      label: 'Teacher Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-semibold flex items-center justify-center text-xs border border-blue-200">
            {val?.[0]?.toUpperCase() || 'T'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{val}</p>
            <p className="text-xs text-ink-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedProgramId',
      label: 'Department / Program',
      render: (val) => (
        <span className="text-xs font-medium text-ink-primary">
          {val?.name ? `${val.name} (${val.code})` : 'All Departments'}
        </span>
      ),
    },
    {
      key: 'assignedScope',
      label: 'Assigned Cohort',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-brand-50 text-brand text-xs font-semibold border border-brand/20">
            {row.assignedSemester ? `Sem ${row.assignedSemester}` : 'All Semesters'}
          </span>
          <span className="px-2 py-0.5 rounded bg-canvas text-ink-secondary text-xs font-medium border border-border-subtle">
            {row.assignedSection && row.assignedSection !== 'all' ? `Sec ${row.assignedSection}` : 'All Sections'}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedStudents',
      label: 'Assigned Students',
      render: (val) => {
        const count = Array.isArray(val) ? val.length : 0;
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            count > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-surface-100 text-ink-muted'
          }`}>
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
            {count > 0 ? `${count} Students` : 'All Matching Cohort'}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'rejected'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openAssignFaculty(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-brand bg-brand-50 hover:bg-brand-100 border border-brand/20 rounded-md transition-colors shadow-xs"
            title="Assign Specific Cohort / Students to Teacher"
          >
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
            Assign Students
          </button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit Teacher">
            <HiOutlinePencilSquare className="w-4 h-4 text-ink-secondary hover:text-brand" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            title={row.isActive !== false ? 'Deactivate Account' : 'Reactivate / Enable Account'}
          >
            {row.isActive !== false ? (
              <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected hover:text-red-700 transition-colors" />
            ) : (
              <HiOutlineCheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Columns for Class Incharge Tab
  const classInchargeColumns = [
    {
      key: 'name',
      label: 'Class Incharge',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-semibold flex items-center justify-center text-xs border border-amber-200">
            {val?.[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{val}</p>
            <p className="text-xs text-ink-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'assignedProgramId',
      label: 'Assigned Department',
      render: (val) => (
        <span className="text-xs font-medium text-ink-primary">
          {val?.name ? `${val.name} (${val.code})` : 'All Departments'}
        </span>
      ),
    },
    {
      key: 'assignedScope',
      label: 'Cohort Scope',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-brand-50 text-brand text-xs font-semibold border border-brand/20">
            {row.assignedSemester ? `Sem ${row.assignedSemester}` : 'All Semesters'}
          </span>
          <span className="px-2 py-0.5 rounded bg-canvas text-ink-secondary text-xs font-medium border border-border-subtle">
            {row.assignedSection && row.assignedSection !== 'all' ? `Sec ${row.assignedSection}` : 'All Sections'}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedStudents',
      label: 'Assigned Students',
      render: (val) => {
        const count = Array.isArray(val) ? val.length : 0;
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            count > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-surface-100 text-ink-muted'
          }`}>
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
            {count > 0 ? `${count} Students` : 'All Matching Cohort'}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'rejected'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openAssignFaculty(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-brand bg-brand-50 hover:bg-brand-100 border border-brand/20 rounded-md transition-colors shadow-xs"
            title="Assign Specific Cohort / Students"
          >
            <HiOutlineUserGroup className="w-3.5 h-3.5" />
            Assign Scope
          </button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit">
            <HiOutlinePencilSquare className="w-4 h-4 text-ink-secondary hover:text-brand" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            title={row.isActive !== false ? 'Deactivate Account' : 'Reactivate / Enable Account'}
          >
            {row.isActive !== false ? (
              <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected hover:text-red-700 transition-colors" />
            ) : (
              <HiOutlineCheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Columns for Student Tab
  const studentColumns = [
    {
      key: 'name',
      label: 'Student Name',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-100 text-ink-secondary font-semibold flex items-center justify-center text-xs">
            {val?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{val}</p>
            <p className="text-xs text-ink-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment No',
      render: (val) => <span className="font-mono text-xs font-semibold text-ink-primary">{val || '—'}</span>,
    },
    {
      key: 'programId',
      label: 'Program',
      render: (val) => (
        <span className="text-xs text-ink-secondary">
          {val?.code || val?.name || '—'}
        </span>
      ),
    },
    {
      key: 'cohort',
      label: 'Sem & Sec',
      render: (_, row) => (
        <span className="text-xs font-medium text-ink-primary">
          {row.currentSemester ? `Sem ${row.currentSemester}` : '—'} {row.section ? `• Sec ${row.section}` : ''}
        </span>
      ),
    },
    {
      key: 'batchId',
      label: 'Lab Batch',
      render: (val) => <span className="text-xs text-ink-muted">{val?.name || '—'}</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'rejected'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit Student">
            <HiOutlinePencilSquare className="w-4 h-4 text-ink-secondary hover:text-brand" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            title={row.isActive !== false ? 'Deactivate Account' : 'Reactivate / Enable Account'}
          >
            {row.isActive !== false ? (
              <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected hover:text-red-700 transition-colors" />
            ) : (
              <HiOutlineCheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Columns for Staff Tab
  const staffColumns = [
    {
      key: 'name',
      label: 'Staff Member',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-semibold flex items-center justify-center text-xs border border-purple-200">
            {val?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{val}</p>
            <p className="text-xs text-ink-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role & Responsibility',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Badge variant={val === 'super_admin' ? 'purple' : val === 'admin' ? 'info' : 'default'}>
            {ROLE_LABELS[val] || val}
          </Badge>
          {row.sectionType && (
            <span className="text-xs font-semibold text-ink-muted capitalize">
              ({DEPARTMENT_LABELS[row.sectionType] || row.sectionType})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'rejected'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit">
            <HiOutlinePencilSquare className="w-4 h-4 text-ink-secondary hover:text-brand" />
          </Button>
          {row.role !== 'admin' && row.role !== 'super_admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(row)}
              title={row.isActive !== false ? 'Deactivate Account' : 'Reactivate / Enable Account'}
            >
              {row.isActive !== false ? (
                <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected hover:text-red-700 transition-colors" />
              ) : (
                <HiOutlineCheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Standard Columns for All Tab
  const allColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (val, row) => (
        <div>
          <span className="text-sm font-semibold text-ink-primary">{val}</span>
          <span className="block text-xs text-ink-muted">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role & Assignment',
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant={val === 'super_admin' ? 'purple' : val === 'admin' ? 'info' : val === 'class_incharge' ? 'warning' : 'default'}>
            {ROLE_LABELS[val] || val}
          </Badge>
          {(val === 'class_incharge' || val === 'teacher') && (
            <span className="text-[11px] text-ink-muted">
              {row.assignedSection && row.assignedSection !== 'all' ? `Sec ${row.assignedSection}` : 'All Secs'}
              {row.assignedSemester ? ` • Sem ${row.assignedSemester}` : ''}
              {row.assignedStudents?.length > 0 ? ` (${row.assignedStudents.length} students)` : ''}
            </span>
          )}
          {val === 'student' && row.enrollmentNo && (
            <span className="text-[11px] font-mono text-ink-muted">{row.enrollmentNo}</span>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Program / Scope',
      render: (_, row) => (
        <span className="text-xs text-ink-secondary">
          {row.programId?.code || row.assignedProgramId?.code || row.sectionType || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'rejected'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {(row.role === 'class_incharge' || row.role === 'teacher') && (
            <button
              onClick={() => openAssignFaculty(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand bg-brand-50 hover:bg-brand-100 border border-brand/20 rounded-md transition-colors mr-1"
              title="Assign Students / Scope to Faculty"
            >
              <HiOutlineUserGroup className="w-3.5 h-3.5" />
              Assign Scope
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit User">
            <HiOutlinePencilSquare className="w-4 h-4 text-ink-secondary hover:text-brand" />
          </Button>
          {row.role !== 'admin' && row.role !== 'super_admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(row)}
              title={row.isActive !== false ? 'Deactivate Account' : 'Reactivate / Enable Account'}
            >
              {row.isActive !== false ? (
                <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected hover:text-red-700 transition-colors" />
              ) : (
                <HiOutlineCheckCircle className="w-4 h-4 text-green-600 hover:text-green-700 transition-colors" />
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const getActiveColumns = () => {
    switch (activeTab) {
      case 'teacher': return teacherColumns;
      case 'class_incharge': return classInchargeColumns;
      case 'student': return studentColumns;
      case 'staff': return staffColumns;
      default: return allColumns;
    }
  };

  const ROLE_OPTIONS = [
    { value: '', label: 'All roles' },
    ...Object.entries(ROLE_LABELS).map(([key, label]) => ({ value: key, label })),
  ];

  const activeTabMeta = USER_TABS.find((t) => t.id === activeTab) || USER_TABS[0];

  return (
    <DashboardLayout title="User Management">
      {/* ─── Top Section Tabs ─── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 border-b border-border-subtle overflow-x-auto custom-scrollbar pb-1">
          {USER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'border-brand text-brand bg-brand-50/40 rounded-t-md'
                    : 'border-transparent text-ink-muted hover:text-ink-primary hover:bg-canvas rounded-t-md'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Description & Context Banner */}
        <div className="mt-3 flex items-center justify-between text-xs text-ink-muted bg-canvas p-3 rounded-md border border-border-subtle flex-wrap gap-2">
          <span>{activeTabMeta.desc}</span>
          <span className="font-semibold text-ink-secondary">Showing {totalCount} accounts</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'all' && (
            <select
              id="filter-role"
              name="filterRole"
              className="select-base w-44 text-xs"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              id="filter-search"
              name="search"
              type="search"
              className="input-base pl-9 w-64 text-xs"
              placeholder={`Search ${activeTabMeta.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'student' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setBulkResults(null); setCsvData(''); setBulkOpen(true); }}
              icon={<HiOutlineArrowUpTray className="w-4 h-4" />}
            >
              Bulk Upload Students
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreate()}
            icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          >
            {activeTab === 'teacher'
              ? 'Add Teacher'
              : activeTab === 'class_incharge'
              ? 'Add Class Incharge'
              : activeTab === 'student'
              ? 'Add Student'
              : activeTab === 'staff'
              ? 'Add Staff Member'
              : 'Create User'}
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Table
        columns={getActiveColumns()}
        data={users}
        loading={loading}
        emptyMessage={`No ${activeTabMeta.label.toLowerCase()} found`}
        emptyIcon={<activeTabMeta.icon className="w-10 h-10 text-ink-muted" />}
        pagination={{ page, totalPages, onPageChange: setPage }}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${ROLE_LABELS[form.role] || 'User'}` : `Create New ${ROLE_LABELS[form.role] || 'User'}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {editing ? 'Update Account' : 'Create Account'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-form-name" className="label-base">Full Name</label>
            <input id="user-form-name" name="name" className="input-base" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Prof. Rajesh Kumar" />
          </div>
          <div>
            <label htmlFor="user-form-email" className="label-base">Email Address</label>
            <input id="user-form-email" name="email" className="input-base" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@sbjain.edu.in" />
          </div>
          <div>
            <label htmlFor="user-form-password" className="label-base">
              Password {editing ? <span className="text-ink-muted">(leave blank to keep)</span> : <span className="text-brand text-xs">(default: Pass@123)</span>}
            </label>
            <input id="user-form-password" name="password" className="input-base" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? '••••••••' : 'Pass@123'} />
          </div>
          <div>
            <label htmlFor="user-form-role" className="label-base">Role</label>
            <select id="user-form-role" name="role" className="select-base" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Account Status */}
          <div>
            <label htmlFor="user-form-status" className="label-base font-semibold">Account Status</label>
            <select
              id="user-form-status"
              name="isActive"
              className="select-base"
              value={form.isActive !== false ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
            >
              <option value="true">Active (Access Enabled)</option>
              <option value="false">Inactive (Suspended)</option>
            </select>
          </div>

          {/* Teacher / Class Incharge Specific Configuration */}
          {(form.role === 'class_incharge' || form.role === 'teacher') && (
            <>
              <div>
                <label htmlFor="ci-assign-program" className="label-base font-semibold">
                  📋 Assigned Department / Program
                </label>
                <select
                  id="ci-assign-program"
                  className="select-base"
                  value={form.assignedProgramId}
                  onChange={(e) => setForm({ ...form, assignedProgramId: e.target.value })}
                >
                  <option value="">-- All Programs --</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ci-assign-semester" className="label-base font-semibold">
                  Assigned Semester
                </label>
                <select
                  id="ci-assign-semester"
                  className="select-base"
                  value={form.assignedSemester}
                  onChange={(e) => setForm({ ...form, assignedSemester: e.target.value })}
                >
                  <option value="">-- All Semesters --</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ci-assign-section" className="label-base font-semibold">
                  Assigned Section
                </label>
                <select
                  id="ci-assign-section"
                  className="select-base"
                  value={form.assignedSection}
                  onChange={(e) => setForm({ ...form, assignedSection: e.target.value })}
                >
                  <option value="all">All Sections (A, B, C, D)</option>
                  {['A', 'B', 'C', 'D'].map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Admin / HOD / Student Branch & Program selector */}
          {(form.role === 'admin' || form.role === 'hod' || form.role === 'student') && (
            <div>
              <label htmlFor="user-form-program" className="label-base font-semibold">
                {form.role === 'admin'
                  ? '🛡️ Assigned Branch / Department (Admin Scope)'
                  : form.role === 'hod'
                  ? '👨‍💼 Assigned Department (HOD Scope)'
                  : '🎓 Academic Program'}
              </label>
              <select
                id="user-form-program"
                name="programId"
                className="select-base"
                value={form.programId}
                onChange={(e) => setForm({ ...form, programId: e.target.value })}
              >
                <option value="">-- Select Branch / Program --</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student-specific fields */}
          {form.role === 'student' && (
            <>
              <div>
                <label htmlFor="user-form-enrollment" className="label-base">Enrollment No</label>
                <input id="user-form-enrollment" name="enrollmentNo" className="input-base font-mono" value={form.enrollmentNo}
                  onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} placeholder="e.g. EN2024CSE001" />
              </div>
              <div>
                <label htmlFor="user-form-semester" className="label-base">Current Semester</label>
                <input id="user-form-semester" name="currentSemester" className="input-base" type="number" min="1" max="10"
                  value={form.currentSemester}
                  onChange={(e) => setForm({ ...form, currentSemester: e.target.value })} placeholder="e.g. 6" />
              </div>
              <div>
                <label htmlFor="user-form-section" className="label-base">Section</label>
                <input id="user-form-section" name="section" className="input-base" value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. A, B" />
              </div>
            </>
          )}

          {/* Section head fields */}
          {form.role === 'section_head' && (
            <div>
              <label htmlFor="user-form-section-type" className="label-base">Section Type</label>
              <select id="user-form-section-type" name="sectionType" className="select-base" value={form.sectionType}
                onChange={(e) => setForm({ ...form, sectionType: e.target.value })}>
                <option value="">Select Department Section</option>
                {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          setBulkResults(null);
          setCsvData('');
          setFileName('');
          setPreviewRows([]);
        }}
        title="Bulk Upload Students via CSV"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkOpen(false);
                setBulkResults(null);
                setCsvData('');
                setFileName('');
                setPreviewRows([]);
              }}
            >
              {bulkResults ? 'Close' : 'Cancel'}
            </Button>
            {!bulkResults && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkUpload}
                loading={bulkLoading}
                disabled={!csvData.trim()}
              >
                Confirm & Upload Students
              </Button>
            )}
          </>
        }
      >
        {!bulkResults ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-canvas p-3 rounded-md border border-border-subtle">
              <div>
                <p className="text-xs font-semibold text-ink-primary">Expected Columns:</p>
                <p className="text-[11px] font-mono text-ink-muted">
                  student_id, full_name, email, department, semester, section
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1 bg-surface hover:bg-surface-hover border border-border-subtle text-brand text-xs font-medium rounded transition-all flex items-center gap-1.5"
              >
                Download Sample CSV
              </button>
            </div>

            <div className="border-2 border-dashed border-border-subtle hover:border-brand/40 rounded-lg p-6 text-center transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                <HiOutlineArrowUpTray className="w-8 h-8 text-brand" />
                <span className="text-sm font-medium text-ink-primary">
                  {fileName || 'Click to choose or drag & drop CSV file'}
                </span>
                <span className="text-xs text-ink-muted">Supports .csv files up to 5MB</span>
              </label>
            </div>

            {previewRows?.rows?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-primary">Preview (First 10 rows):</p>
                <div className="overflow-x-auto border border-border-subtle rounded-md max-h-48 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas text-ink-muted border-b border-border-subtle sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        {previewRows.headers.map((h, i) => (
                          <th key={i} className="p-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {previewRows.rows.map((r) => (
                        <tr key={r.rowNo} className="hover:bg-canvas/50">
                          <td className="p-2 text-ink-muted font-mono">{r.rowNo}</td>
                          {r.cells.map((c, i) => (
                            <td key={i} className="p-2">{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-canvas border border-border-subtle rounded-md">
                <p className="text-xs text-ink-muted">Processed</p>
                <p className="text-xl font-bold text-ink-primary">{bulkResults.totalRows}</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-700">Created</p>
                <p className="text-xl font-bold text-green-700">{bulkResults.createdCount}</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700">Errors / Skipped</p>
                <p className="text-xl font-bold text-red-700">{bulkResults.failedCount}</p>
              </div>
            </div>

            {bulkResults.errors?.length > 0 && (
              <div className="border border-red-200 bg-red-50/50 rounded-md p-3 max-h-44 overflow-y-auto custom-scrollbar">
                <p className="text-xs font-bold text-red-700 mb-2">Error Details:</p>
                <ul className="text-xs space-y-1 text-red-600">
                  {bulkResults.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row} ({err.email}): {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Faculty / Class Incharge Assignment Scope Modal */}
      <Modal
        isOpen={ciModalOpen}
        onClose={() => setCiModalOpen(false)}
        title={`Assign Students & Cohort to ${ROLE_LABELS[selectedCI?.role] || 'Faculty Member'}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-ink-muted">
              {ciSelectedStudents.length > 0
                ? `${ciSelectedStudents.length} students explicitly assigned`
                : 'All matching cohort students will be auto-assigned'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCiModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveCIAssignment} loading={ciSaving}>
                Save Assignment Scope
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-brand-50/50 border border-brand/20 rounded-md">
            <div>
              <p className="text-xs font-bold text-brand uppercase tracking-wider">
                {selectedCI?.role === 'teacher' ? 'Faculty / Teacher' : 'Class Incharge'}
              </p>
              <p className="text-sm font-semibold text-ink-primary">{selectedCI?.name}</p>
              <p className="text-xs text-ink-muted">{selectedCI?.email}</p>
            </div>
            <Badge variant={selectedCI?.role === 'class_incharge' ? 'warning' : 'info'}>
              {ROLE_LABELS[selectedCI?.role] || 'Faculty Member'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-canvas border border-border-subtle rounded-md">
            <div>
              <label htmlFor="ci-program" className="label-base text-xs font-medium">
                Program / Department
              </label>
              <select
                id="ci-program"
                className="select-base text-xs"
                value={ciProgramId}
                onChange={(e) => setCiProgramId(e.target.value)}
              >
                <option value="">All Programs</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ci-semester" className="label-base text-xs font-medium">
                Assigned Semester
              </label>
              <select
                id="ci-semester"
                className="select-base text-xs"
                value={ciSemester}
                onChange={(e) => setCiSemester(e.target.value)}
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ci-section" className="label-base text-xs font-medium">
                Assigned Section
              </label>
              <select
                id="ci-section"
                className="select-base text-xs"
                value={ciSection}
                onChange={(e) => setCiSection(e.target.value)}
              >
                <option value="all">All Sections</option>
                {['A', 'B', 'C', 'D'].map((sec) => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search students by name or enrollment..."
                  className="input-base pl-9 text-xs"
                  value={ciStudentSearch}
                  onChange={(e) => setCiStudentSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const filtered = ciAllStudents.filter((s) => {
                      if (ciProgramId && s.programId?._id !== ciProgramId && s.programId !== ciProgramId) return false;
                      if (ciSemester && Number(s.currentSemester) !== Number(ciSemester)) return false;
                      if (ciSection && ciSection !== 'all' && s.section !== ciSection) return false;
                      if (ciStudentSearch) {
                        const term = ciStudentSearch.toLowerCase();
                        const nameMatch = s.name?.toLowerCase().includes(term);
                        const enrollMatch = s.enrollmentNo?.toLowerCase().includes(term);
                        if (!nameMatch && !enrollMatch) return false;
                      }
                      return true;
                    });
                    const filteredIds = filtered.map((s) => s._id);
                    const allSelected = filteredIds.every((id) => ciSelectedStudents.includes(id));
                    if (allSelected) {
                      setCiSelectedStudents(ciSelectedStudents.filter((id) => !filteredIds.includes(id)));
                    } else {
                      const newSet = new Set([...ciSelectedStudents, ...filteredIds]);
                      setCiSelectedStudents(Array.from(newSet));
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-brand bg-brand-50 hover:bg-brand-100 border border-brand/20 rounded-md transition-colors"
                >
                  Toggle Select All Filtered
                </button>
                {ciSelectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCiSelectedStudents([])}
                    className="px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:text-status-rejected transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="border border-border-subtle rounded-md max-h-60 overflow-y-auto custom-scrollbar divide-y divide-border-subtle bg-surface">
              {ciLoadingStudents ? (
                <div className="p-6 text-center text-xs text-ink-muted">Loading students roster...</div>
              ) : (
                (() => {
                  const filtered = ciAllStudents.filter((s) => {
                    if (ciProgramId && s.programId?._id !== ciProgramId && s.programId !== ciProgramId) return false;
                    if (ciSemester && Number(s.currentSemester) !== Number(ciSemester)) return false;
                    if (ciSection && ciSection !== 'all' && s.section !== ciSection) return false;
                    if (ciStudentSearch) {
                      const term = ciStudentSearch.toLowerCase();
                      const nameMatch = s.name?.toLowerCase().includes(term);
                      const enrollMatch = s.enrollmentNo?.toLowerCase().includes(term);
                      if (!nameMatch && !enrollMatch) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-ink-muted">
                        No students found matching current filters.
                      </div>
                    );
                  }

                  return filtered.map((st) => {
                    const isChecked = ciSelectedStudents.includes(st._id);
                    return (
                      <label
                        key={st._id}
                        className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-hover cursor-pointer transition-colors ${
                          isChecked ? 'bg-brand-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            className="rounded border-border text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCiSelectedStudents(ciSelectedStudents.filter((id) => id !== st._id));
                              } else {
                                setCiSelectedStudents([...ciSelectedStudents, st._id]);
                              }
                            }}
                          />
                          <div>
                            <span className="font-medium text-ink-primary">{st.name}</span>
                            <span className="font-mono text-ink-muted ml-2">({st.enrollmentNo || 'No Enroll'})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {st.programId?.code && (
                            <span className="px-1.5 py-0.5 bg-canvas border border-border-subtle rounded text-[10px] text-ink-secondary">
                              {st.programId.code}
                            </span>
                          )}
                          {st.currentSemester && (
                            <span className="px-1.5 py-0.5 bg-canvas border border-border-subtle rounded text-[10px] text-ink-secondary">
                              Sem {st.currentSemester}
                            </span>
                          )}
                          {st.section && (
                            <span className="px-1.5 py-0.5 bg-brand-50 border border-brand/20 rounded text-[10px] font-semibold text-brand">
                              Sec {st.section}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
