import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { HiPlus } from 'react-icons/hi2';

const ManageSemesters = () => {
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showProgModal, setShowProgModal] = useState(false);
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDept, setProgDept] = useState('');

  const [showSemModal, setShowSemModal] = useState(false);
  const [semProgramId, setSemProgramId] = useState('');
  const [semName, setSemName] = useState('');
  const [semNumber, setSemNumber] = useState(1);
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [type, setType] = useState('ODD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clearanceDeadline, setClearanceDeadline] = useState('');

  const fetchData = async () => {
    try {
      const [progRes, semRes] = await Promise.all([
        api.get('/admin/programs'),
        api.get('/admin/semesters'),
      ]);
      if (progRes.data.success) setPrograms(progRes.data.data.programs || []);
      if (semRes.data.success) setSemesters(semRes.data.data.semesters || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/programs', { name: progName, code: progCode, department: progDept });
      if (res.data.success) {
        toast.success('Program created!');
        setShowProgModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        programId: semProgramId,
        name: semName,
        semNumber,
        academicYear,
        type,
        clearanceDeadline,
      };

      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;

      const res = await api.post('/admin/semesters', payload);
      if (res.data.success) {
        toast.success('Semester created!');
        setShowSemModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Programs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Programs</h2>
          <button
            onClick={() => setShowProgModal(true)}
            className="btn-primary py-2 px-4 text-xs font-bold shadow-glow flex items-center gap-1.5"
          >
            <HiPlus className="w-4 h-4" /> Add Program
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {programs.map((p) => (
            <div key={p._id} className="bg-surface-900 border border-surface-800 p-5 rounded-2xl">
              <span className="text-xs font-bold text-primary-400 uppercase tracking-wider">{p.code}</span>
              <h3 className="font-bold text-lg text-white mt-1">{p.name}</h3>
              <p className="text-xs text-surface-400 mt-0.5">Dept: {p.department}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Semesters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">Semesters</h2>
          <button
            onClick={() => setShowSemModal(true)}
            className="btn-primary py-2 px-4 text-xs font-bold shadow-glow flex items-center gap-1.5"
          >
            <HiPlus className="w-4 h-4" /> Add Semester
          </button>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
              <tr>
                <th className="p-4 font-semibold">Semester Name</th>
                <th className="p-4 font-semibold">Sem No</th>
                <th className="p-4 font-semibold">Year</th>
                <th className="p-4 font-semibold">Clearance Deadline</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {semesters.map((s) => (
                <tr key={s._id} className="hover:bg-surface-800/30">
                  <td className="p-4 font-medium text-white">{s.name}</td>
                  <td className="p-4 text-surface-400">{s.semNumber}</td>
                  <td className="p-4 text-surface-400">{s.academicYear} ({s.type})</td>
                  <td className="p-4 text-amber-400 font-medium">{new Date(s.clearanceDeadline).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold ${s.isActive ? 'text-emerald-400' : 'text-surface-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Program Modal */}
      {showProgModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Create Program</h3>
            <form onSubmit={handleCreateProgram} className="space-y-3">
              <input
                type="text"
                placeholder="Program Name (e.g. B.Tech Computer Science)"
                required
                value={progName}
                onChange={(e) => setProgName(e.target.value)}
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              />
              <input
                type="text"
                placeholder="Code (e.g. CSE)"
                required
                value={progCode}
                onChange={(e) => setProgCode(e.target.value)}
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              />
              <input
                type="text"
                placeholder="Department"
                required
                value={progDept}
                onChange={(e) => setProgDept(e.target.value)}
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgModal(false)}
                  className="flex-1 py-3 bg-surface-800 text-surface-300 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Modal */}
      {showSemModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Create Semester</h3>
            <form onSubmit={handleCreateSemester} className="space-y-3">
              <select
                value={semProgramId}
                onChange={(e) => setSemProgramId(e.target.value)}
                required
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              >
                <option value="">Select Program</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Semester Name (e.g. Sem 6 AI&ML)"
                required
                value={semName}
                onChange={(e) => setSemName(e.target.value)}
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              />
              <input
                type="number"
                placeholder="Sem Number (1-10)"
                required
                value={semNumber}
                onChange={(e) => setSemNumber(parseInt(e.target.value))}
                className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
              />
              <div>
                <label className="block text-xs text-surface-400 mb-1">Clearance Deadline</label>
                <input
                  type="date"
                  required
                  value={clearanceDeadline}
                  onChange={(e) => setClearanceDeadline(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <label className="block text-xs text-surface-400 mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs text-surface-400 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSemModal(false)}
                  className="flex-1 py-3 bg-surface-800 text-surface-300 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSemesters;
