import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineAcademicCap,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import {
  SUBMISSION_ITEM_TYPES,
  SUBMISSION_ITEM_TYPE_LABELS,
} from '../../utils/constants';

const TYPE_BADGE_VARIANT = {
  assignment: 'info',
  lab_record: 'pending',
  project: 'success',
  presentation: 'default',
  other: 'default',
};

const INITIAL_FORM = {
  clearanceItemId: '',
  title: '',
  type: SUBMISSION_ITEM_TYPES.ASSIGNMENT,
  description: '',
  deadline: '',
  isRequired: true,
};

export default function SubmissionItems() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  // Clearance items assigned to this teacher
  const [clearanceItems, setClearanceItems] = useState([]);
  const [clearanceItemsLoading, setClearanceItemsLoading] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);
  const [updating, setUpdating] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);

  // Fetch teacher's assigned clearance items (with populated program & semester)
  const fetchClearanceItems = useCallback(async () => {
    setClearanceItemsLoading(true);
    try {
      const res = await api.get('/submissions/teacher-clearance-items');
      const data = res.data.data;
      setClearanceItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load assigned subjects: ' + err.message);
    } finally {
      setClearanceItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearanceItems();
  }, [fetchClearanceItems]);

  // Fetch submission items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/submissions/items', { params: { page, limit: 20 } });
      const data = res.data.data;
      if (Array.isArray(data)) {
        setItems(data);
        setTotalPages(1);
      } else {
        setItems(data.items || data.docs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Extract distinct programs and semesters for quick filtering
  const distinctPrograms = useMemo(() => {
    const map = new Map();
    clearanceItems.forEach((ci) => {
      const prog = ci.semesterId?.programId;
      if (prog && prog._id && !map.has(prog._id.toString())) {
        map.set(prog._id.toString(), prog);
      }
    });
    return Array.from(map.values());
  }, [clearanceItems]);

  const distinctSemesters = useMemo(() => {
    const set = new Set();
    clearanceItems.forEach((ci) => {
      const sem = ci.semesterId?.semNumber;
      if (sem) set.add(sem);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [clearanceItems]);

  // Filtered items on table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ci = item.clearanceItemId;
      const progId = ci?.semesterId?.programId?._id?.toString() || ci?.semesterId?.programId?.toString();
      const semNum = ci?.semesterId?.semNumber;

      if (filterProgram && progId !== filterProgram) return false;
      if (filterSemester && semNum?.toString() !== filterSemester.toString()) return false;

      return true;
    });
  }, [items, filterProgram, filterSemester]);

  // Helper to format Clearance Item display label
  const formatClearanceOption = (ci) => {
    const prog = ci.semesterId?.programId;
    const progCode = prog?.code || prog?.degree || 'Prog';
    const semNum = ci.semesterId?.semNumber ? `Sem ${ci.semesterId.semNumber}` : '';
    const subjectCode = ci.subjectCode ? `(${ci.subjectCode})` : '';
    const classTag = [progCode, semNum].filter(Boolean).join(' · ');

    return `[${classTag}] ${ci.title} ${subjectCode}`;
  };

  // Group clearance items by Program & Semester for dropdown optgroups
  const groupedClearanceItems = useMemo(() => {
    const groups = {};
    clearanceItems.forEach((ci) => {
      const prog = ci.semesterId?.programId;
      const progName = prog ? `${prog.degree ? `${prog.degree} ` : ''}${prog.name || prog.code}` : 'General';
      const semNum = ci.semesterId?.semNumber ? `Semester ${ci.semesterId.semNumber}` : 'General';
      const key = `${progName} — ${semNum}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(ci);
    });
    return groups;
  }, [clearanceItems]);

  // --- Create Handlers ---
  const handleOpenCreateModal = () => {
    setCreateForm({
      ...INITIAL_FORM,
      clearanceItemId: clearanceItems[0]?._id || '',
    });
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!createForm.clearanceItemId) {
      toast.error('Please select an assigned Clearance Subject / Class');
      return;
    }
    if (!createForm.deadline) {
      toast.error('Deadline is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        clearanceItemId: createForm.clearanceItemId,
        title: createForm.title.trim(),
        type: createForm.type,
        description: createForm.description.trim(),
        deadline: createForm.deadline,
        isRequired: createForm.isRequired,
      };

      await api.post('/submissions/items', payload);
      toast.success('Submission item created successfully');
      setCreateModalOpen(false);
      setCreateForm(INITIAL_FORM);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create submission item');
    } finally {
      setCreating(false);
    }
  };

  // --- Edit Handlers ---
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const ciId = typeof item.clearanceItemId === 'object' ? item.clearanceItemId?._id : item.clearanceItemId;
    const deadlineStr = item.deadline ? new Date(item.deadline).toISOString().split('T')[0] : '';

    setEditForm({
      clearanceItemId: ciId || '',
      title: item.title || '',
      type: item.type || SUBMISSION_ITEM_TYPES.ASSIGNMENT,
      description: item.description || '',
      deadline: deadlineStr,
      isRequired: item.isRequired ?? true,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!editForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editForm.clearanceItemId) {
      toast.error('Please select an assigned Clearance Subject / Class');
      return;
    }

    setUpdating(true);
    try {
      const payload = {
        clearanceItemId: editForm.clearanceItemId,
        title: editForm.title.trim(),
        type: editForm.type,
        description: editForm.description.trim(),
        isRequired: editForm.isRequired,
      };
      if (editForm.deadline) {
        payload.deadline = editForm.deadline;
      }

      await api.patch(`/submissions/items/${editingItem._id}`, payload);
      toast.success('Submission item updated successfully');
      setEditModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update submission item');
    } finally {
      setUpdating(false);
    }
  };

  // --- Delete Handlers ---
  const handleOpenDeleteModal = (item) => {
    setDeleteModal({ open: true, item });
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;

    setDeleting(true);
    try {
      await api.delete(`/submissions/items/${deleteModal.item._id}`);
      toast.success('Submission item deleted successfully');
      setDeleteModal({ open: false, item: null });
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete submission item');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Item Title',
      render: (_, row) => (
        <div>
          <span className="font-semibold text-ink-primary block">{row.title}</span>
          {row.description && (
            <span className="text-xs text-ink-muted line-clamp-1 mt-0.5">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'classBranch',
      label: 'Class / Branch',
      render: (_, row) => {
        const prog = row.clearanceItemId?.semesterId?.programId;
        const sem = row.clearanceItemId?.semesterId?.semNumber;
        if (!prog && !sem) {
          return <span className="text-xs text-ink-muted">—</span>;
        }
        return (
          <div className="flex flex-col gap-1 items-start">
            {prog && (
              <Badge variant="info">
                {prog.code ? `${prog.code}` : prog.degree || prog.name}
              </Badge>
            )}
            {sem && (
              <span className="text-[11px] text-ink-secondary font-medium font-tabular">
                Semester {sem}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'clearanceItemId',
      label: 'Subject / Clearance Item',
      render: (val) => {
        const title = val?.title || '—';
        const code = val?.subjectCode;
        return (
          <div>
            <span className="text-sm font-medium text-ink-primary block">{title}</span>
            {code && <span className="text-xs text-ink-secondary font-tabular">{code}</span>}
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <Badge variant={TYPE_BADGE_VARIANT[val] || 'default'}>
          {SUBMISSION_ITEM_TYPE_LABELS[val] || val}
        </Badge>
      ),
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (val) =>
        val ? (
          <span className="text-xs text-ink-secondary font-tabular whitespace-nowrap">
            {new Date(val).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">No deadline</span>
        ),
    },
    {
      key: 'isRequired',
      label: 'Requirement',
      align: 'center',
      render: (val) => (
        <Badge variant={val ? 'rejected' : 'default'}>
          {val ? 'Mandatory' : 'Optional'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="!text-brand hover:!bg-brand-50"
            icon={<HiOutlineEye className="w-4 h-4" />}
            onClick={() => navigate(`/teacher/student-submissions/${row._id}`)}
            title="View Student Submissions"
          >
            Students
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!text-ink-secondary hover:!text-ink-primary hover:!bg-canvas"
            icon={<HiOutlinePencilSquare className="w-4 h-4" />}
            onClick={() => handleOpenEditModal(row)}
            title="Edit Item"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!text-status-rejected hover:!bg-red-50"
            icon={<HiOutlineTrash className="w-4 h-4" />}
            onClick={() => handleOpenDeleteModal(row)}
            title="Delete Item"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Submission Items">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Submission Items</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Create, customize, and manage assignments, lab records, and deliverables for your assigned classes
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Create Item
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface border border-border-subtle rounded-md p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
          <HiOutlineAcademicCap className="w-4 h-4 text-brand" /> Filter By:
        </div>

        {/* Program / Branch Filter */}
        <div className="min-w-[180px]">
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All Branches / Programs</option>
            {distinctPrograms.map((prog) => (
              <option key={prog._id} value={prog._id}>
                {prog.degree ? `${prog.degree} - ` : ''}{prog.name} ({prog.code})
              </option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div className="min-w-[140px]">
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">All Semesters</option>
            {distinctSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>

        {(filterProgram || filterSemester) && (
          <button
            onClick={() => {
              setFilterProgram('');
              setFilterSemester('');
            }}
            className="text-xs text-brand hover:underline font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      {error && !items.length ? (
        <div className="bg-surface border border-border-subtle rounded-md p-8 text-center">
          <p className="text-sm text-ink-secondary mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchItems}>
            Retry
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredItems}
          loading={loading}
          emptyMessage={
            items.length === 0
              ? 'No submission items created yet. Click "Create Item" to get started!'
              : 'No submission items match the selected filter.'
          }
          emptyIcon={<HiOutlineDocumentText className="w-10 h-10" />}
          pagination={{ page, totalPages, onPageChange: setPage }}
        />
      )}

      {/* ── CREATE MODAL ── */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Submission Item"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={creating} onClick={handleCreate}>
              Create Item
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Clearance Item / Class & Subject selector */}
          <div>
            <label htmlFor="create-clearance-item" className="block text-sm font-medium text-ink-primary mb-1">
              Class & Subject <span className="text-status-rejected">*</span>
            </label>
            {clearanceItemsLoading ? (
              <p className="text-xs text-ink-muted">Loading assigned subjects...</p>
            ) : clearanceItems.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                You are not currently assigned to any subjects in active clearance semesters.
              </div>
            ) : (
              <select
                id="create-clearance-item"
                value={createForm.clearanceItemId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, clearanceItemId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              >
                <option value="">Choose Class / Subject</option>
                {Object.entries(groupedClearanceItems).map(([groupName, groupList]) => (
                  <optgroup key={groupName} label={groupName}>
                    {groupList.map((ci) => (
                      <option key={ci._id} value={ci._id}>
                        {formatClearanceOption(ci)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            <p className="text-xs text-ink-muted mt-1">
              Select the specific Branch, Semester, and Subject this submission belongs to.
            </p>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="create-title" className="block text-sm font-medium text-ink-primary mb-1">
              Item Title <span className="text-status-rejected">*</span>
            </label>
            <input
              id="create-title"
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Assignment 1 - Data Structures"
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            />
          </div>

          {/* Type & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-type" className="block text-sm font-medium text-ink-primary mb-1">
                Type
              </label>
              <select
                id="create-type"
                value={createForm.type}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              >
                {Object.entries(SUBMISSION_ITEM_TYPES).map(([key, val]) => (
                  <option key={val} value={val}>
                    {SUBMISSION_ITEM_TYPE_LABELS[val]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="create-deadline" className="block text-sm font-medium text-ink-primary mb-1">
                Deadline <span className="text-status-rejected">*</span>
              </label>
              <input
                id="create-deadline"
                type="date"
                value={createForm.deadline}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="create-desc" className="block text-sm font-medium text-ink-primary mb-1">
              Instructions / Description <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="create-desc"
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Provide submission guidelines or requirements for students..."
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
          </div>

          {/* Is Required Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={createForm.isRequired}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
              className="w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand"
            />
            <span className="text-sm text-ink-primary font-medium">
              Mandatory requirement for student clearance
            </span>
          </label>
        </div>
      </Modal>

      {/* ── EDIT / CUSTOMIZE MODAL ── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Customize Submission Item"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={updating} onClick={handleUpdate}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Clearance Item / Class & Subject selector */}
          <div>
            <label htmlFor="edit-clearance-item" className="block text-sm font-medium text-ink-primary mb-1">
              Class & Subject <span className="text-status-rejected">*</span>
            </label>
            <select
              id="edit-clearance-item"
              value={editForm.clearanceItemId}
              onChange={(e) => setEditForm((prev) => ({ ...prev, clearanceItemId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            >
              <option value="">Choose Class / Subject</option>
              {Object.entries(groupedClearanceItems).map(([groupName, groupList]) => (
                <optgroup key={groupName} label={groupName}>
                  {groupList.map((ci) => (
                    <option key={ci._id} value={ci._id}>
                      {formatClearanceOption(ci)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-ink-primary mb-1">
              Item Title <span className="text-status-rejected">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Assignment 1"
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            />
          </div>

          {/* Type & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-type" className="block text-sm font-medium text-ink-primary mb-1">
                Type
              </label>
              <select
                id="edit-type"
                value={editForm.type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              >
                {Object.entries(SUBMISSION_ITEM_TYPES).map(([key, val]) => (
                  <option key={val} value={val}>
                    {SUBMISSION_ITEM_TYPE_LABELS[val]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-deadline" className="block text-sm font-medium text-ink-primary mb-1">
                Deadline
              </label>
              <input
                id="edit-deadline"
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-desc" className="block text-sm font-medium text-ink-primary mb-1">
              Instructions / Description <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="edit-desc"
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Optional guidelines or instructions..."
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
          </div>

          {/* Is Required Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={editForm.isRequired}
              onChange={(e) => setEditForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
              className="w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand"
            />
            <span className="text-sm text-ink-primary font-medium">
              Mandatory requirement for student clearance
            </span>
          </label>
        </div>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        title="Delete Submission Item"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModal({ open: false, item: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete Item
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-status-rejected">
            <HiOutlineExclamationTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink-primary">
                Are you sure you want to delete this item?
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                You are deleting <strong className="font-semibold text-ink-primary">{deleteModal.item?.title}</strong>. All associated student submissions for this deliverable will also be permanently removed.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
