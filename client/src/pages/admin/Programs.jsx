import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import {
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineAcademicCap,
  HiOutlineMagnifyingGlass,
  HiOutlineSparkles,
  HiOutlineBuildingLibrary,
  HiOutlineClock,
} from 'react-icons/hi2';

const DEGREE_CATEGORIES = ['ALL', 'B.Tech', 'M.Tech', 'MCA', 'BCA', 'MBA', 'Other'];

const DEGREE_CONFIG = {
  'B.Tech': {
    label: 'B.Tech (Bachelor of Technology)',
    defaultSemesters: 8,
    defaultDept: 'Faculty of Engineering & Technology',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    branches: [
      { name: 'Computer Science & Engineering', code: 'CSE', dept: 'Computer Science' },
      { name: 'Artificial Intelligence & Machine Learning', code: 'AIML', dept: 'Emerging Technologies' },
      { name: 'Data Science', code: 'DS', dept: 'Emerging Technologies' },
      { name: 'Information Technology', code: 'IT', dept: 'Information Technology' },
      { name: 'Electronics & Communication', code: 'ECE', dept: 'Electronics & Communication' },
      { name: 'Mechanical Engineering', code: 'ME', dept: 'Mechanical Engineering' },
      { name: 'Civil Engineering', code: 'CE', dept: 'Civil Engineering' },
      { name: 'Electrical Engineering', code: 'EE', dept: 'Electrical Engineering' },
    ],
  },
  'M.Tech': {
    label: 'M.Tech (Master of Technology)',
    defaultSemesters: 4,
    defaultDept: 'Faculty of Post-Graduate Studies',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
    branches: [
      { name: 'Computer Science & Engineering', code: 'CSE', dept: 'Computer Science' },
      { name: 'VLSI & Embedded Systems', code: 'VLSI', dept: 'Electronics' },
      { name: 'Thermal Engineering', code: 'TE', dept: 'Mechanical' },
      { name: 'Structural Engineering', code: 'SE', dept: 'Civil' },
    ],
  },
  'MCA': {
    label: 'MCA (Master of Computer Applications)',
    defaultSemesters: 4,
    defaultDept: 'Department of Computer Applications',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dotColor: 'bg-cyan-500',
    branches: [
      { name: 'Computer Applications (General)', code: 'GEN', dept: 'Computer Applications' },
      { name: 'Cloud Computing & DevOps', code: 'CLOUD', dept: 'Computer Applications' },
      { name: 'Cyber Security & Forensics', code: 'CYBER', dept: 'Computer Applications' },
      { name: 'AI & Data Intelligence', code: 'AIDI', dept: 'Computer Applications' },
    ],
  },
  'BCA': {
    label: 'BCA (Bachelor of Computer Applications)',
    defaultSemesters: 6,
    defaultDept: 'Department of Computer Applications',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    branches: [
      { name: 'Computer Applications (Core)', code: 'CORE', dept: 'Computer Applications' },
      { name: 'Data Analytics', code: 'DA', dept: 'Computer Applications' },
      { name: 'Software Development & UI/UX', code: 'DEV', dept: 'Computer Applications' },
    ],
  },
  'MBA': {
    label: 'MBA (Master of Business Administration)',
    defaultSemesters: 4,
    defaultDept: 'Department of Management Studies',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    branches: [
      { name: 'Finance Management', code: 'FIN', dept: 'Management Studies' },
      { name: 'Marketing Management', code: 'MKT', dept: 'Management Studies' },
      { name: 'Human Resource Management', code: 'HR', dept: 'Management Studies' },
      { name: 'Business Analytics & IT', code: 'BA', dept: 'Management Studies' },
      { name: 'Operations & Supply Chain', code: 'OPS', dept: 'Management Studies' },
    ],
  },
  'Other': {
    label: 'Other Degree / Diploma',
    defaultSemesters: 6,
    defaultDept: 'Academic Affairs',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-500',
    branches: [
      { name: 'Bachelor of Business Administration (BBA)', code: 'BBA', dept: 'Management' },
      { name: 'Bachelor of Science (B.Sc)', code: 'BSC', dept: 'Science' },
      { name: 'Master of Science (M.Sc)', code: 'MSC', dept: 'Science' },
    ],
  },
};

const EMPTY_FORM = {
  degree: 'B.Tech',
  branch: '',
  name: '',
  code: '',
  department: 'Computer Science',
  totalSemesters: 8,
  departmentAdminId: '',
  hodId: '',
  isActive: true,
};

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const [adminRes, hodRes] = await Promise.all([
        api.get('/admin/users', { params: { role: 'admin', limit: 100 } }),
        api.get('/admin/users', { params: { role: 'hod', limit: 100 } }),
      ]);
      setAdmins(adminRes.data.data?.users || adminRes.data.data || []);
      setHods(hodRes.data.data?.users || hodRes.data.data || []);
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
    fetchStaff();
  }, [fetchPrograms, fetchStaff]);

  // Compute live branch counts per degree category
  const categoryCounts = useMemo(() => {
    const counts = { ALL: programs.length };
    DEGREE_CATEGORIES.forEach((deg) => {
      if (deg !== 'ALL') {
        counts[deg] = programs.filter((p) => (p.degree || 'B.Tech') === deg).length;
      }
    });
    return counts;
  }, [programs]);

  // Filter programs based on active category and search
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesCategory =
        selectedCategory === 'ALL' || (p.degree || 'B.Tech') === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.branch && p.branch.toLowerCase().includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [programs, selectedCategory, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (program) => {
    setForm({
      degree: program.degree || 'B.Tech',
      branch: program.branch || '',
      name: program.name,
      code: program.code,
      department: program.department,
      totalSemesters: program.totalSemesters || 8,
      departmentAdminId: program.departmentAdminId?._id || program.departmentAdminId || '',
      hodId: program.hodId?._id || program.hodId || '',
      isActive: program.isActive !== false,
    });
    setEditing(program._id);
    setModalOpen(true);
  };

  // Helper when user selects a preset branch chip
  const applyBranchPreset = (preset) => {
    const deg = form.degree;
    const cleanBranch = preset.name;
    const formattedName = `${deg} ${cleanBranch}`;
    const formattedCode = `${deg.replace(/[^a-zA-Z]/g, '').toUpperCase()}-${preset.code}`;

    setForm((prev) => ({
      ...prev,
      branch: cleanBranch,
      name: formattedName,
      code: formattedCode,
      department: preset.dept || prev.department,
    }));
  };

  // Helper when user switches degree dropdown in modal
  const handleDegreeChange = (newDegree) => {
    const config = DEGREE_CONFIG[newDegree] || DEGREE_CONFIG['Other'];
    setForm((prev) => ({
      ...prev,
      degree: newDegree,
      totalSemesters: config.defaultSemesters || 8,
      department: config.defaultDept || prev.department,
      branch: '',
      name: prev.branch ? `${newDegree} ${prev.branch}` : '',
      code: prev.code ? `${newDegree.replace(/[^a-zA-Z]/g, '').toUpperCase()}-${prev.code.split('-')[1] || ''}` : '',
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.department.trim()) {
      toast.error('Program Name, Code, and Department are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        totalSemesters: Number(form.totalSemesters) || 8,
      };

      if (editing) {
        await api.put(`/admin/programs/${editing}`, payload);
        toast.success('Program updated successfully');
      } else {
        await api.post('/admin/programs', payload);
        toast.success('New branch/program created successfully');
      }
      setModalOpen(false);
      fetchPrograms();
    } catch (err) {
      toast.error(err.message || 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Program & Branch',
      render: (val, row) => (
        <div>
          <div className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
            <span>{val}</span>
          </div>
          {row.branch && (
            <div className="text-xs text-ink-muted mt-0.5">
              Specialization: <span className="font-medium text-ink-secondary">{row.branch}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'degree',
      label: 'Degree Level',
      render: (val) => {
        const deg = val || 'B.Tech';
        const config = DEGREE_CONFIG[deg] || DEGREE_CONFIG['Other'];
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></span>
            {deg}
          </span>
        );
      },
    },
    {
      key: 'code',
      label: 'Program Code',
      render: (val) => (
        <span className="text-xs font-mono font-semibold bg-canvas px-2 py-1 rounded border border-border-subtle text-ink-primary">
          {val}
        </span>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (val) => (
        <span className="text-xs text-ink-secondary flex items-center gap-1">
          <HiOutlineBuildingLibrary className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          {val}
        </span>
      ),
    },
    {
      key: 'totalSemesters',
      label: 'Duration',
      render: (val) => {
        const sems = val || 8;
        const years = Math.round((sems / 2) * 10) / 10;
        return (
          <span className="text-xs text-ink-secondary flex items-center gap-1 font-medium">
            <HiOutlineClock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            {sems} Sem ({years} Yrs)
          </span>
        );
      },
    },
    {
      key: 'departmentAdminId',
      label: 'Dept Admin (Manager)',
      render: (val, row) => {
        if (val && val.name) {
          return (
            <div>
              <p className="text-xs font-semibold text-ink-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                {val.name}
              </p>
              <p className="text-2xs text-ink-muted">{val.email}</p>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="text-2xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
          >
            + Assign Admin
          </button>
        );
      },
    },
    {
      key: 'hodId',
      label: 'Head of Dept (HOD)',
      render: (val, row) => {
        if (val && val.name) {
          return (
            <div>
              <p className="text-xs font-semibold text-ink-primary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {val.name}
              </p>
              <p className="text-2xs text-ink-muted">{val.email}</p>
            </div>
          );
        }
        return <span className="text-2xs text-ink-muted">Unassigned</span>;
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val !== false ? 'success' : 'default'}>
          {val !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Edit program">
          <HiOutlinePencilSquare className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Academic Programs & Branches">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-ink-primary flex items-center gap-2">
            <HiOutlineAcademicCap className="w-6 h-6 text-brand" />
            Program & Branch Management
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Configure institutional degree programs (B.Tech, M.Tech, MCA, BCA, MBA) and their respective branch specializations.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={openCreate}
          icon={<HiOutlinePlusCircle className="w-5 h-5" />}
        >
          Add New Program / Branch
        </Button>
      </div>

      {/* Degree Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b border-border-subtle scrollbar-none">
        {DEGREE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isSelected
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-ink-secondary border border-border-subtle'
              }`}
            >
              <span>{cat === 'ALL' ? '🎓 All Degrees' : cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-canvas text-ink-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="relative w-full sm:w-80">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-programs"
            name="searchPrograms"
            type="search"
            className="input-base pl-9 text-xs"
            placeholder="Search by branch, degree, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-ink-muted">
          Showing <strong>{filteredPrograms.length}</strong> of <strong>{programs.length}</strong> configured programs
        </div>
      </div>

      {/* Programs Table */}
      <Table
        columns={columns}
        data={filteredPrograms}
        loading={loading}
        emptyMessage="No academic programs match your criteria."
        emptyIcon={<HiOutlineAcademicCap className="w-10 h-10 text-ink-muted" />}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Academic Program' : 'Create New Program / Branch'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {editing ? 'Update Program' : 'Create Program'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Degree Level Selector */}
          <div>
            <label htmlFor="modal-degree" className="label-base">
              Degree / Program Level <span className="text-red-500">*</span>
            </label>
            <select
              id="modal-degree"
              name="degree"
              className="select-base"
              value={form.degree}
              onChange={(e) => handleDegreeChange(e.target.value)}
            >
              {Object.entries(DEGREE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Branch Presets */}
          {DEGREE_CONFIG[form.degree]?.branches?.length > 0 && (
            <div className="p-3 bg-canvas border border-border-subtle rounded-md space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
                <HiOutlineSparkles className="w-4 h-4 text-brand" />
                <span>Popular {form.degree} Branches (Click to auto-fill):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEGREE_CONFIG[form.degree].branches.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => applyBranchPreset(b)}
                    className="px-2.5 py-1 bg-surface hover:bg-surface-hover border border-border-subtle rounded text-xs font-medium text-ink-primary hover:border-brand transition-all"
                  >
                    + {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branch & Code row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-branch" className="label-base">
                Branch / Specialization
              </label>
              <input
                id="modal-branch"
                name="branch"
                className="input-base"
                placeholder="e.g. Artificial Intelligence & Machine Learning"
                value={form.branch}
                onChange={(e) => {
                  const b = e.target.value;
                  setForm((p) => ({
                    ...p,
                    branch: b,
                    name: b ? `${p.degree} ${b}` : p.name,
                  }));
                }}
              />
            </div>

            <div>
              <label htmlFor="modal-code" className="label-base">
                Program Code (Unique) <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-code"
                name="code"
                className="input-base uppercase font-mono"
                placeholder="e.g. BTECH-AIML, MCA, MBA-FIN"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Full Program Title */}
          <div>
            <label htmlFor="modal-name" className="label-base">
              Full Program Display Name <span className="text-red-500">*</span>
            </label>
            <input
              id="modal-name"
              name="name"
              className="input-base"
              placeholder="e.g. B.Tech in Artificial Intelligence & Machine Learning"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Department & Total Semesters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-dept" className="label-base">
                Department / School <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-dept"
                name="department"
                className="input-base"
                placeholder="e.g. Emerging Technologies, Computer Science"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="modal-semesters" className="label-base">
                Total Semesters (Duration) <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-semesters"
                name="totalSemesters"
                type="number"
                min="1"
                max="12"
                className="input-base"
                placeholder="e.g. 8 for B.Tech, 4 for M.Tech/MBA/MCA"
                value={form.totalSemesters}
                onChange={(e) => setForm({ ...form, totalSemesters: e.target.value })}
              />
            </div>
          </div>

          {/* Department Admin & HOD Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-canvas border border-border-subtle rounded-lg">
            <div>
              <label htmlFor="modal-deptAdmin" className="label-base text-purple-900 font-semibold">
                🛡️ Assigned Department Admin
              </label>
              <select
                id="modal-deptAdmin"
                name="departmentAdminId"
                className="select-base text-xs"
                value={form.departmentAdminId || ''}
                onChange={(e) => setForm({ ...form, departmentAdminId: e.target.value })}
              >
                <option value="">-- Unassigned --</option>
                {admins.map((adm) => (
                  <option key={adm._id} value={adm._id}>
                    {adm.name} ({adm.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="modal-hod" className="label-base text-blue-900 font-semibold">
                👨‍💼 Head of Department (HOD)
              </label>
              <select
                id="modal-hod"
                name="hodId"
                className="select-base text-xs"
                value={form.hodId || ''}
                onChange={(e) => setForm({ ...form, hodId: e.target.value })}
              >
                <option value="">-- Unassigned --</option>
                {hods.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Status checkbox for editing */}
          {editing && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modal-isActive"
                name="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border-subtle text-brand focus:ring-brand"
              />
              <label htmlFor="modal-isActive" className="text-sm font-medium text-ink-secondary">
                Active Program (available for new student registrations and semester batches)
              </label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
