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
} from 'react-icons/hi2';

const EMPTY_FORM = {
  name: '', email: '', password: 'Pass@123', role: 'student',
  enrollmentNo: '', programId: '', currentSemester: '', section: '',
  sectionType: '',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterRole) params.role = filterRole;
      if (search) params.search = search;
      const res = await api.get('/admin/users', { params });
      const data = res.data.data;
      setUsers(data.users || data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, search]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [filterRole, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
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
      if (payload.currentSemester) {
        payload.currentSemester = Number(payload.currentSemester);
      }

      if (editing) {
        await api.put(`/admin/users/${editing}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User created');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    const target = users.find((u) => u._id === id);
    if (target?.role === 'admin') {
      toast.error('Admin accounts cannot be deactivated');
      return;
    }
    try {
      await api.patch(`/admin/users/${id}/deactivate`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate');
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

      // Parse preview rows (first 10)
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
      // Fallback client-side generation
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

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => <span className="text-sm text-ink-secondary">{val}</span>,
    },
    {
      key: 'role',
      label: 'Role',
      render: (val) => (
        <Badge variant={val === 'super_admin' ? 'purple' : val === 'admin' ? 'info' : 'default'}>
          {ROLE_LABELS[val] || val}
        </Badge>
      ),
    },
    {
      key: 'enrollmentNo',
      label: 'Enrollment',
      render: (val) => (
        <span className="text-sm font-mono text-ink-muted">{val || '—'}</span>
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
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <HiOutlinePencilSquare className="w-4 h-4" />
          </Button>
          {row.isActive !== false && row.role !== 'admin' && (
            <Button variant="ghost" size="sm" onClick={() => handleDeactivate(row._id)}>
              <HiOutlineNoSymbol className="w-4 h-4 text-status-rejected" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const ROLE_OPTIONS = [
    { value: '', label: 'All roles' },
    ...Object.entries(ROLE_LABELS).map(([key, label]) => ({ value: key, label })),
  ];

  return (
    <DashboardLayout title="Users">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            id="filter-role"
            name="filterRole"
            className="select-base w-44"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            id="filter-search"
            name="search"
            type="search"
            className="input-base w-64"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setBulkResults(null); setCsvData(''); setBulkOpen(true); }}
            icon={<HiOutlineArrowUpTray className="w-4 h-4" />}
          >
            Bulk upload
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          >
            Create user
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
        emptyIcon={<HiOutlineUsers className="w-10 h-10" />}
        pagination={{ page, totalPages, onPageChange: setPage }}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit User' : 'Create User'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-form-name" className="label-base">Name</label>
            <input id="user-form-name" name="name" className="input-base" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="user-form-email" className="label-base">Email</label>
            <input id="user-form-email" name="email" className="input-base" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
                <input id="user-form-enrollment" name="enrollmentNo" className="input-base" value={form.enrollmentNo}
                  onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} />
              </div>
              <div>
                <label htmlFor="user-form-semester" className="label-base">Current Semester</label>
                <input id="user-form-semester" name="currentSemester" className="input-base" type="number" min="1" max="10"
                  value={form.currentSemester}
                  onChange={(e) => setForm({ ...form, currentSemester: e.target.value })} />
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
                <option value="">Select type</option>
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
            {/* Header Action Bar */}
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
                📥 Download Template
              </button>
            </div>

            {/* File Drop Area */}
            <div>
              <label htmlFor="bulk-file-upload" className="block text-xs font-semibold text-ink-primary mb-1">
                Select CSV File from PC
              </label>
              <input
                id="bulk-file-upload"
                name="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brand-hover cursor-pointer border border-border-subtle rounded-md p-1"
              />
              {fileName && (
                <p className="text-xs text-status-success mt-1 font-medium">
                  📄 Loaded: {fileName}
                </p>
              )}
            </div>

            {/* Manual CSV Textarea / Preview toggle */}
            <div>
              <label htmlFor="bulk-raw-csv" className="block text-xs font-semibold text-ink-primary mb-1">
                Raw CSV Data (or Paste CSV)
              </label>
              <textarea
                id="bulk-raw-csv"
                name="rawCsv"
                className="input-base min-h-[100px] font-mono text-xs"
                value={csvData}
                onChange={(e) => {
                  setCsvData(e.target.value);
                  const lines = e.target.value.split(/\r?\n/).filter((l) => l.trim());
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
                }}
                placeholder="student_id,full_name,email,department,semester,section&#10;EN2024CSE001,Aarav Sharma,aarav.sharma@sbjain.edu.in,CSE,6,A"
              />
            </div>

            {/* Row Preview Table */}
            {previewRows?.rows?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-primary mb-1.5">
                  🔍 Data Preview (First 10 rows):
                </p>
                <div className="border border-border-subtle rounded-md overflow-x-auto max-h-44 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-border-subtle text-ink-secondary">
                      <tr>
                        <th className="px-2.5 py-1.5 font-semibold">Row</th>
                        {previewRows.headers.map((h, i) => (
                          <th key={i} className="px-2.5 py-1.5 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {previewRows.rows.map((rowItem) => (
                        <tr key={rowItem.rowNo} className="hover:bg-surface-hover">
                          <td className="px-2.5 py-1 font-mono text-ink-muted text-[11px]">{rowItem.rowNo}</td>
                          {rowItem.cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-2.5 py-1 text-ink-primary truncate max-w-[120px]">
                              {cell}
                            </td>
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
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-md flex-1 text-center">
                <p className="text-2xl font-bold text-status-success font-tabular">
                  {bulkResults.createdCount ?? bulkResults.created?.length ?? 0}
                </p>
                <p className="text-xs font-semibold text-green-800">Students Created</p>
              </div>
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md flex-1 text-center">
                <p className="text-2xl font-bold text-status-rejected font-tabular">
                  {bulkResults.failedCount ?? bulkResults.errors?.length ?? 0}
                </p>
                <p className="text-xs font-semibold text-red-800">Failed / Invalid Rows</p>
              </div>
            </div>

            {bulkResults.errors?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-status-rejected mb-1.5">
                  ⚠️ Row Validation Failures ({bulkResults.errors.length}):
                </p>
                <div className="border border-red-200 bg-red-50/50 rounded-md max-h-56 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                  {bulkResults.errors.map((err, i) => (
                    <div key={i} className="text-xs text-status-rejected py-1 border-b border-red-200/60 last:border-0 flex items-start gap-2">
                      <span className="font-bold px-1.5 py-0.5 bg-red-100 rounded text-[10px]">Row {err.row}</span>
                      <div className="flex-1">
                        <span className="font-medium text-ink-primary">{err.email}</span>: {err.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
