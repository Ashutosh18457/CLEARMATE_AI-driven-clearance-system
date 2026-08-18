import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { ITEM_TYPES, ITEM_TYPE_LABELS } from '../../utils/constants';
import {
  HiOutlinePlusCircle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineRectangleStack,
  HiOutlinePlusSmall,
  HiOutlineMinusSmall,
} from 'react-icons/hi2';

const EMPTY_FORM = {
  semesterId: '', srNo: '', title: '', type: 'theory',
  subjectCode: '', isRequired: true,
  theoryTeacherId: '',
  labBatchTeachers: [],
  electiveGroup: '', electiveOptions: [{ name: '', teacherId: '' }, { name: '', teacherId: '' }],
};

export default function ClearanceItems() {
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get('/admin/programs');
      setPrograms(res.data.data || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchSemesters = useCallback(async () => {
    if (!filterProgram) { setSemesters([]); return; }
    try {
      const res = await api.get('/admin/semesters', { params: { programId: filterProgram } });
      setSemesters(res.data.data || []);
    } catch { /* non-critical */ }
  }, [filterProgram]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { role: 'teacher', limit: 200 } });
      setTeachers(res.data.data?.users || res.data.data || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchBatches = useCallback(async () => {
    if (!filterSemester) { setBatches([]); return; }
    try {
      const res = await api.get('/admin/batches', { params: { semesterId: filterSemester } });
      setBatches(res.data.data || []);
    } catch { /* non-critical */ }
  }, [filterSemester]);

  const fetchItems = useCallback(async () => {
    if (!filterSemester) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get('/admin/clearance-items', { params: { semesterId: filterSemester } });
      setItems(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load clearance items');
    } finally {
      setLoading(false);
    }
  }, [filterSemester]);

  useEffect(() => { fetchPrograms(); fetchTeachers(); }, [fetchPrograms, fetchTeachers]);
  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);
  useEffect(() => { fetchBatches(); fetchItems(); }, [fetchBatches, fetchItems]);
  useEffect(() => { setFilterSemester(''); }, [filterProgram]);

  const openCreate = () => {
    const lbt = batches.map((b) => ({ batchId: b._id, batchName: b.name, teacherId: '' }));
    setForm({ ...EMPTY_FORM, semesterId: filterSemester, labBatchTeachers: lbt });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    const lbt = item.labBatchTeachers?.map((lb) => ({
      batchId: lb.batchId?._id || lb.batchId,
      batchName: lb.batchId?.name || '',
      teacherId: lb.teacherId?._id || lb.teacherId || '',
    })) || batches.map((b) => ({ batchId: b._id, batchName: b.name, teacherId: '' }));

    const eo = item.electiveOptions?.length >= 2
      ? item.electiveOptions.map((o) => ({
          name: o.name,
          teacherId: o.teacherId?._id || o.teacherId || '',
        }))
      : [{ name: '', teacherId: '' }, { name: '', teacherId: '' }];

    setForm({
      semesterId: item.semesterId?._id || item.semesterId || filterSemester,
      srNo: item.srNo,
      title: item.title,
      type: item.type,
      subjectCode: item.subjectCode || '',
      isRequired: item.isRequired,
      theoryTeacherId: item.theoryTeacherId?._id || item.theoryTeacherId || '',
      labBatchTeachers: lbt,
      electiveGroup: item.electiveGroup || '',
      electiveOptions: eo,
    });
    setEditing(item._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.type || !form.srNo) {
      toast.error('Title, type, and serial number are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        semesterId: form.semesterId,
        srNo: Number(form.srNo),
        title: form.title,
        type: form.type,
        subjectCode: form.subjectCode || undefined,
        isRequired: form.isRequired,
      };

      if (form.type === 'theory' || form.type === 'special') {
        payload.theoryTeacherId = form.theoryTeacherId;
      }
      if (form.type === 'lab') {
        payload.labBatchTeachers = form.labBatchTeachers
          .filter((lb) => lb.batchId && lb.teacherId)
          .map((lb) => ({ batchId: lb.batchId, teacherId: lb.teacherId }));
      }
      if (form.type === 'elective') {
        payload.electiveGroup = form.electiveGroup;
        payload.electiveOptions = form.electiveOptions
          .filter((o) => o.name && o.teacherId);
      }

      if (editing) {
        await api.put(`/admin/clearance-items/${editing}`, payload);
        toast.success('Clearance item updated');
      } else {
        await api.post('/admin/clearance-items', payload);
        toast.success('Clearance item created');
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to save clearance item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/clearance-items/${deleteId}`);
      toast.success('Clearance item deleted');
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const addElectiveOption = () => {
    setForm({ ...form, electiveOptions: [...form.electiveOptions, { name: '', teacherId: '' }] });
  };

  const removeElectiveOption = (index) => {
    if (form.electiveOptions.length <= 2) return;
    setForm({ ...form, electiveOptions: form.electiveOptions.filter((_, i) => i !== index) });
  };

  const updateElectiveOption = (index, field, value) => {
    const updated = [...form.electiveOptions];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, electiveOptions: updated });
  };

  const updateLabBatch = (index, teacherId) => {
    const updated = [...form.labBatchTeachers];
    updated[index] = { ...updated[index], teacherId };
    setForm({ ...form, labBatchTeachers: updated });
  };

  const getTeacherName = (id) => {
    const t = teachers.find((t) => (t._id === id));
    return t?.name || '—';
  };

  const columns = [
    {
      key: 'srNo',
      label: '#',
      render: (val) => <span className="text-sm font-tabular text-ink-muted">{val}</span>,
    },
    {
      key: 'title',
      label: 'Title',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <Badge variant={val === 'theory' ? 'info' : val === 'lab' ? 'pending' : val === 'elective' ? 'success' : 'default'}>
          {ITEM_TYPE_LABELS[val] || val}
        </Badge>
      ),
    },
    {
      key: 'subjectCode',
      label: 'Code',
      render: (val) => <span className="text-sm font-mono text-ink-muted">{val || '—'}</span>,
    },
    {
      key: 'teacher',
      label: 'Teacher(s)',
      render: (_, row) => {
        if (row.type === 'theory' || row.type === 'special') {
          return <span className="text-sm text-ink-secondary">{row.theoryTeacherId?.name || getTeacherName(row.theoryTeacherId) || '—'}</span>;
        }
        if (row.type === 'lab') {
          return (
            <div className="space-y-0.5">
              {(row.labBatchTeachers || []).map((lb, i) => (
                <p key={i} className="text-xs text-ink-muted">
                  {lb.batchId?.name || '?'}: {lb.teacherId?.name || getTeacherName(lb.teacherId) || '—'}
                </p>
              ))}
            </div>
          );
        }
        if (row.type === 'elective') {
          return (
            <div className="space-y-0.5">
              {(row.electiveOptions || []).map((o, i) => (
                <p key={i} className="text-xs text-ink-muted">
                  {o.name}: {o.teacherId?.name || getTeacherName(o.teacherId) || '—'}
                </p>
              ))}
            </div>
          );
        }
        return '—';
      },
    },
    {
      key: 'isRequired',
      label: 'Req.',
      render: (val) => (
        <Badge variant={val ? 'success' : 'default'}>{val ? 'Yes' : 'No'}</Badge>
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
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row._id)}>
            <HiOutlineTrash className="w-4 h-4 text-status-rejected" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Clearance Items">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <select id="ci-filter-program" name="filterProgram" className="select-base w-56" value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}>
            <option value="">Select program</option>
            {programs.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
            ))}
          </select>
          <select id="ci-filter-semester" name="filterSemester" className="select-base w-56" value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)} disabled={!filterProgram}>
            <option value="">Select semester</option>
            {semesters.map((s) => (
              <option key={s._id} value={s._id}>{s.name} — {s.academicYear}</option>
            ))}
          </select>
        </div>
        {filterSemester && (
          <Button variant="primary" size="sm" onClick={openCreate}
            icon={<HiOutlinePlusCircle className="w-4 h-4" />}>
            Create item
          </Button>
        )}
      </div>

      {!filterSemester ? (
        <div className="text-center py-12">
          <HiOutlineRectangleStack className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Select a program and semester to view clearance items</p>
        </div>
      ) : (
        <Table columns={columns} data={items} loading={loading}
          emptyMessage="No clearance items configured"
          emptyIcon={<HiOutlineRectangleStack className="w-10 h-10" />} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Clearance Item' : 'Create Clearance Item'}
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
        <div className="space-y-4">
          {/* Common fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ci-form-srNo" className="label-base">Sr. No</label>
              <input id="ci-form-srNo" name="srNo" className="input-base" type="number" min="1" value={form.srNo}
                onChange={(e) => setForm({ ...form, srNo: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ci-form-title" className="label-base">Title</label>
              <input id="ci-form-title" name="title" className="input-base" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Data Structures" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ci-form-type" className="label-base">Type</label>
              <select id="ci-form-type" name="type" className="select-base" value={form.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const lbt = batches.map((b) => ({ batchId: b._id, batchName: b.name, teacherId: '' }));
                  setForm({ ...form, type: newType, labBatchTeachers: lbt });
                }}>
                {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ci-form-subjectCode" className="label-base">Subject Code</label>
              <input id="ci-form-subjectCode" name="subjectCode" className="input-base" value={form.subjectCode}
                onChange={(e) => setForm({ ...form, subjectCode: e.target.value })}
                placeholder="e.g. CS301" />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <input type="checkbox" id="isReq" name="isRequired" checked={form.isRequired}
                onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                className="rounded border-border-subtle text-brand focus:ring-brand" />
              <label htmlFor="isReq" className="text-sm text-ink-secondary">Required</label>
            </div>
          </div>

          {/* Theory / Special: single teacher */}
          {(form.type === 'theory' || form.type === 'special') && (
            <div>
              <label htmlFor="ci-form-teacher" className="label-base">Teacher</label>
              <select id="ci-form-teacher" name="theoryTeacherId" className="select-base" value={form.theoryTeacherId}
                onChange={(e) => setForm({ ...form, theoryTeacherId: e.target.value })}>
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>
          )}

          {/* Lab: per-batch teacher assignment */}
          {form.type === 'lab' && (
            <div>
              <label className="label-base">Lab Batch Teachers</label>
              {form.labBatchTeachers.length === 0 ? (
                <p className="text-sm text-ink-muted">No batches found for this semester. Create batches first.</p>
              ) : (
                <div className="space-y-2 border border-border-subtle rounded-md p-3">
                  {form.labBatchTeachers.map((lb, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-ink-secondary w-24 shrink-0">
                        {lb.batchName || `Batch ${idx + 1}`}
                      </span>
                      <select id={`ci-labbatch-teacher-${idx}`} name={`labBatchTeacher_${idx}`} className="select-base flex-1" value={lb.teacherId}
                        onChange={(e) => updateLabBatch(idx, e.target.value)}>
                        <option value="">Select teacher</option>
                        {teachers.map((t) => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Elective: group + options */}
          {form.type === 'elective' && (
            <div>
              <div className="mb-3">
                <label htmlFor="ci-form-elective-group" className="label-base">Elective Group</label>
                <input id="ci-form-elective-group" name="electiveGroup" className="input-base" value={form.electiveGroup}
                  onChange={(e) => setForm({ ...form, electiveGroup: e.target.value })}
                  placeholder="e.g. Professional Elective 1" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-base mb-0">Elective Options</label>
                <Button variant="ghost" size="sm" onClick={addElectiveOption}
                  icon={<HiOutlinePlusSmall className="w-4 h-4" />}>
                  Add option
                </Button>
              </div>
              <div className="space-y-2 border border-border-subtle rounded-md p-3">
                {form.electiveOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input id={`ci-elective-name-${idx}`} name={`electiveOptionName_${idx}`} className="input-base flex-1" value={opt.name}
                      onChange={(e) => updateElectiveOption(idx, 'name', e.target.value)}
                      placeholder="Option name" />
                    <select id={`ci-elective-teacher-${idx}`} name={`electiveOptionTeacher_${idx}`} className="select-base flex-1" value={opt.teacherId}
                      onChange={(e) => updateElectiveOption(idx, 'teacherId', e.target.value)}>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    {form.electiveOptions.length > 2 && (
                      <Button variant="ghost" size="sm" onClick={() => removeElectiveOption(idx)}>
                        <HiOutlineTrash className="w-4 h-4 text-status-rejected" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Clearance Item"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              Delete item
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-secondary">
          Are you sure you want to delete this clearance item? This action cannot be undone.
          Any associated submission items and clearance records may be affected.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
