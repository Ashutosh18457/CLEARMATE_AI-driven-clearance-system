import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClearanceReportDashboardView from '../../components/clearance/ClearanceReportDashboardView';
import Skeleton from '../../components/common/Skeleton';
import { HiOutlineArrowPath, HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';

export default function StudentClearanceReport() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificate/my');
      if (res.data.success && res.data.data) {
        setReportData(res.data.data);
      } else {
        // Fallback default structure
        setReportData({
          student: {
            name: user?.name || 'Student',
            enrollmentNo: user?.enrollmentNo || 'EN2024CSE002',
            currentSemester: user?.currentSemester || 6,
            year: 'III',
            section: user?.section || 'A',
          },
          program: {
            name: user?.programId?.name || 'Computer Science & Engineering',
            code: user?.programId?.code || 'CSE',
            department: user?.programId?.department || 'Department of Computer Science & Engineering',
          },
          semester: {
            session: 'Session 2024-25 (EVEN)',
            academicYear: '2024-25',
            type: 'EVEN',
          },
          sections: [
            { srNo: 1, sectionName: 'Accounts', department: 'accounts', remarks: 'Fees verification & tuition dues', status: 'Approved', reviewerName: 'Accounts Section Head' },
            { srNo: 2, sectionName: 'Bus / Transport', department: 'bus', remarks: 'Transport dues verification', status: 'Approved', reviewerName: 'Transport Section Head' },
            { srNo: 3, sectionName: 'Library', department: 'library', remarks: 'Book returns and fine clearance', status: 'Approved', reviewerName: 'Library Section Head' },
            { srNo: 4, sectionName: 'Disciplinary', department: 'disciplinary', remarks: 'Student conduct & disciplinary clearance', status: 'Approved', reviewerName: 'Disciplinary Section Head' },
          ],
          items: [
            { srNo: 1, title: 'Theory of Computation', teacherName: 'Prof. Sharma', remarks: 'Assignments & Theory records', status: 'Approved' },
            { srNo: 2, title: 'Data Analytics & AI Lab', teacherName: 'Prof. Gupta', remarks: 'Lab practicals & project sign-off', status: 'Approved' },
          ],
          classIncharge: {
            name: 'Prof. Class Incharge (Sec A)',
            status: 'Pending',
          },
          hod: {
            name: 'Dr. Kulkarni (HOD - CSE)',
            title: 'HOD - CSE',
            department: 'Computer Science & Engineering',
            status: 'Pending',
          },
          status: 'NOT INITIATED',
          certificateNumber: `CM-2026-${(user?.enrollmentNo || 'CSE002').slice(-6)}`,
          issuedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      // Fallback state
      setReportData({
        student: {
          name: user?.name || 'Rohan Iyer',
          enrollmentNo: user?.enrollmentNo || 'EN2024CSE002',
          currentSemester: user?.currentSemester || 6,
          year: 'III',
          section: user?.section || 'A',
        },
        program: {
          name: 'Computer Science & Engineering',
          code: 'CSE',
          department: 'Department of Computer Science & Engineering',
        },
        semester: {
          session: 'Session 2024-25 (EVEN)',
          academicYear: '2024-25',
          type: 'EVEN',
        },
        sections: [
          { srNo: 1, sectionName: 'Accounts', remarks: 'Fees verification & tuition dues', status: 'Approved', reviewerName: 'Accounts Section Head' },
          { srNo: 2, sectionName: 'Bus / Transport', remarks: 'Transport dues verification', status: 'Approved', reviewerName: 'Transport Section Head' },
          { srNo: 3, sectionName: 'Library', remarks: 'Book returns and fine clearance', status: 'Approved', reviewerName: 'Library Section Head' },
        ],
        items: [
          { srNo: 1, title: 'Theory of Computation', teacherName: 'Prof. Sharma', remarks: 'Assignments & Theory records', status: 'Approved' },
          { srNo: 2, title: 'Data Analytics & AI Lab', teacherName: 'Prof. Gupta', remarks: 'Lab practicals & project sign-off', status: 'Approved' },
        ],
        classIncharge: {
          name: 'Prof. Class Incharge (Sec A)',
          status: 'Pending',
        },
        hod: {
          name: 'Dr. Kulkarni (HOD - CSE)',
          title: 'HOD - CSE',
          department: 'Emerging Technologies',
          status: 'Pending',
        },
        status: 'NOT INITIATED',
        certificateNumber: 'CM-2026-CSE002',
        issuedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <DashboardLayout title="Clearance Report">
      {loading ? (
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <ClearanceReportDashboardView
          reportData={reportData}
          onRefresh={fetchReport}
          loading={loading}
          isStudent={true}
        />
      )}
    </DashboardLayout>
  );
}
