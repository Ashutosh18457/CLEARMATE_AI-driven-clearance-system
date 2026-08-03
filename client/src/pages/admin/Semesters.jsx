import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { SEMESTER_TYPES } from '../../utils/constants';
import {
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';

const EMPTY_FORM = {
  programId: '',
  name: '',
  semNumber: '',
  academicYear: '',
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
  const [filterProgram, setFilterProgram] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch {
      // Non-critical — filter just won't work
    }
  }, []);

  const fetchSemesters = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterProgram ? { programId: filterProgram } : {};
      const res = await api.get('/admin/semesters', { params });
      setSemesters(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load semesters');
    } finally {
      setLoading(false);
    }
  }, [filterProgram]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toInputDate = (d) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, programId: filterProgram || '' });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (sem) => {
    setForm({
      programId: sem.programId?._id || sem.programId || '',
      name: sem.name,
      semNumber: sem.semNumber,
      academicYear: sem.academicYear,
      type: sem.type,
      startDate: toInputDate(sem.startDate),
      endDate: toInputDate(sem.endDate),
      clearanceDeadline: toInputDate(sem.clearanceDeadline),
      isActive: sem.isActive,
    });
    setEditing(sem._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.programId || !form.name || !form.semNumber || !form.academicYear || !form.startDate || !form.endDate || !form.clearanceDeadline) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, semNumber: Number(form.semNumber) };
      if (editing) {
        await api.put(`/admin/semesters/${editing}`, payload);
        toast.success('Semester updated');
      } else {
        await api.post('/admin/semesters', payload);
        toast.success('Semester created');
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
      key: 'name',
      label: 'Semester',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'semNumber',
      label: 'Sem #',
      render: (val) => <span className="text-sm font-tabular">{val}</span>,
    },
    {
      key: 'academicYear',
      label: 'Year',
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <Badge variant={val === 'ODD' ? 'info' : 'default'}>{val}</Badge>
      ),
    },
    {
      key: 'programId',
      label: 'Program',
      render: (val) => <span className="text-sm text-ink-secondary">{val?.name || val?.code || '—'}</span>,
    },
    {
      key: 'startDate',
      label: 'Start',
      render: (val) => <span className="text-sm font-tabular">{formatDate(val)}</span>,
    },
    {
      key: 'endDate',
      label: 'End',
      render: (val) => <span className="text-sm font-tabular">{formatDate(val)}</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (val) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Active' : 'Inactive'}</Badge>
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
    <DashboardLayout title="Semesters">
      {/* Filter + actions bar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            className="select-base w-56"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
          >
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <span className="text-sm text-ink-muted">
            {semesters.length} semester{semesters.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={openCreate}
          icon={<HiOutlinePlusCircle className="w-4 h-4" />}
        >
          Create semester
        </Button>
      </div>

      <Table
        columns={columns}
        data={semesters}
        loading={loading}
        emptyMessage="No semesters configured"
        emptyIcon={<HiOutlineCalendarDays className="w-10 h-10" />}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Semester' : 'Create Semester'}
        size="lg"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label-base">Program</label>
            <select
              className="select-base"
              value={form.programId}
              onChange={(e) => setForm({ ...form, programId: e.target.value })}
            >
              <option value="">Select program</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Name</label>
            <input
              className="input-base"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Semester 3"
            />
          </div>
          <div>
            <label className="label-base">Semester Number</label>
            <input
              type="number"
              className="input-base"
              value={form.semNumber}
              onChange={(e) => setForm({ ...form, semNumber: e.target.value })}
              min="1" max="10"
              placeholder="1-10"
            />
          </div>
          <div>
            <label className="label-base">Academic Year</label>
            <input
              className="input-base"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              placeholder="e.g. 2024-25"
            />
          </div>
          <div>
            <label className="label-base">Type</label>
            <select
              className="select-base"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="ODD">ODD</option>
              <option value="EVEN">EVEN</option>
            </select>
          </div>
          <div>
            <label className="label-base">Start Date</label>
            <input
              type="date"
              className="input-base"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label-base">End Date</label>
            <input
              type="date"
              className="input-base"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label-base">Clearance Deadline</label>
            <input
              type="date"
              className="input-base"
              value={form.clearanceDeadline}
              onChange={(e) => setForm({ ...form, clearanceDeadline: e.target.value })}
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="semActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border-subtle text-brand focus:ring-brand"
              />
              <label htmlFor="semActive" className="text-sm text-ink-secondary">Active</label>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
