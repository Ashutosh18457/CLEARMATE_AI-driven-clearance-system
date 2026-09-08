import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineDocumentText,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
  HiOutlineRocketLaunch,
  HiOutlineArrowRight,
  HiOutlineInboxStack,
  HiOutlineDocumentArrowDown,
  HiOutlineCheckBadge,
  HiOutlineCheckCircle,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlinePrinter,
  HiOutlineXCircle,
  HiOutlineBuildingLibrary,
  HiOutlineUser,
} from 'react-icons/hi2';
import { FaWallet, FaBus, FaBook, FaBalanceScale, FaUserTie, FaGraduationCap } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  DEPARTMENT_LABELS,
} from '../../utils/constants';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';

function StatCard({ icon, label, value, subtext, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand border-brand-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    danger: 'bg-rose-50 text-rose-600 border-rose-100',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-bold text-slate-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 font-tabular mt-0.5">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [clearance, setClearance] = useState(null);
  const [prereq, setPrereq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [submissionsRes, clearanceRes, prereqRes] = await Promise.all([
        api.get('/submissions/my').catch(() => ({ data: { data: [] } })),
        api.get('/clearances/my').catch(() => ({ data: { data: null } })),
        api.get('/clearances/prerequisites').catch(() => ({ data: { data: null } })),
      ]);

      // Normalize submissions
      const rawSubs = submissionsRes.data?.data || [];
      const normalizedSubs = Array.isArray(rawSubs)
        ? rawSubs.map((item) => {
            if (item.submissionItem) {
              return {
                _id: item.submissionItem._id,
                title: item.submissionItem.title,
                type: item.submissionItem.type,
                deadline: item.submissionItem.deadline,
                clearanceItemTitle: item.submissionItem.clearanceItem?.title,
                clearanceItemId: item.submissionItem.clearanceItem?._id || item.submissionItem.clearanceItemId,
                status: item.myStatus?.status || 'pending',
                submittedAt: item.myStatus?.submittedAt,
                verifiedAt: item.myStatus?.verifiedAt,
                remarks: item.myStatus?.remarks,
              };
            }
            return item;
          })
        : [];
      setSubmissions(normalizedSubs);

      // Normalize clearance
      setClearance(clearanceRes.data?.data || null);
      setPrereq(prereqRes.data?.data || null);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time socket event listener for live dashboard synchronization
  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = () => {
      fetchDashboardData();
    };

    socket.on('clearance_updated', handleDataUpdate);
    socket.on('new_notification', handleDataUpdate);
    socket.on('submission_verified', handleDataUpdate);

    return () => {
      socket.off('clearance_updated', handleDataUpdate);
      socket.off('new_notification', handleDataUpdate);
      socket.off('submission_verified', handleDataUpdate);
    };
  }, [socket, fetchDashboardData]);

  const handleInitiateClearance = async () => {
    if (prereq && !prereq.allCleared && prereq.pendingItems?.length > 0) {
      toast.error(
        `Cannot initiate clearance yet. You have ${prereq.pendingItems.length} required coursework submissions pending teacher verification.`,
        { duration: 5000 }
      );
      navigate('/student/submissions');
      return;
    }

    const semId = user?.currentSemester?._id || user?.currentSemester;
    const isValidObjectId = typeof semId === 'string' && semId.length === 24;
    try {
      setInitiating(true);
      const payload = isValidObjectId ? { semesterId: semId } : {};
      await api.post('/clearances/initiate', payload);
      toast.success('Clearance initiated successfully! Multi-stage review pipeline is now live.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const rawStatus = clearance?.status || clearance?.clearanceRequest?.status;
  const isInitiated = Boolean(clearance && rawStatus);
  const isFullyCleared = rawStatus === 'completed';
  const isRejected = rawStatus === 'rejected';

  const itemClearances = clearance?.itemClearances || [];
  const sectionClearances = clearance?.sectionClearances || [];

  // Live computed institutional sections clearance rows
  const displaySections = useMemo(() => {
    const defaultDepts = [
      { srNo: 1, department: 'accounts', sectionName: 'Accounts Section', remarks: 'Tuition fees & institutional dues', status: 'pending' },
      { srNo: 2, department: 'bus', sectionName: 'Bus / Transport', remarks: 'Transport dues & route verification', status: 'pending' },
      { srNo: 3, department: 'library', sectionName: 'Central Library', remarks: 'Book returns and fine clearance', status: 'pending' },
      { srNo: 4, department: 'disciplinary', sectionName: 'Disciplinary Committee', remarks: 'Student conduct & disciplinary clearance', status: 'pending' },
    ];

    if (!sectionClearances || sectionClearances.length === 0) {
      return defaultDepts;
    }

    return defaultDepts.map((d, idx) => {
      const match = sectionClearances.find((s) => s.department === d.department);
      if (match) {
        const isApp = match.status === 'approved' || match.fees_status === 'paid' || match.bus_fees_status === 'paid';
        const isRej = match.status === 'rejected';
        return {
          ...d,
          ...match,
          srNo: idx + 1,
          status: isApp ? 'approved' : isRej ? 'rejected' : 'pending',
          remarks: match.remark_text || match.remarks || (isApp ? 'No Dues / Cleared' : isRej ? 'Clearance rejected' : 'Verification pending'),
          reviewerName: match.reviewerId?.name || (isApp ? `${DEPARTMENT_LABELS[d.department] || d.sectionName} Head` : null),
        };
      }
      return { ...d, srNo: idx + 1 };
    });
  }, [sectionClearances]);

  // Live computed display subjects
  const displayItems = useMemo(() => {
    if (isInitiated && itemClearances.length > 0) {
      return itemClearances.map((ic, idx) => ({
        srNo: idx + 1,
        title: ic.itemTitle || ic.clearanceItemId?.title || `Subject ${idx + 1}`,
        subjectCode: ic.clearanceItemId?.subjectCode || '',
        teacherName: ic.teacherId?.name || ic.clearanceItemId?.theoryTeacherId?.name || 'Assigned Faculty',
        status: ic.status || 'pending',
        remarks: ic.remarks || (ic.status === 'approved' ? 'Coursework & records cleared' : 'Verification pending'),
      }));
    }

    const adminItems = clearance?.clearanceItems || [];
    if (adminItems.length > 0) {
      return adminItems.map((item, idx) => {
        const matchingSubs = submissions.filter(
          (s) =>
            s.clearanceItemTitle === item.title ||
            s.clearanceItem?._id === item._id ||
            s.clearanceItemId === item._id
        );

        const allVerified = matchingSubs.length > 0 && matchingSubs.every((s) => s.status === 'verified');
        const anyRejected = matchingSubs.some((s) => s.status === 'rejected');

        const teacherName =
          item.theoryTeacherId?.name ||
          item.labBatchTeachers?.[0]?.teacherId?.name ||
          'Assigned Faculty';

        const status = allVerified ? 'approved' : anyRejected ? 'rejected' : 'pending';
        const remarks = allVerified
          ? 'All submissions verified by faculty'
          : anyRejected
          ? 'Coursework rejected'
          : (matchingSubs.length > 0 ? 'Coursework submitted / pending review' : 'Clearance not initiated');

        return {
          srNo: idx + 1,
          title: item.title,
          subjectCode: item.subjectCode || '',
          teacherName,
          status,
          remarks,
        };
      });
    }

    return [
      { srNo: 1, title: 'Database Management Systems (DBMS)', subjectCode: 'CS501', teacherName: 'Prof. Sharma', status: 'pending', remarks: 'Awaiting clearance initiation' },
      { srNo: 2, title: 'Computer Networks (CN)', subjectCode: 'CS502', teacherName: 'Prof. K. Verma', status: 'pending', remarks: 'Awaiting clearance initiation' },
      { srNo: 3, title: 'Theory of Computation (TOC)', subjectCode: 'CS503', teacherName: 'Prof. S. Mehta', status: 'pending', remarks: 'Awaiting clearance initiation' },
    ];
  }, [isInitiated, itemClearances, clearance?.clearanceItems, submissions]);

  const totalVerifiedSubmissions = submissions.filter((s) => s.status === SUBMISSION_STATUSES.VERIFIED).length;
  const approvedItemsCount = displayItems.filter((i) => i.status === 'approved').length;
  const approvedSectionsCount = displaySections.filter((s) => s.status === 'approved').length;

  const getSectionIcon = (dept) => {
    switch (dept) {
      case 'accounts':
        return <FaWallet className="w-5 h-5 text-emerald-600" />;
      case 'bus':
        return <FaBus className="w-5 h-5 text-amber-600" />;
      case 'library':
        return <FaBook className="w-5 h-5 text-purple-600" />;
      case 'disciplinary':
        return <FaBalanceScale className="w-5 h-5 text-rose-600" />;
      default:
        return <HiOutlineBuildingLibrary className="w-5 h-5 text-blue-600" />;
    }
  };

  const currentStageName = useMemo(() => {
    if (isFullyCleared) return 'Final Clearance Granted';
    if (isRejected) return 'Clearance Rejected';
    if (!isInitiated) return 'Not Initiated';
    if (rawStatus === 'ci_review') return 'Stage 2: Class Incharge Review';
    if (rawStatus === 'hod_review') return 'Stage 3: HOD Final Review';
    if (rawStatus === 'sections_review') return 'Stage 1: Institutional Sections Review';
    return 'Stage 1: Coursework & Faculty Review';
  }, [isFullyCleared, isRejected, isInitiated, rawStatus]);

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        
        {/* ─── HERO HEADER BANNER ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-20 -mb-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Semester {user?.currentSemester || 6} • Section {user?.section || 'A'} • {user?.programId?.code || 'CSE'}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {user?.name || 'Student'}!
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl">
                Roll No: <span className="font-mono font-semibold text-white">{user?.enrollmentNo || 'EN2024CSE002'}</span> • Track and manage your official multi-stage academic clearance in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={fetchDashboardData}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition backdrop-blur-sm"
              >
                <HiOutlineArrowPath className="w-4 h-4" />
                Sync Status
              </button>

              <Link
                to="/student/clearance-report"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition"
              >
                <HiOutlineBuildingLibrary className="w-4 h-4" />
                View Clearance Report
              </Link>
            </div>
          </div>
        </div>

        {/* ─── 4 METRIC STAT CARDS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<HiOutlineDocumentText className="w-6 h-6" />}
            label="Coursework Submissions"
            value={`${totalVerifiedSubmissions}/${submissions.length || 0}`}
            subtext={totalVerifiedSubmissions === submissions.length && submissions.length > 0 ? 'All submissions verified' : 'Pending verification'}
            color={totalVerifiedSubmissions === submissions.length && submissions.length > 0 ? 'success' : 'brand'}
          />

          <StatCard
            icon={<HiOutlineShieldCheck className="w-6 h-6" />}
            label="Institutional Sections"
            value={`${approvedSectionsCount}/4`}
            subtext={`${4 - approvedSectionsCount} sections remaining`}
            color={approvedSectionsCount === 4 ? 'success' : approvedSectionsCount > 0 ? 'warning' : 'purple'}
          />

          <StatCard
            icon={<HiOutlineAcademicCap className="w-6 h-6" />}
            label="Faculty Course Clearances"
            value={`${approvedItemsCount}/${displayItems.length}`}
            subtext={approvedItemsCount === displayItems.length ? 'All courses approved' : `${displayItems.length - approvedItemsCount} courses pending`}
            color={approvedItemsCount === displayItems.length ? 'success' : 'warning'}
          />

          <StatCard
            icon={<HiOutlineCheckBadge className="w-6 h-6" />}
            label="Current Clearance State"
            value={isFullyCleared ? 'CLEARED' : isInitiated ? 'IN REVIEW' : 'NOT INITIATED'}
            subtext={currentStageName}
            color={isFullyCleared ? 'success' : isRejected ? 'danger' : isInitiated ? 'warning' : 'brand'}
          />
        </div>

        {/* ─── INITIATION CALLOUT BANNER (ONLY IF NOT INITIATED) ─── */}
        {!isInitiated && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-blue-700 font-bold text-xs tracking-wider uppercase">
                <HiOutlineRocketLaunch className="w-4 h-4" /> Academic Clearance Initiation
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Ready to start your Semester {user?.currentSemester || 6} Clearance?
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Initiating clearance creates review items for all your subject teachers and the 4 institutional departments (Accounts, Transport, Library, Disciplinary). Make sure your required coursework is uploaded first!
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleInitiateClearance}
              loading={initiating}
              className="shrink-0 shadow-md font-bold"
            >
              <HiOutlineRocketLaunch className="w-5 h-5 mr-2" />
              Initiate Clearance Now
            </Button>
          </div>
        )}

        {/* ─── 4 INSTITUTIONAL SECTIONS GRID ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Institutional Sections Clearance
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {approvedSectionsCount} of 4 cleared
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displaySections.map((sec) => {
              const isApp = sec.status === 'approved';
              const isRej = sec.status === 'rejected';
              return (
                <div
                  key={sec.department}
                  className={`bg-white border rounded-2xl p-4 transition-all shadow-2xs ${isApp ? 'border-emerald-200 bg-emerald-50/20' : isRej ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/80 hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {getSectionIcon(sec.department)}
                    </div>
                    <span
                      className={`text-2xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isApp ? 'bg-emerald-100 text-emerald-700' : isRej ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {isApp ? '✓ Approved' : isRej ? '✕ Rejected' : '⟳ Pending'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{sec.sectionName}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {sec.remarks || 'Verification in progress'}
                  </p>

                  {sec.reviewerName && (
                    <p className="text-2xs text-slate-400 mt-3 pt-2 border-t border-slate-100 truncate">
                      Verified by: <strong className="text-slate-600">{sec.reviewerName}</strong>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── SUBJECT & COURSEWORK CLEARANCE TABLE ─── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Subject Coursework & Lab Clearances
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Faculty verification of assignments, lab practicals, and theory journals.
              </p>
            </div>

            <Link
              to="/student/submissions"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              Submit Coursework <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Subject Title</th>
                  <th className="py-3 px-4">Subject In-Charge</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayItems.map((item, idx) => {
                  const isApp = item.status === 'approved';
                  const isRej = item.status === 'rejected';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{item.title}</div>
                        {item.subjectCode && (
                          <span className="text-2xs font-mono text-slate-400 block">{item.subjectCode}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{item.teacherName}</td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">{item.remarks}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider ${isApp ? 'bg-emerald-100 text-emerald-700' : isRej ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {isApp ? '✓ Approved' : isRej ? '✕ Rejected' : '⟳ Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
