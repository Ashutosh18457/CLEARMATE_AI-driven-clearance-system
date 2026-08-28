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
  HiOutlineCalendarDays,
  HiOutlineAcademicCap,
  HiOutlineClock,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineArrowRight,
} from 'react-icons/hi2';

const YEAR_CATEGORIES = [
  {
    id: 'ALL',
    icon: '🎓',
    label: 'All Semesters',
    sub: 'All Terms (Sem 1 to 10)',
    desc: 'View all academic semesters across all years',
    sems: [],
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardBg: 'hover:border-brand hover:bg-brand/5',
    activeBg: 'border-brand bg-brand/10 ring-2 ring-brand/30',
  },
  {
    id: '1',
    icon: '📘',
    label: '1st Year (FY)',
    sub: 'Semester 1 & 2',
    desc: 'Freshman Year foundation & basic engineering semesters',
    sems: [1, 2],
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    cardBg: 'hover:border-blue-500 hover:bg-blue-50/50',
    activeBg: 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/30',
  },
  {
    id: '2',
    icon: '🔬',
    label: '2nd Year (SY)',
    sub: 'Semester 3 & 4',
    desc: 'Sophomore Year core departmental course semesters',
    sems: [3, 4],
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    cardBg: 'hover:border-purple-500 hover:bg-purple-50/50',
    activeBg: 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/30',
  },
  {
    id: '3',
    icon: '🧪',
    label: '3rd Year (TY)',
    sub: 'Semester 5 & 6',
    desc: 'Junior Year advanced technical & elective subject semesters',
    sems: [5, 6],
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
    cardBg: 'hover:border-cyan-500 hover:bg-cyan-50/50',
    activeBg: 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/30',
  },
  {
    id: '4',
    icon: '🏆',
    label: '4th Year (Final Year)',
    sub: 'Semester 7 & 8',
    desc: 'Senior Year capstone projects & final clearance semesters',
    sems: [7, 8],
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    cardBg: 'hover:border-amber-500 hover:bg-amber-50/50',
    activeBg: 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/30',
  },
  {
    id: '5',
    icon: '📚',
    label: '5th Year (Ext)',
    sub: 'Semester 9 & 10',
    desc: 'Dual-degree / extended architecture program semesters',
    sems: [9, 10],
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    cardBg: 'hover:border-slate-500 hover:bg-slate-50/50',
    activeBg: 'border-slate-500 bg-slate-50 ring-2 ring-slate-500/30',
  },
];

const getYearConfig = (semNumber) => {
  const yr = Math.ceil(semNumber / 2);
  const found = YEAR_CATEGORIES.find((c) => c.id === String(yr));
  return found || { label: `Year ${yr}`, badgeColor: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
};

const EMPTY_FORM = {
  programId: '',
  name: '',
  semNumber: 1,
  studyYear: '1',
  academicYear: '2025-26',
  type: 'ODD',
  startDate: '',
  endDate: '',
  clearanceDeadline: '',
  isActive: true,
};

export default function Semesters() {
  const [semesters, setSemesters] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYearCategory, setSelectedYearCategory] = useState('ALL');
  const [yearPopupOpen, setYearPopupOpen] = useState(false);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProgram) params.programId = filterProgram;
      if (filterAcademicYear) params.academicYear = filterAcademicYear;
      if (filterType) params.type = filterType;
      const res = await api.get('/admin/semesters', { params });
      setSemesters(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load semesters');
    } finally {
      setLoading(false);
    }
  }, [filterProgram, filterAcademicYear, filterType]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  // Extract unique academic years for dropdown filter
  const academicYearsList = useMemo(() => {
    const years = new Set(semesters.map((s) => s.academicYear).filter(Boolean));
    if (years.size === 0) {
      years.add('2025-26');
      years.add('2024-25');
    }
    return Array.from(years).sort().reverse();
  }, [semesters]);

  // Year counts calculation for popup and tabs
  const yearCounts = useMemo(() => {
    const counts = { ALL: semesters.length };
    YEAR_CATEGORIES.forEach((cat) => {
      if (cat.id !== 'ALL') {
        counts[cat.id] = semesters.filter((s) => cat.sems.includes(s.semNumber)).length;
      }
    });
    return counts;
  }, [semesters]);

  // Filtered dataset
  const filteredSemesters = useMemo(() => {
    return semesters.filter((s) => {
      // 1. Study Year Filter
      let matchesYear = true;
      if (selectedYearCategory !== 'ALL') {
        const cat = YEAR_CATEGORIES.find((c) => c.id === selectedYearCategory);
        matchesYear = cat ? cat.sems.includes(s.semNumber) : true;
      }

      // 2. Search Filter
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.academicYear && s.academicYear.toLowerCase().includes(q)) ||
        (s.programId?.name && s.programId.name.toLowerCase().includes(q)) ||
        (s.programId?.code && s.programId.code.toLowerCase().includes(q));

      return matchesYear && matchesSearch;
    });
  }, [semesters, selectedYearCategory, search]);

  const activeCategoryObj = useMemo(() => {
    return YEAR_CATEGORIES.find((c) => c.id === selectedYearCategory) || YEAR_CATEGORIES[0];
  }, [selectedYearCategory]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toInputDate = (d) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  };

  const openCreate = () => {
    const today = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 5);
    const deadline = new Date(future);
    deadline.setDate(deadline.getDate() - 10);

    const defaultProg = filterProgram || (programs.length > 0 ? programs[0]._id : '');

    setForm({
      ...EMPTY_FORM,
      programId: defaultProg,
      startDate: toInputDate(today),
      endDate: toInputDate(future),
      clearanceDeadline: toInputDate(deadline),
    });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (sem) => {
    const semNum = sem.semNumber || 1;
    const yr = String(Math.ceil(semNum / 2));

    setForm({
      programId: sem.programId?._id || sem.programId || '',
      name: sem.name,
      semNumber: semNum,
      studyYear: yr,
      academicYear: sem.academicYear || '2025-26',
      type: sem.type || (semNum % 2 !== 0 ? 'ODD' : 'EVEN'),
      startDate: toInputDate(sem.startDate),
      endDate: toInputDate(sem.endDate),
      clearanceDeadline: toInputDate(sem.clearanceDeadline),
      isActive: sem.isActive !== false,
    });
    setEditing(sem._id);
    setModalOpen(true);
  };

  // Helper when changing Study Year in Modal
  const handleStudyYearChange = (yr) => {
    const firstSemOfYear = (Number(yr) - 1) * 2 + 1;
    const prog = programs.find((p) => p._id === form.programId);
    const progCode = prog ? prog.code : '';
    const formattedName = progCode ? `Sem ${firstSemOfYear} ${progCode} (${form.academicYear})` : `Semester ${firstSemOfYear}`;

    setForm((prev) => ({
      ...prev,
      studyYear: yr,
      semNumber: firstSemOfYear,
      type: 'ODD',
      name: formattedName,
    }));
  };

  // Helper when changing Semester Number in Modal
  const handleSemNumberChange = (num) => {
    const n = Number(num);
    const yr = String(Math.ceil(n / 2));
    const isOdd = n % 2 !== 0;
    const prog = programs.find((p) => p._id === form.programId);
    const progCode = prog ? prog.code : '';
    const formattedName = progCode ? `Sem ${n} ${progCode} (${form.academicYear})` : `Semester ${n}`;

    setForm((prev) => ({
      ...prev,
      semNumber: n,
      studyYear: yr,
      type: isOdd ? 'ODD' : 'EVEN',
      name: formattedName,
    }));
  };

  const handleSave = async () => {
    if (
      !form.programId ||
      !form.name.trim() ||
      !form.semNumber ||
      !form.academicYear.trim() ||
      !form.startDate ||
      !form.endDate ||
      !form.clearanceDeadline
    ) {
      toast.error('All semester configuration fields are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        semNumber: Number(form.semNumber),
        academicYear: form.academicYear.trim(),
      };
      delete payload.studyYear;

      if (editing) {
        await api.put(`/admin/semesters/${editing}`, payload);
        toast.success('Semester updated successfully');
      } else {
        await api.post('/admin/semesters', payload);
        toast.success('New semester configured successfully');
      }
      setModalOpen(false);
      fetchSemesters();
    } catch (err) {
      toast.error(err.message || 'Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'studyYear',
      label: 'Study Year',
      render: (_, row) => {
        const cfg = getYearConfig(row.semNumber);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'name',
      label: 'Semester & Type',
      render: (val, row) => (
        <div>
          <div className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
            <span>{val}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono font-medium text-ink-muted">
              Sem #{row.semNumber}
            </span>
            <Badge variant={row.type === 'ODD' ? 'info' : 'default'} className="text-[10px] py-0 px-1.5">
              {row.type}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'academicYear',
      label: 'Academic Session',
      render: (val) => (
        <span className="text-xs font-semibold bg-canvas px-2 py-1 rounded border border-border-subtle text-ink-primary flex items-center gap-1 w-max">
          <HiOutlineCalendarDays className="w-3.5 h-3.5 text-brand shrink-0" />
          {val}
        </span>
      ),
    },
    {
      key: 'programId',
      label: 'Program / Branch',
      render: (val) => (
        <div>
          <span className="text-xs font-semibold text-ink-primary block">
            {val?.name || val?.code || '—'}
          </span>
          {val?.department && (
            <span className="text-[11px] text-ink-muted block">{val.department}</span>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      label: 'Semester Dates',
      render: (_, row) => (
        <span className="text-xs text-ink-secondary flex items-center gap-1">
          <HiOutlineClock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          {formatDate(row.startDate)} &rarr; {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      key: 'clearanceDeadline',
      label: 'Clearance Deadline',
      render: (val) => {
        const isPast = val && new Date(val) < new Date();
        return (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isPast ? 'bg-red-50 text-status-rejected border border-red-200' : 'text-ink-primary'
            }`}
          >
            {formatDate(val)}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val ? 'success' : 'default'}>
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Edit semester">
          <HiOutlinePencilSquare className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Academic Semesters by Year">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-ink-primary flex items-center gap-2">
            <HiOutlineCalendarDays className="w-6 h-6 text-brand" />
            Semester & Year Management
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Organize academic terms categorized by study year (1st Year FY, 2nd Year SY, 3rd Year TY, 4th Year Final) and session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year Categorization Popup Trigger Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => setYearPopupOpen(true)}
            icon={<HiOutlineFunnel className="w-5 h-5 text-brand" />}
          >
            🎓 Categorize by Year ({activeCategoryObj.label})
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={openCreate}
            icon={<HiOutlinePlusCircle className="w-5 h-5" />}
          >
            Create Semester
          </Button>
        </div>
      </div>

      {/* Quick Active Filter Pill */}
      {selectedYearCategory !== 'ALL' && (
        <div className="flex items-center justify-between bg-brand/5 border border-brand/20 px-3.5 py-2 rounded-md mb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand">Active Year Filter:</span>
            <span className="px-2 py-0.5 bg-brand text-white font-medium rounded-full text-[11px]">
              {activeCategoryObj.icon} {activeCategoryObj.label} ({activeCategoryObj.sub})
            </span>
            <span className="text-ink-muted">
              — Showing {filteredSemesters.length} semester{filteredSemesters.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setSelectedYearCategory('ALL')}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Reset to All Semesters &times;
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {/* Search */}
        <div className="relative">
          <HiOutlineMagnifyingGlass className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-semesters"
            name="searchSemesters"
            type="search"
            className="input-base pl-9 text-xs"
            placeholder="Search semester or session..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Academic Session Filter */}
        <div>
          <select
            id="filter-academic-year"
            name="filterAcademicYear"
            className="select-base text-xs"
            value={filterAcademicYear}
            onChange={(e) => setFilterAcademicYear(e.target.value)}
          >
            <option value="">All Academic Years</option>
            {academicYearsList.map((yr) => (
              <option key={yr} value={yr}>
                Session: {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Program Filter */}
        <div>
          <select
            id="filter-program"
            name="filterProgram"
            className="select-base text-xs"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="">All Programs / Branches</option>
            {programs.map((p) => (
              <option key={p._id} value={p._id}>
                {p.degree ? `[${p.degree}] ` : ''}{p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            id="filter-type"
            name="filterType"
            className="select-base text-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Term Types (ODD / EVEN)</option>
            <option value="ODD">ODD Terms (Sem 1, 3, 5, 7)</option>
            <option value="EVEN">EVEN Terms (Sem 2, 4, 6, 8)</option>
          </select>
        </div>
      </div>

      {/* Semesters Table */}
      <Table
        columns={columns}
        data={filteredSemesters}
        loading={loading}
        emptyMessage="No semesters found matching your criteria."
        emptyIcon={<HiOutlineCalendarDays className="w-10 h-10 text-ink-muted" />}
      />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 🎓 YEAR-WISE CATEGORIZATION POPUP MODAL                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={yearPopupOpen}
        onClose={() => setYearPopupOpen(false)}
        title="🎓 Categorize Semesters by Year"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-ink-muted">
              Total <strong>{semesters.length}</strong> configured semesters
            </span>
            <Button variant="secondary" size="sm" onClick={() => setYearPopupOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-ink-secondary">
            Select an academic year level below to view, filter, and organize semesters:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {YEAR_CATEGORIES.map((cat) => {
              const isSelected = selectedYearCategory === cat.id;
              const count = yearCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedYearCategory(cat.id);
                    setYearPopupOpen(false);
                    toast.success(`Showing ${cat.label}`);
                  }}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-center justify-between group ${
                    isSelected ? cat.activeBg : `bg-surface border-border-subtle ${cat.cardBg}`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-canvas rounded-md border border-border-subtle shrink-0">
                      {cat.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-ink-primary group-hover:text-brand transition-colors">
                          {cat.label}
                        </h4>
                        <span className="text-xs font-semibold text-brand flex items-center gap-1">
                          <HiOutlineArrowRight className="w-3 h-3" />
                          {cat.sub}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">{cat.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cat.badgeColor}`}
                    >
                      {count} {count === 1 ? 'Semester' : 'Semesters'}
                    </span>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs shadow-sm">
                        <HiOutlineCheck className="w-4 h-4 stroke-2" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT SEMESTER MODAL                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Semester Configuration' : 'Configure New Academic Semester'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {editing ? 'Update Semester' : 'Save Semester'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Program selection */}
          <div>
            <label htmlFor="modal-sem-program" className="label-base">
              Academic Program & Branch <span className="text-red-500">*</span>
            </label>
            <select
              id="modal-sem-program"
              name="programId"
              className="select-base"
              value={form.programId}
              onChange={(e) => {
                const pId = e.target.value;
                const prog = programs.find((p) => p._id === pId);
                const code = prog ? prog.code : '';
                setForm((prev) => ({
                  ...prev,
                  programId: pId,
                  name: code ? `Sem ${prev.semNumber} ${code} (${prev.academicYear})` : prev.name,
                }));
              }}
            >
              <option value="">-- Select Degree Program --</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.degree ? `[${p.degree}] ` : ''}{p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Study Year & Semester Number selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-sem-study-year" className="label-base">
                Study Year Level <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-sem-study-year"
                name="studyYear"
                className="select-base font-medium"
                value={form.studyYear}
                onChange={(e) => handleStudyYearChange(e.target.value)}
              >
                <option value="1">🎓 1st Year (FY - First Year)</option>
                <option value="2">📘 2nd Year (SY - Second Year)</option>
                <option value="3">🔬 3rd Year (TY - Third Year)</option>
                <option value="4">🏆 4th Year (Final Year)</option>
                <option value="5">📚 5th Year (Extended)</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-sem-number" className="label-base">
                Semester Number (1 to 10) <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-sem-number"
                name="semNumber"
                className="select-base font-semibold"
                value={form.semNumber}
                onChange={(e) => handleSemNumberChange(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const yr = Math.ceil(num / 2);
                  const isOdd = num % 2 !== 0;
                  return (
                    <option key={num} value={num}>
                      Semester {num} (Year {yr} • {isOdd ? 'ODD' : 'EVEN'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Academic Session & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-sem-academic-year" className="label-base">
                Academic Session / Year <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-sem-academic-year"
                name="academicYear"
                className="input-base"
                placeholder="e.g. 2025-26, 2024-25"
                value={form.academicYear}
                onChange={(e) => {
                  const yr = e.target.value;
                  const prog = programs.find((p) => p._id === form.programId);
                  const code = prog ? prog.code : '';
                  setForm((prev) => ({
                    ...prev,
                    academicYear: yr,
                    name: code ? `Sem ${prev.semNumber} ${code} (${yr})` : prev.name,
                  }));
                }}
              />
            </div>

            <div>
              <label htmlFor="modal-sem-type" className="label-base">
                Term Cycle (ODD / EVEN) <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-sem-type"
                name="type"
                className="select-base"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="ODD">ODD Semester (Jul - Dec)</option>
                <option value="EVEN">EVEN Semester (Jan - Jun)</option>
              </select>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="modal-sem-name" className="label-base">
              Semester Display Title <span className="text-red-500">*</span>
            </label>
            <input
              id="modal-sem-name"
              name="name"
              className="input-base"
              placeholder="e.g. Sem 6 AIML (2025-26)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-sem-start" className="label-base text-xs">
                Term Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-sem-start"
                name="startDate"
                type="date"
                className="input-base text-xs"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="modal-sem-end" className="label-base text-xs">
                Term End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-sem-end"
                name="endDate"
                type="date"
                className="input-base text-xs"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="modal-sem-deadline" className="label-base text-xs">
                Clearance Deadline <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-sem-deadline"
                name="clearanceDeadline"
                type="date"
                className="input-base text-xs"
                value={form.clearanceDeadline}
                onChange={(e) => setForm({ ...form, clearanceDeadline: e.target.value })}
              />
            </div>
          </div>

          {/* Active Status */}
          {editing && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modal-sem-active"
                name="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border-subtle text-brand focus:ring-brand"
              />
              <label htmlFor="modal-sem-active" className="text-sm font-medium text-ink-secondary">
                Active Term (Visible to students for clearance submissions)
              </label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
