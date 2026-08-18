import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { HiPlus, HiCheck, HiXMark } from 'react-icons/hi2';

const SubmissionReview = () => {
  const [submissionItems, setSubmissionItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Item modal form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clearanceItemId, setClearanceItemId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('assignment');
  const [deadline, setDeadline] = useState('');

  const fetchItems = async () => {
    try {
      const res = await api.get('/submissions/items');
      if (res.data.success) {
        setSubmissionItems(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchStudentSubmissions = async (itemId) => {
    try {
      const res = await api.get(`/submissions/items/${itemId}/students`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
      }
    } catch (err) {
      toast.error('Failed to load student submissions');
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    fetchStudentSubmissions(item._id);
  };

  const handleVerify = async (submissionId, status, remarks = '') => {
    try {
      const res = await api.patch(`/submissions/${submissionId}/verify`, { status, remarks });
      if (res.data.success) {
        toast.success(`Submission ${status}`);
        if (selectedItem) fetchStudentSubmissions(selectedItem._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleCreateSubmissionItem = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/submissions/items', {
        clearanceItemId,
        title,
        type,
        deadline,
      });
      if (res.data.success) {
        toast.success('Submission requirement created!');
        setShowCreateModal(false);
        fetchItems();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">Submission Verification</h1>
          <p className="text-surface-400 text-sm mt-1">
            Create submission items and verify student work for your assigned subjects.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary py-3 px-5 text-sm font-bold shadow-glow flex items-center gap-2"
        >
          <HiPlus className="w-5 h-5" />
          Create Submission Item
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submission Items List */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-bold text-sm text-surface-400 uppercase tracking-wider px-2">
            Your Requirements
          </h3>

          {loading ? (
            <p className="text-surface-500 text-sm p-4">Loading requirements...</p>
          ) : submissionItems.length === 0 ? (
            <p className="text-surface-500 text-sm p-4">No submission items created yet.</p>
          ) : (
            submissionItems.map((item) => (
              <div
                key={item._id}
                onClick={() => handleSelectItem(item)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  selectedItem?._id === item._id
                    ? 'bg-primary-600/20 border-primary-500 text-white shadow-glow'
                    : 'bg-surface-800/40 border-surface-700/50 text-surface-300 hover:bg-surface-800'
                }`}
              >
                <h4 className="font-bold text-base">{item.title}</h4>
                <p className="text-xs text-surface-400 mt-1 capitalize">
                  Type: {item.type} | Deadline: {new Date(item.deadline).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right: Student Submissions Table */}
        <div className="lg:col-span-2 bg-surface-900 border border-surface-800 rounded-2xl p-6">
          {!selectedItem ? (
            <div className="py-20 text-center text-surface-500">
              Select a submission requirement on the left to view student submissions.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-surface-800 pb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">{selectedItem.title}</h3>
                  <p className="text-xs text-surface-400">Reviewing submissions for this item</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
                    <tr>
                      <th className="p-3 font-semibold">Student</th>
                      <th className="p-3 font-semibold">Enrollment</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {students.map(({ student, submission }) => (
                      <tr key={student._id} className="hover:bg-surface-800/30">
                        <td className="p-3 font-medium text-white">{student.name}</td>
                        <td className="p-3 text-surface-400">{student.enrollmentNo || 'N/A'}</td>
                        <td className="p-3">
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="p-3 text-right">
                          {submission.status === 'submitted' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleVerify(submission._id, 'verified')}
                                className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30"
                                title="Approve Verification"
                              >
                                <HiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleVerify(submission._id, 'rejected', 'Incomplete work')}
                                className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/30"
                                title="Reject Verification"
                              >
                                <HiXMark className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Create Submission Requirement</h3>
            <form onSubmit={handleCreateSubmissionItem} className="space-y-4">
              <div>
                <label htmlFor="sr-clearance-id" className="block text-xs font-semibold text-surface-300 uppercase mb-1">Clearance Item ID</label>
                <input
                  id="sr-clearance-id"
                  name="clearanceItemId"
                  type="text"
                  required
                  value={clearanceItemId}
                  onChange={(e) => setClearanceItemId(e.target.value)}
                  placeholder="ObjectId from Clearance Items"
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label htmlFor="sr-title" className="block text-xs font-semibold text-surface-300 uppercase mb-1">Title</label>
                <input
                  id="sr-title"
                  name="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab Manual Submission"
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label htmlFor="sr-type" className="block text-xs font-semibold text-surface-300 uppercase mb-1">Type</label>
                <select
                  id="sr-type"
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                >
                  <option value="assignment">Assignment</option>
                  <option value="lab_record">Lab Record</option>
                  <option value="project">Project</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>
              <div>
                <label htmlFor="sr-deadline" className="block text-xs font-semibold text-surface-300 uppercase mb-1">Deadline</label>
                <input
                  id="sr-deadline"
                  name="deadline"
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-surface-800 text-surface-300 rounded-xl text-sm font-semibold hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-bold shadow-glow">
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionReview;
