import { useState, useEffect, useCallback } from 'react';
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
} from 'react-icons/hi2';

const EMPTY_FORM = { name: '', code: '', department: '', isActive: true };

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
  }, [fetchPrograms]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (program) => {
    setForm({
      name: program.name,
      code: program.code,
      department: program.department,
      isActive: program.isActive,
    });
    setEditing(program._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code || !form.department) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, code: form.code.toUpperCase() };
      if (editing) {
        await api.put(`/admin/programs/${editing}`, payload);
        toast.success('Program updated');
      } else {
        await api.post('/admin/programs', payload);
        toast.success('Program created');
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
      label: 'Program Name',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'code',
      label: 'Code',
      render: (val) => (
        <span className="text-sm font-mono text-ink-secondary">{val}</span>
      ),
    },
    {
      key: 'department',
      label: 'Department',
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
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
          <HiOutlinePencilSquare className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Programs">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">
          {programs.length} program{programs.length !== 1 ? 's' : ''}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          icon={<HiOutlinePlusCircle className="w-4 h-4" />}
        >
          Create program
        </Button>
      </div>

      <Table
        columns={columns}
        data={programs}
        loading={loading}
        emptyMessage="No programs configured"
        emptyIcon={<HiOutlineAcademicCap className="w-10 h-10" />}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Program' : 'Create Program'}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="program-name" className="label-base">Program Name</label>
            <input
              id="program-name"
              name="name"
              className="input-base"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. B.Tech Computer Science"
            />
          </div>
          <div>
            <label htmlFor="program-code" className="label-base">Code</label>
            <input
              id="program-code"
              name="code"
              className="input-base uppercase"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. BTCS"
            />
          </div>
          <div>
            <label htmlFor="program-department" className="label-base">Department</label>
            <input
              id="program-department"
              name="department"
              className="input-base"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g. Computer Science & Engineering"
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="program-isActive"
                name="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border-subtle text-brand focus:ring-brand"
              />
              <label htmlFor="program-isActive" className="text-sm text-ink-secondary">
                Active
              </label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
