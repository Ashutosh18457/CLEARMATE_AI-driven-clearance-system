import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlineDocumentText,
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

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  // Clearance items for dropdown
  const [clearanceItems, setClearanceItems] = useState([]);
  const [clearanceItemsLoaded, setClearanceItemsLoaded] = useState(false);
  const [useFallbackInput, setUseFallbackInput] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/submissions/items', { params: { page, limit: 10 } });
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

  const fetchClearanceItems = useCallback(async () => {
    if (clearanceItemsLoaded) return;
    try {
      const res = await api.get('/admin/clearance-items');
      const data = res.data.data;
      setClearanceItems(Array.isArray(data) ? data : data.items || data.docs || []);
      setUseFallbackInput(false);
    } catch (err) {
      if (err.status === 403) {
        setUseFallbackInput(true);
      } else {
        toast.error('Failed to load clearance items: ' + err.message);
        setUseFallbackInput(true);
      }
    } finally {
      setClearanceItemsLoaded(true);
    }
  }, [clearanceItemsLoaded]);

  const handleOpenModal = () => {
    setForm(INITIAL_FORM);
    setModalOpen(true);
    fetchClearanceItems();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.clearanceItemId.trim()) {
      toast.error('Clearance Item is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        clearanceItemId: form.clearanceItemId,
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim(),
        isRequired: form.isRequired,
      };
      if (form.deadline) {
        payload.deadline = form.deadline;
      }
      await api.post('/submissions/items', payload);
      toast.success('Submission item created');
      setModalOpen(false);
      setForm(INITIAL_FORM);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (_, row) => (
        <span className="font-medium text-ink-primary">{row.title}</span>
      ),
    },
    {
      key: 'clearanceItemId',
      label: 'Clearance Item',
      render: (val) => (
        <span className="text-ink-secondary text-xs">
          {val?.title || val || '—'}
        </span>
      ),
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
          <span className="text-xs text-ink-secondary font-tabular">
            {new Date(val).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">No deadline</span>
        ),
    },
    {
      key: 'isRequired',
      label: 'Required',
      align: 'center',
      render: (val) => (
        <Badge variant={val ? 'rejected' : 'default'}>
          {val ? 'Required' : 'Optional'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<HiOutlineEye className="w-4 h-4" />}
          onClick={() => navigate(`/teacher/student-submissions/${row._id}`)}
        >
          Students
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Submission Items">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Submission Items</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Manage assignments, lab records, and other submission items
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<HiOutlinePlusCircle className="w-4 h-4" />}
          onClick={handleOpenModal}
        >
          Create Item
        </Button>
      </div>

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
          data={items}
          loading={loading}
          emptyMessage="No submission items yet"
          emptyIcon={<HiOutlineDocumentText className="w-10 h-10" />}
          pagination={{ page, totalPages, onPageChange: setPage }}
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Submission Item"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={creating} onClick={handleCreate}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Clearance Item */}
          <div>
            <label htmlFor="sub-item-clearance" className="block text-sm font-medium text-ink-primary mb-1">
              Clearance Item
            </label>
            {useFallbackInput ? (
              <input
                id="sub-item-clearance"
                type="text"
                name="clearanceItemId"
                value={form.clearanceItemId}
                onChange={handleChange}
                placeholder="Enter clearance item ID"
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              />
            ) : (
              <select
                id="sub-item-clearance"
                name="clearanceItemId"
                value={form.clearanceItemId}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
              >
                <option value="">Select clearance item</option>
                {clearanceItems.map((ci) => (
                  <option key={ci._id} value={ci._id}>
                    {ci.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="sub-item-title" className="block text-sm font-medium text-ink-primary mb-1">Title</label>
            <input
              id="sub-item-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Lab Record 1"
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="sub-item-type" className="block text-sm font-medium text-ink-primary mb-1">Type</label>
            <select
              id="sub-item-type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            >
              {Object.entries(SUBMISSION_ITEM_TYPES).map(([key, val]) => (
                <option key={val} value={val}>
                  {SUBMISSION_ITEM_TYPE_LABELS[val]}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="sub-item-desc" className="block text-sm font-medium text-ink-primary mb-1">Description</label>
            <textarea
              id="sub-item-desc"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150 resize-none"
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="sub-item-deadline" className="block text-sm font-medium text-ink-primary mb-1">Deadline</label>
            <input
              id="sub-item-deadline"
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors duration-150"
            />
          </div>

          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="sub-item-isReq"
              type="checkbox"
              name="isRequired"
              checked={form.isRequired}
              onChange={handleChange}
              className="w-4 h-4 rounded border-border-subtle text-brand focus:ring-brand/50"
            />
            <span className="text-sm text-ink-primary">Required for clearance</span>
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
