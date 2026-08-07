import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { HiPlus } from 'react-icons/hi2';

const ManageClearanceItems = () => {
  const [items, setItems] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [semesterId, setSemesterId] = useState('');
  const [srNo, setSrNo] = useState(1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('theory');
  const [theoryTeacherId, setTheoryTeacherId] = useState('');

  const fetchAllData = async () => {
    try {
      const [itemsRes, semRes, userRes] = await Promise.all([
        api.get('/admin/clearance-items'),
        api.get('/admin/semesters'),
        api.get('/admin/users'),
      ]);

      if (itemsRes.data.success) setItems(itemsRes.data.data.items || []);
      if (semRes.data.success) {
        const sList = semRes.data.data.semesters || [];
        setSemesters(sList);
        if (sList.length > 0) setSemesterId(sList[0]._id);
      }
      if (userRes.data.success) {
        const tList = (userRes.data.data.users || []).filter((u) => u.role === 'teacher');
        setTeachers(tList);
        if (tList.length > 0) setTheoryTeacherId(tList[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!semesterId) {
      toast.error('Please create a semester first!');
      return;
    }

    try {
      const payload = { semesterId, srNo, title, type };
      if (type === 'theory' && theoryTeacherId) {
        payload.theoryTeacherId = theoryTeacherId;
      }

      const res = await api.post('/admin/clearance-items', payload);
      if (res.data.success) {
        toast.success('Clearance Item created successfully!');
        setShowModal(false);
        setTitle('');
        setSrNo(items.length + 2);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">Clearance Rules & Subjects</h1>
          <p className="text-surface-400 text-sm mt-1">Configure subjects, lab assignments, and theory teachers for clearance.</p>
        </div>
        <button
          onClick={() => {
            setSrNo(items.length + 1);
            setShowModal(true);
          }}
          className="btn-primary py-2.5 px-4 text-sm font-bold shadow-glow flex items-center gap-2"
        >
          <HiPlus className="w-4 h-4" /> Add Clearance Rule
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 p-12 rounded-2xl text-center space-y-3">
          <p className="text-surface-300 font-semibold">No clearance rules configured yet.</p>
          <p className="text-surface-500 text-sm">Click "Add Clearance Rule" above to create subject clearance rules.</p>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
              <tr>
                <th className="p-4 font-semibold">Sr No</th>
                <th className="p-4 font-semibold">Subject Title</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Assigned Teacher</th>
                <th className="p-4 font-semibold">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {items.map((i) => (
                <tr key={i._id} className="hover:bg-surface-800/30">
                  <td className="p-4 text-surface-400 font-bold">{i.srNo}</td>
                  <td className="p-4 font-medium text-white">{i.title}</td>
                  <td className="p-4 capitalize">
                    <span className="px-2.5 py-1 bg-surface-800 text-surface-300 text-xs font-semibold rounded-full border border-surface-700">
                      {i.type}
                    </span>
                  </td>
                  <td className="p-4 text-surface-300">
                    {i.theoryTeacherId?.name || 'All Lab/Department Teachers'}
                  </td>
                  <td className="p-4 text-emerald-400 font-semibold">{i.isRequired ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Add Clearance Item</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Select Semester</label>
                <select
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  required
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                >
                  <option value="">-- Select Semester --</option>
                  {semesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Serial Number</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={srNo}
                  onChange={(e) => setSrNo(parseInt(e.target.value))}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Subject / Item Title</label>
                <input
                  type="text"
                  placeholder="e.g. Database Management Systems"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Subject Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                >
                  <option value="theory">Theory Subject</option>
                  <option value="lab">Lab Course</option>
                  <option value="elective">Elective Subject</option>
                  <option value="special">Special Requirement</option>
                </select>
              </div>

              {type === 'theory' && (
                <div>
                  <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Assign Theory Teacher</label>
                  <select
                    value={theoryTeacherId}
                    onChange={(e) => setTheoryTeacherId(e.target.value)}
                    className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-surface-800 text-surface-300 rounded-xl text-sm font-semibold hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-bold shadow-glow">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClearanceItems;
