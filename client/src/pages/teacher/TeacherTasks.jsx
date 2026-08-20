import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HiOutlineClipboardDocumentList,
  HiOutlinePlusCircle,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineClock,
  HiOutlinePaperAirplane,
} from 'react-icons/hi2';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge, { getStatusVariant } from '../../components/common/Badge';

export default function TeacherTasks() {
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // View Assigned Students Modal
  const [viewStudentsModal, setViewStudentsModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get('/tasks/students');
      const studentList = res.data.data || [];
      if (Array.isArray(studentList) && studentList.length > 0) {
        setStudents(studentList);
      } else {
        const fallbackRes = await api.get('/admin/users', { params: { role: 'student', limit: 300 } });
        setStudents(fallbackRes.data.data.users || fallbackRes.data.data || []);
      }
    } catch {
      try {
        const fallbackRes = await api.get('/admin/users', { params: { role: 'student', limit: 300 } });
        setStudents(fallbackRes.data.data.users || fallbackRes.data.data || []);
      } catch {
        setStudents([]);
      }
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStudents();
  }, [fetchTasks, fetchStudents]);

  // Filtered student list for selection in modal
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.enrollmentNo?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesSection =
        sectionFilter === 'all' || s.section === sectionFilter;
      return matchesSearch && matchesSection;
    });
  }, [students, studentSearch, sectionFilter]);

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s._id);
    const allSelected = filteredIds.every((id) => selectedStudents.includes(id));

    if (allSelected) {
      // Deselect filtered
      setSelectedStudents((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedStudents((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please provide a task title');
      return;
    }
    if (!deadline) {
      toast.error('Please select a deadline');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Please assign at least one student');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        deadline,
        assignedStudents: selectedStudents,
      });

      toast.success(
        res.data?.message ||
          `Task assigned! Real-time notifications dispatched to ${selectedStudents.length} students.`
      );

      // Reset form
      setTitle('');
      setDescription('');
      setDeadline('');
      setSelectedStudents([]);
      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: 'completed' });
      toast.success('Task marked as completed');
      fetchTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status');
    }
  };

  const taskColumns = [
    {
      key: 'title',
      label: 'Task Details',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-sm text-ink-primary">{val}</p>
          {row.description && (
            <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'assignedStudents',
      label: 'Assigned Students',
      render: (val, row) => {
        const count = val?.length || 0;
        return (
          <button
            onClick={() => {
              setCurrentTask(row);
              setViewStudentsModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 hover:bg-brand-100/70 text-brand text-xs font-semibold transition-colors"
          >
            <HiOutlineUserGroup className="w-4 h-4" />
            <span>{count} Students</span>
          </button>
        );
      },
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (val) => {
        const isOverdue = new Date(val) < new Date();
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className={isOverdue ? 'text-status-rejected font-semibold' : 'text-ink-secondary'}>
              {new Date(val).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isOverdue && (
              <Badge variant="rejected">Overdue</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={val === 'completed' ? 'success' : val === 'assigned' ? 'info' : 'warning'}>
          {val ? val.toUpperCase() : 'ASSIGNED'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status !== 'completed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCompleteTask(row._id)}
              icon={<HiOutlineCheckCircle className="w-4 h-4 text-status-success" />}
            >
              Mark Completed
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Assigned Tasks & Real-Time Alerts">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink-primary flex items-center gap-2">
            <HiOutlineClipboardDocumentList className="w-6 h-6 text-brand" />
            Teacher Task Assignment & Real-Time Notification Console
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Assign coursework, project milestones, and reminders. Students immediately receive real-time Socket.IO notifications.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          icon={<HiOutlinePlusCircle className="w-5 h-5" />}
        >
          Assign New Task
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border-subtle rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-50 text-brand flex items-center justify-center">
            <HiOutlineClipboardDocumentList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase font-medium">Total Tasks Created</p>
            <p className="text-xl font-bold text-ink-primary">{tasks.length}</p>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-amber-50 text-status-pending flex items-center justify-center">
            <HiOutlineClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase font-medium">Active Tasks</p>
            <p className="text-xl font-bold text-status-pending">
              {tasks.filter((t) => t.status !== 'completed').length}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-md p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-green-50 text-status-success flex items-center justify-center">
            <HiOutlineCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase font-medium">Completed Tasks</p>
            <p className="text-xl font-bold text-status-success">
              {tasks.filter((t) => t.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <Table
        columns={taskColumns}
        data={tasks}
        loading={loading}
        emptyMessage="No tasks created yet. Click 'Assign New Task' to assign work to students with instant notifications."
      />

      {/* CREATE & ASSIGN TASK MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign New Task (Real-Time Notification Dispatch)"
        size="lg"
        footer={
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateTask}
                loading={submitting}
                icon={<HiOutlinePaperAirplane className="w-4 h-4" />}
              >
                Assign & Dispatch
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="label-base">Task Title *</label>
            <input
              type="text"
              className="input-base"
              placeholder="e.g. Lab Record 4 Submission, Project Milestone 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label-base">Description & Instructions</label>
            <textarea
              className="input-base min-h-[70px] resize-y text-xs"
              placeholder="Provide instructions, required files, or guidelines for the assigned students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label-base">Deadline *</label>
            <input
              type="datetime-local"
              className="input-base"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          {/* Student Multi-Selection Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-base !mb-0">
                Assign to Students * ({selectedStudents.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs text-brand hover:underline font-semibold"
              >
                Toggle Select All Filtered ({filteredStudents.length})
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="w-4 h-4 absolute left-3 top-2.5 text-ink-muted" />
                <input
                  type="text"
                  className="input-base pl-9 text-xs"
                  placeholder="Search by student name, enrollment no..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <select
                className="input-base text-xs"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="all">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            {/* Student list scroll area */}
            <div className="border border-border-subtle rounded-md max-h-48 overflow-y-auto divide-y divide-border-subtle bg-canvas/40">
              {loadingStudents ? (
                <p className="p-4 text-xs text-ink-muted text-center">Loading students...</p>
              ) : filteredStudents.length === 0 ? (
                <p className="p-4 text-xs text-ink-muted text-center">No matching students found</p>
              ) : (
                filteredStudents.map((s) => {
                  const isChecked = selectedStudents.includes(s._id);
                  return (
                    <label
                      key={s._id}
                      className={`flex items-center gap-3 p-2.5 text-xs hover:bg-surface cursor-pointer transition-colors ${
                        isChecked ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudent(s._id)}
                        className="rounded border-border text-brand focus:ring-brand"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-ink-primary block truncate">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-ink-muted font-mono">
                          {s.enrollmentNo || s.email} {s.section ? `• Sec ${s.section}` : ''}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* VIEW ASSIGNED STUDENTS MODAL */}
      {currentTask && (
        <Modal
          isOpen={viewStudentsModal}
          onClose={() => setViewStudentsModal(false)}
          title={`Assigned Students — ${currentTask.title}`}
          footer={
            <Button variant="secondary" onClick={() => setViewStudentsModal(false)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              Total {currentTask.assignedStudents?.length || 0} students assigned to this task.
            </p>
            <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle border border-border-subtle rounded-md">
              {currentTask.assignedStudents?.map((s, idx) => (
                <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink-primary">{s.name || 'Student'}</p>
                    <p className="text-[11px] text-ink-muted font-mono">{s.enrollmentNo || s.email}</p>
                  </div>
                  {s.section && (
                    <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle text-[10px] font-semibold text-ink-secondary">
                      Sec {s.section}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
