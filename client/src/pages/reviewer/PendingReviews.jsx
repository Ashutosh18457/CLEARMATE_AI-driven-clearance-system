import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { HiCheck, HiXMark } from 'react-icons/hi2';

const PendingReviews = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const role = user?.role;

  const fetchPending = async () => {
    try {
      let endpoint = '';
      if (role === 'section_head') endpoint = '/clearances/sections/pending';
      else if (role === 'class_incharge') endpoint = '/clearances/ci/pending';
      else if (role === 'hod') endpoint = '/clearances/hod/pending';

      if (endpoint) {
        const res = await api.get(endpoint);
        if (res.data.success) {
          const list = res.data.data.sections || res.data.data.requests || [];
          setRequests(list);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [role]);

  const handleReview = async (id, status, remarks = '') => {
    try {
      let endpoint = '';
      if (role === 'section_head') endpoint = `/clearances/sections/${id}/review`;
      else if (role === 'class_incharge') endpoint = `/clearances/ci/${id}/review`;
      else if (role === 'hod') endpoint = `/clearances/hod/${id}/review`;

      const res = await api.patch(endpoint, { status, remarks });
      if (res.data.success) {
        toast.success(`Clearance ${status}`);
        fetchPending();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-white capitalize">
          {role?.replace('_', ' ')} Clearance Approvals
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Review and approve pending student clearances at your stage.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 p-12 rounded-2xl text-center">
          <p className="text-surface-300 font-semibold">No pending clearance reviews.</p>
          <p className="text-surface-500 text-sm mt-1">All student clearances at your stage have been processed.</p>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
              <tr>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Enrollment No</th>
                <th className="p-4 font-semibold">Section</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {requests.map((r) => {
                const student = r.studentId || {};
                return (
                  <tr key={r._id} className="hover:bg-surface-800/30">
                    <td className="p-4 font-medium text-white">{student.name || 'N/A'}</td>
                    <td className="p-4 text-surface-400">{student.enrollmentNo || 'N/A'}</td>
                    <td className="p-4 text-surface-400">{student.section || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReview(r._id, 'approved')}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-semibold border border-emerald-500/30 flex items-center gap-1 text-xs"
                        >
                          <HiCheck className="w-4 h-4" /> Approve Clearance
                        </button>
                        <button
                          onClick={() => handleReview(r._id, 'rejected', 'Dues pending')}
                          className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl font-semibold border border-rose-500/30 flex items-center gap-1 text-xs"
                        >
                          <HiXMark className="w-4 h-4" /> Reject Clearance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingReviews;
