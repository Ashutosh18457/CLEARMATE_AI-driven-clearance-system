import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

const AnalyticsDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [stageDist, setStageDist] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [ovRes, sdRes, rkRes] = await Promise.all([
          api.get('/analytics/clearance-overview'),
          api.get('/analytics/stage-distribution'),
          api.get('/risk/at-risk-students'),
        ]);

        if (ovRes.data.success) setOverview(ovRes.data.data.overview);
        if (sdRes.data.success) setStageDist(sdRes.data.data.distribution || []);
        if (rkRes.data.success) setAtRisk(rkRes.data.data.students || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-white">System Analytics & Risk Insights</h1>
        <p className="text-surface-400 text-sm mt-1">
          Monitor real-time clearance velocity, stage bottlenecks, and AI at-risk student predictions.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overview Cards */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-900 border border-surface-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-surface-400 uppercase">Total Initiated</span>
                <p className="text-3xl font-extrabold text-white mt-1">{overview.total}</p>
              </div>
              <div className="bg-surface-900 border border-surface-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-emerald-400 uppercase">Completed</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">{overview.completed}</p>
              </div>
              <div className="bg-surface-900 border border-surface-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-amber-400 uppercase">In Progress</span>
                <p className="text-3xl font-extrabold text-amber-400 mt-1">{overview.inProgress}</p>
              </div>
              <div className="bg-surface-900 border border-surface-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-primary-400 uppercase">Completion Rate</span>
                <p className="text-3xl font-extrabold text-primary-400 mt-1">{overview.completionRate}%</p>
              </div>
            </div>
          )}

          {/* Stage Bottlenecks Bar View */}
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-display font-bold text-lg text-white">Stage Bottleneck Analysis</h3>
            <div className="space-y-3">
              {stageDist.map((item) => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-surface-300">{item.label}</span>
                    <span className="text-primary-400">{item.count} students</span>
                  </div>
                  <div className="w-full bg-surface-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (item.count / (overview?.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* At Risk Students AI Table */}
          <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">AI Risk Prediction (At-Risk Students)</h3>
                <p className="text-xs text-surface-400 mt-1">Students predicted to miss clearance deadline based on 5 submission factors.</p>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="text-xs text-surface-400 uppercase bg-surface-800/50">
                <tr>
                  <th className="p-4 font-semibold">Student Name</th>
                  <th className="p-4 font-semibold">Enrollment</th>
                  <th className="p-4 font-semibold">Risk Level</th>
                  <th className="p-4 font-semibold">Risk Score</th>
                  <th className="p-4 font-semibold">Submission Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {atRisk.map(({ student, riskLevel, riskScore, factors }) => (
                  <tr key={student._id} className="hover:bg-surface-800/30">
                    <td className="p-4 font-medium text-white">{student.name}</td>
                    <td className="p-4 text-surface-400">{student.enrollmentNo || 'N/A'}</td>
                    <td className="p-4">
                      <StatusBadge status={riskLevel} />
                    </td>
                    <td className="p-4 font-bold text-white">{riskScore} / 100</td>
                    <td className="p-4 text-surface-300 font-semibold">{factors.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
