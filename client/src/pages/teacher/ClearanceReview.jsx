import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';
import { HiCheck, HiXMark } from 'react-icons/hi2';

const ClearanceReview = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const res = await api.get('/clearances/items/pending');
      if (res.data.success) {
        setItems(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (itemClearanceId, status, remarks = '') => {
    try {
      const res = await api.patch(`/clearances/items/${itemClearanceId}/review`, { status, remarks });
      if (res.data.success) {
        toast.success(`Clearance item ${status}`);
        fetchPending();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-white">Subject Clearance Approvals</h1>
        <p className="text-surface-400 text-sm mt-1">
          Approve or reject student subject clearances for Stage 1 of the clearance process.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-900 border border-surface-800 p-12 rounded-2xl text-center">
          <p className="text-surface-300 font-semibold">No pending subject clearance reviews.</p>
          <p className="text-surface-500 text-sm mt-1">All student clearance items assigned to you have been processed.</p>
        </div>
      ) : (
        <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
              <tr>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Enrollment No</th>
                <th className="p-4 font-semibold">Section</th>
                <th className="p-4 font-semibold">Subject Title</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-surface-800/30">
                  <td className="p-4 font-medium text-white">{item.studentId?.name || 'N/A'}</td>
                  <td className="p-4 text-surface-400">{item.studentId?.enrollmentNo || 'N/A'}</td>
                  <td className="p-4 text-surface-400">{item.studentId?.section || 'N/A'}</td>
                  <td className="p-4 font-semibold text-primary-400">{item.itemTitle}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleReview(item._id, 'approved')}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-semibold border border-emerald-500/30 flex items-center gap-1 text-xs"
                      >
                        <HiCheck className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleReview(item._id, 'rejected', 'Dues pending')}
                        className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl font-semibold border border-rose-500/30 flex items-center gap-1 text-xs"
                      >
                        <HiXMark className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClearanceReview;
