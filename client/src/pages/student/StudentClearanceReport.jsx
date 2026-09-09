import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClearanceReportDashboardView from '../../components/clearance/ClearanceReportDashboardView';
import Skeleton from '../../components/common/Skeleton';

export default function StudentClearanceReport() {
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const semNum =
    user?.currentSemester?.semNumber ||
    user?.currentSemester?.number ||
    (typeof user?.currentSemester === 'number' ? user.currentSemester : parseInt(user?.currentSemester) || undefined);

  const semId =
    user?.currentSemester?._id ||
    (typeof user?.currentSemester === 'string' && user.currentSemester.length === 24 ? user.currentSemester : undefined);

  // Dynamic filter state initialized strictly with logged-in student's real profile
  const [filters, setFilters] = useState({
    branch: user?.program || user?.programId?.code || '',
    semester: semNum || '',
    semesterId: semId,
    section: user?.section ? user.section.replace(/^Sec(tion)?\s*/i, '').trim() : '',
    includeReRun: false,
    forceAllCleared: false,
    name: user?.name || '',
    rollNo: user?.enrollmentNo || '',
  });

  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;

  const fetchReport = useCallback(async (customFilters) => {
    setLoading(true);
    const active = customFilters || filtersRef.current;
    try {
      const res = await api.get('/certificate/my', {
        params: {
          branch: active.branch,
          semester: active.semester,
          semesterId: active.semesterId,
          section: active.section,
          includeReRun: active.includeReRun,
          forceAllCleared: active.forceAllCleared,
          name: active.name,
          rollNo: active.rollNo,
        },
      });
      if (res.data.success && res.data.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch clearance data:', err);
      toast.error('No clearance record or items found for this semester yet.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const currentSemNum =
        user.currentSemester?.semNumber ||
        user.currentSemester?.number ||
        (typeof user.currentSemester === 'number' ? user.currentSemester : parseInt(user.currentSemester) || undefined);

      const currentSemId =
        user.currentSemester?._id ||
        (typeof user.currentSemester === 'string' && user.currentSemester.length === 24 ? user.currentSemester : undefined);

      const updated = {
        branch: user.program || user.programId?.code || '',
        semester: currentSemNum || '',
        semesterId: currentSemId,
        section: user.section ? user.section.replace(/^Sec(tion)?\s*/i, '').trim() : '',
        includeReRun: false,
        forceAllCleared: false,
        name: user.name || '',
        rollNo: user.enrollmentNo || '',
      };
      setFilters(updated);
      fetchReport(updated);
    } else {
      fetchReport();
    }
  }, [user, fetchReport]);

  // Real-time socket event listener for live synchronization
  useEffect(() => {
    if (!socket) return;

    const handleClearanceUpdate = () => {
      fetchReport();
    };

    socket.on('clearance_updated', handleClearanceUpdate);
    socket.on('new_notification', handleClearanceUpdate);

    return () => {
      socket.off('clearance_updated', handleClearanceUpdate);
      socket.off('new_notification', handleClearanceUpdate);
    };
  }, [socket, fetchReport]);

  const handleDynamicFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchReport(newFilters);
  };

  return (
    <DashboardLayout title="Student Clearance Report (Official ERP)">
      {loading && !reportData ? (
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <ClearanceReportDashboardView
          reportData={reportData}
          onRefresh={() => fetchReport(filters)}
          loading={loading}
          isStudent={true}
          onDynamicFilterChange={handleDynamicFilterChange}
        />
      )}
    </DashboardLayout>
  );
}
