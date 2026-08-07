import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { HiPlus, HiUserGroup } from 'react-icons/hi2';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  // Role specific fields
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [currentSemester, setCurrentSemester] = useState(6);
  const [section, setSection] = useState('A');
  const [sectionType, setSectionType] = useState('library');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsers(res.data.data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { name, email, password, role };
      if (role === 'student') {
        if (enrollmentNo) payload.enrollmentNo = enrollmentNo;
        if (currentSemester) payload.currentSemester = currentSemester;
        if (section) payload.section = section;
      }
      if (role === 'section_head') {
        payload.sectionType = sectionType;
      }

      const res = await api.post('/admin/users', payload);
      if (res.data.success) {
        toast.success('User created successfully');
        setShowCreateModal(false);
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">User Management</h1>
          <p className="text-surface-400 text-sm mt-1">Manage accounts for Students, Teachers, Section Heads, Class Incharges, and Admins.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary py-2.5 px-4 text-sm font-bold shadow-glow flex items-center gap-2"
          >
            <HiPlus className="w-4 h-4" /> Add Single User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-surface-800/30">
                  <td className="p-4 font-medium text-white">{u.name}</td>
                  <td className="p-4 text-surface-400">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-surface-800 border border-surface-700 text-surface-300 text-xs font-semibold rounded-full uppercase">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold ${u.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aniket Sharma"
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aniket@sbjain.edu.in"
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="section_head">Section Head</option>
                  <option value="class_incharge">Class Incharge</option>
                  <option value="hod">HOD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {role === 'student' && (
                <div className="space-y-3 pt-1 border-t border-surface-800">
                  <div>
                    <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Enrollment No (Optional)</label>
                    <input
                      type="text"
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                      placeholder="e.g. EN2021CSE099"
                      className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={currentSemester}
                        onChange={(e) => setCurrentSemester(parseInt(e.target.value))}
                        className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Section</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {role === 'section_head' && (
                <div className="pt-1 border-t border-surface-800">
                  <label className="block text-xs font-semibold text-surface-300 uppercase mb-1">Department / Section Type</label>
                  <select
                    value={sectionType}
                    onChange={(e) => setSectionType(e.target.value)}
                    className="w-full p-3 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm"
                  >
                    <option value="library">Library</option>
                    <option value="accounts">Accounts</option>
                    <option value="bus">Bus / Transport</option>
                    <option value="student_section">Student Section</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-surface-800 text-surface-300 rounded-xl text-sm font-semibold hover:bg-surface-700"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-bold shadow-glow">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
