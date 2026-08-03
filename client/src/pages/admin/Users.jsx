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
  name: '', email: '', password: '', role: 'student',
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
    if (!editing && !form.password) {
      toast.error('Password is required for new users');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.role !== 'student') {
        delete payload.enrollmentNo;
        delete payload.programId;
        delete payload.currentSemester;
        delete payload.section;
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
    try {
      await api.patch(`/admin/users/${id}/deactivate`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate user');
    }
  };

  const handleBulkUpload = async () => {
    if (!csvData.trim()) {
      toast.error('Please enter CSV data');
      return;
    }
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const lines = csvData.trim().split('\n').filter((l) => l.trim());
      const users = lines.map((line) => {
        const [name, email, password, enrollmentNo, programId, currentSemester, section] =
          line.split(',').map((s) => s.trim());
        return {
          name, email, password, enrollmentNo, programId,
          currentSemester: Number(currentSemester), section,
          role: 'student',
        };
      });
      const res = await api.post('/admin/users/bulk', { users });
      setBulkResults(res.data.data);
      toast.success(res.data.message || 'Bulk upload completed');
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
        <Badge variant={val === 'admin' ? 'info' : 'default'}>
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
          {row.isActive !== false && (
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
            className="select-base w-44"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
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
            <label className="label-base">Name</label>
            <input className="input-base" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label-base">Email</label>
            <input className="input-base" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-base">Password {editing && <span className="text-ink-muted">(leave blank to keep)</span>}</label>
            <input className="input-base" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? '••••••••' : 'Min 8 characters'} />
          </div>
          <div>
            <label className="label-base">Role</label>
            <select className="select-base" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Student-specific fields */}
          {form.role === 'student' && (
            <>
              <div>
                <label className="label-base">Enrollment No</label>
                <input className="input-base" value={form.enrollmentNo}
                  onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} />
              </div>
              <div>
                <label className="label-base">Program</label>
                <select className="select-base" value={form.programId}
                  onChange={(e) => setForm({ ...form, programId: e.target.value })}>
                  <option value="">Select program</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">Current Semester</label>
                <input className="input-base" type="number" min="1" max="10"
                  value={form.currentSemester}
                  onChange={(e) => setForm({ ...form, currentSemester: e.target.value })} />
              </div>
              <div>
                <label className="label-base">Section</label>
                <input className="input-base" value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. A, B" />
              </div>
            </>
          )}

          {/* Section head fields */}
          {form.role === 'section_head' && (
            <div>
              <label className="label-base">Section Type</label>
              <select className="select-base" value={form.sectionType}
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
        onClose={() => setBulkOpen(false)}
        title="Bulk Upload Students"
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBulkOpen(false)}>Close</Button>
            {!bulkResults && (
              <Button variant="primary" size="sm" onClick={handleBulkUpload} loading={bulkLoading}>
                Upload
              </Button>
            )}
          </>
        }
      >
        {!bulkResults ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-secondary">
              Enter one student per line in CSV format:
            </p>
            <p className="text-xs font-mono text-ink-muted bg-canvas px-3 py-2 rounded-md">
              name,email,password,enrollmentNo,programId,currentSemester,section
            </p>
            <textarea
              className="input-base min-h-[200px] font-mono text-xs"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="John Doe,john@example.com,Pass@123,EN001,programId,3,A"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="px-4 py-3 bg-green-50 rounded-md flex-1">
                <p className="text-2xl font-semibold text-status-success font-tabular">
                  {bulkResults.successCount || bulkResults.created || 0}
                </p>
                <p className="text-xs text-green-700">Created</p>
              </div>
              <div className="px-4 py-3 bg-red-50 rounded-md flex-1">
                <p className="text-2xl font-semibold text-status-rejected font-tabular">
                  {bulkResults.errorCount || bulkResults.errors?.length || 0}
                </p>
                <p className="text-xs text-red-700">Errors</p>
              </div>
            </div>
            {bulkResults.errors?.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto custom-scrollbar">
                {bulkResults.errors.map((err, i) => (
                  <div key={i} className="text-xs text-status-rejected py-1 border-b border-border-subtle last:border-0">
                    <span className="font-medium">Row {err.row || err.line || i + 1}:</span>{' '}
                    {err.message || err.error || JSON.stringify(err)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
