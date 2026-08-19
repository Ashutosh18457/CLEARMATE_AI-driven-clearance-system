import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import * as XLSX from 'xlsx';
import {
  HiOutlinePlusCircle,
  HiOutlineUserPlus,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ semesterId: '', name: '' });
  const [creating, setCreating] = useState(false);

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignBatch, setAssignBatch] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assigning, setAssigning] = useState(false);

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

  const fetchBatches = useCallback(async () => {
    if (!filterSemester) { setBatches([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get('/admin/batches', { params: { semesterId: filterSemester } });
      setBatches(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [filterSemester]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { role: 'student', limit: 500 } });
      setStudents(res.data.data?.users || res.data.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchPrograms(); fetchStudents(); }, [fetchPrograms, fetchStudents]);
  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);
  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { setFilterSemester(''); }, [filterProgram]);

  const handleCreate = async () => {
    if (!createForm.semesterId || !createForm.name) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/batches', createForm);
      toast.success('Batch created');
      setCreateOpen(false);
      setCreateForm({ semesterId: '', name: '' });
      fetchBatches();
    } catch (err) {
      toast.error(err.message || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const openAssign = (batch) => {
    setAssignBatch(batch);
    setSelectedStudents(batch.studentIds?.map((s) => s._id || s) || []);
    setAssignOpen(true);
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Flatten rows & cols to match against student data
          const parsedItems = jsonData
            .flatMap((row) => row.map((cell) => String(cell || '').trim()))
            .filter((cell) => cell.length > 0);

          matchAndSelectStudents(parsedItems);
        } catch (err) {
          toast.error('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle CSV and TXT
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r?\n/);
          const parsedItems = lines
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .flatMap((line) => line.split(',').map((item) => item.trim()));

          matchAndSelectStudents(parsedItems);
        } catch (err) {
          toast.error('Failed to parse file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const matchAndSelectStudents = (parsedItems) => {
    const matchedIds = students
      .filter((s) =>
        parsedItems.some(
          (item) =>
            s.name.toLowerCase().includes(item.toLowerCase()) ||
            s.enrollmentNo?.toLowerCase() === item.toLowerCase() ||
            s.email.toLowerCase() === item.toLowerCase()
        )
      )
      .map((s) => s._id);

    if (matchedIds.length > 0) {
      setSelectedStudents((prev) => {
        const combined = new Set([...prev, ...matchedIds]);
        return Array.from(combined);
      });
      toast.success(`Matched and selected ${matchedIds.length} students from the uploaded list!`);
    } else {
      toast.error('No matching students found in the list');
    }
  };

  const handleAssign = async () => {
    if (!assignBatch) return;
    setAssigning(true);
    try {
      await api.patch(`/admin/batches/${assignBatch._id}/students`, {
        studentIds: selectedStudents,
      });
      toast.success('Students assigned to batch');
      setAssignOpen(false);
      fetchBatches();
    } catch (err) {
      toast.error(err.message || 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Batch Name',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'studentIds',
      label: 'Students',
      render: (val) => (
        <span className="text-sm font-tabular text-ink-secondary">{val?.length || 0}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openAssign(row)}
          icon={<HiOutlineUserPlus className="w-4 h-4" />}
        >
          Assign students
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Batches">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          id="batch-filter-program"
          name="filterProgram"
          className="select-base w-56"
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
        >
          <option value="">Select program</option>
          {programs.map((p) => (
            <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
          ))}
        </select>
        <select
          id="batch-filter-semester"
          name="filterSemester"
          className="select-base w-56"
          value={filterSemester}
          onChange={(e) => setFilterSemester(e.target.value)}
          disabled={!filterProgram}
        >
          <option value="">Select semester</option>
          {semesters.map((s) => (
            <option key={s._id} value={s._id}>{s.name} — {s.academicYear}</option>
          ))}
        </select>
        {filterSemester && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setCreateForm({ semesterId: filterSemester, name: '' }); setCreateOpen(true); }}
            icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          >
            Create batch
          </Button>
        )}
      </div>

      {!filterSemester ? (
        <div className="text-center py-12">
          <HiOutlineUserGroup className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Select a program and semester to view batches</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={batches}
          loading={loading}
          emptyMessage="No batches for this semester"
          emptyIcon={<HiOutlineUserGroup className="w-10 h-10" />}
        />
      )}

      {/* Create Batch Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Batch"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreate} loading={creating}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="create-batch-name" className="label-base">Batch Name</label>
            <input
              id="create-batch-name"
              name="name"
              className="input-base"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Batch A, Batch B"
            />
          </div>
        </div>
      </Modal>

      {/* Assign Students Modal */}
      <Modal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Assign Students — ${assignBatch?.name || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAssign} loading={assigning}>
              Save ({selectedStudents.length} selected)
            </Button>
          </>
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-border-subtle shrink-0">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Bulk Select from Excel/CSV</p>
            <p className="text-xs text-ink-muted">Upload a list of names, enrollment numbers, or emails</p>
          </div>
          <label className="relative flex items-center justify-center px-4 py-2 text-xs font-semibold text-brand bg-brand-50 border border-brand-100 rounded-md hover:bg-brand hover:text-white cursor-pointer transition-colors duration-150 shrink-0">
            <span>Upload List (Excel/CSV/Text)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {students.length === 0 ? (
            <p className="text-sm text-ink-muted py-4 text-center">No students found</p>
          ) : (
            <div className="space-y-1">
              {students.map((s) => (
                <label
                  key={s._id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-canvas cursor-pointer transition-colors duration-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s._id)}
                    onChange={() => toggleStudent(s._id)}
                    className="rounded border-border-subtle text-brand focus:ring-brand"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">{s.name}</p>
                    <p className="text-xs text-ink-muted">{s.enrollmentNo || s.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
