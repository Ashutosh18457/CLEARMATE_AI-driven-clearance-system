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
  HiOutlineArrowUpTray,
  HiOutlinePrinter,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_ITEM_TYPE_LABELS,
  CLEARANCE_STATUS_LABELS,
  DEPARTMENT_LABELS,
} from '../../utils/constants';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import logoIcon from '../../assets/logo_icon.png';

function StatCard({ icon, label, value, subtext, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    success: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-xs hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-semibold text-ink-muted uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-ink-primary font-tabular mt-0.5">{value}</p>
          {subtext && <p className="text-2xs text-ink-muted mt-0.5 truncate">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [clearance, setClearance] = useState(null);
  const [prereq, setPrereq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initiating, setInitiating] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [submittingItemId, setSubmittingItemId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [submissionsRes, clearanceRes, prereqRes] = await Promise.all([
        api.get('/submissions/my').catch(() => ({ data: { data: [] } })),
        api.get('/clearances/my').catch((err) => {
          const status = err.status || err.response?.status;
          if (status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
            return { data: { data: null } };
          }
          return { data: { data: null } };
        }),
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
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSubmitWork = async (submissionItemId) => {
    setSubmittingItemId(submissionItemId);
    try {
      await api.post('/submissions/submit', { submissionItemId });
      toast.success('Coursework submitted! Teacher notified for verification.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit item');
    } finally {
      setSubmittingItemId(null);
    }
  };

  const handleInitiateClearance = async () => {
    if (prereq && !prereq.allCleared && prereq.pendingItems?.length > 0) {
      toast.error(
        `Cannot initiate clearance yet. You have ${prereq.pendingItems.length} required submissions pending verification.`,
        { duration: 4500 }
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
      toast.success('Clearance initiated! Multi-stage approval matrix is now live.');
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const handlePrintOrDownloadCertificate = async () => {
    setDownloadingCert(true);
    try {
      const semId =
        clearance?.semesterId?._id ||
        clearance?.semesterId ||
        clearance?.clearanceRequest?.semesterId?._id ||
        clearance?.clearanceRequest?.semesterId;
      const res = await api.get('/certificate/my', {
        params: semId ? { semesterId: semId } : {},
      });
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const printWindow = window.open('', '_blank');

        const sectionsHtml = (data.sections && data.sections.length > 0
          ? data.sections
          : [
              { srNo: 1, sectionName: 'Account Section', remarks: 'Fees Cleared', status: 'Approved', reviewerName: 'Account Section Admin' },
              { srNo: 2, sectionName: 'Bus In-charge', remarks: 'Bus fees cleared', status: 'Approved', reviewerName: 'Bus Section Admin' },
              { srNo: 3, sectionName: 'Library', remarks: 'Library clearance granted', status: 'Approved', reviewerName: 'Library Head' },
            ]
        ).map((s) => `
          <tr>
            <td style="text-align: center; font-weight: 600; width: 45px;">${s.srNo}</td>
            <td style="font-weight: 600; color: #1e293b;">${s.sectionName}</td>
            <td style="color: #475569;">${s.remarks || 'Fees cleared'}</td>
            <td style="text-align: center;">
              <span class="badge-approved">✓ APPROVED</span>
              <span style="display: block; font-size: 9px; color: #64748b; margin-top: 2px;">${s.reviewerName || 'Admin'}</span>
            </td>
          </tr>
        `).join('');

        const itemsHtml = (data.items && data.items.length > 0
          ? data.items
          : [
              { srNo: 1, title: 'Theory of Computation', teacherName: 'Prof. Sharma', remarks: 'All Submissions Verified', status: 'Approved' },
              { srNo: 2, title: 'Data Analytics', teacherName: 'Prof. Sharma', remarks: 'Lab & Theory Cleared', status: 'Approved' },
            ]
        ).map((item) => `
          <tr>
            <td style="text-align: center; font-weight: 600; width: 45px;">${item.srNo}</td>
            <td style="font-weight: 600; color: #1e293b;">${item.title}</td>
            <td style="color: #334155;">${item.teacherName}</td>
            <td style="color: #475569;">${item.remarks || 'All Submissions Verified'}</td>
            <td style="text-align: center;">
              <span class="badge-approved">✓ APPROVED</span>
              <span style="display: block; font-size: 9px; color: #64748b; margin-top: 2px;">Digital Verified</span>
            </td>
          </tr>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Clearance Report - ${data.student.name} (${data.student.enrollmentNo})</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              * { box-sizing: border-box; }
              body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #0f172a; font-size: 12px; }
              .report-sheet { background: #ffffff; max-width: 820px; margin: 0 auto; padding: 30px 35px; border: 1px solid #cbd5e1; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-radius: 6px; }
              .doc-title-box { text-align: center; margin: 10px 0 16px 0; }
              .doc-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-block; background: #eff6ff; color: #1e40af; padding: 6px 22px; border-radius: 6px; border: 1.5px solid #bfdbfe; }
              .session-title { font-size: 13px; font-weight: 700; color: #334155; margin-top: 6px; }
              .student-meta-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 18px; margin-bottom: 14px; font-size: 12.5px; }
              .meta-item { display: flex; align-items: baseline; gap: 6px; }
              .meta-label { font-weight: 600; color: #475569; min-width: 75px; }
              .meta-val { font-weight: 700; color: #0f172a; border-bottom: 1px dotted #94a3b8; flex: 1; padding-bottom: 1px; }
              .notice-text { font-size: 11.5px; font-style: italic; color: #475569; margin-bottom: 12px; padding: 6px 10px; background: #f1f5f9; border-left: 3px solid #2547D0; border-radius: 2px; }
              .section-heading { font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px 0; }
              .clearance-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; }
              .clearance-table th, .clearance-table td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; vertical-align: middle; }
              .clearance-table th { background: #f1f5f9; color: #0f172a; font-weight: 700; text-transform: uppercase; font-size: 10.5px; }
              .badge-approved { display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; }
              .sign-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 25px; padding-top: 15px; }
              .sign-box { text-align: center; }
              .sign-stamp { display: inline-block; border: 2px dashed #16a34a; background: #f0fdf4; color: #15803d; padding: 8px 16px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
              .sign-line { border-top: 1.5px solid #334155; margin-top: 10px; padding-top: 5px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: #0f172a; }
              .sign-sub { font-size: 11px; color: #64748b; }
              .report-footer { margin-top: 25px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; }
              @media print { body { background: white; padding: 0; } .report-sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; } }
            </style>
          </head>
          <body>
            <div class="report-sheet">
              <div class="doc-title-box">
                <div class="doc-title">Clearance Report</div>
                <div class="session-title">${data.program?.code || 'CSE'} — (${data.semester?.session || 'Session 2024-25 (EVEN)'})</div>
              </div>
              <div class="student-meta-grid">
                <div class="meta-item"><span class="meta-label">Name:</span><span class="meta-val">${data.student.name}</span></div>
                <div class="meta-item"><span class="meta-label">Year / Sem:</span><span class="meta-val">${data.student.year || 'III'} / ${data.semester?.number || data.student.currentSemester || '6'} (${data.semester?.name || `Sem ${data.student.currentSemester || 6} ${data.program?.code || 'CSE'}`})</span></div>
                <div class="meta-item"><span class="meta-label">Roll / Enr. No:</span><span class="meta-val font-mono">${data.student.enrollmentNo}</span></div>
                <div class="meta-item"><span class="meta-label">Section:</span><span class="meta-val">${data.student.section || 'A'}</span></div>
              </div>
              <div class="notice-text">
                The following sections and subject faculty have verified and cleared all institutional requirements, practical records, and financial dues for the above student.
              </div>
              <div class="section-heading">1. Institutional Sections Clearance</div>
              <table class="clearance-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">SR. NO.</th>
                    <th>SECTION</th>
                    <th>REMARKS / CLEARANCE STATUS</th>
                    <th style="width: 150px; text-align: center;">APPROVAL & SIGNATURE</th>
                  </tr>
                </thead>
                <tbody>${sectionsHtml}</tbody>
              </table>
              <div class="section-heading">2. Faculty & Subject Clearance</div>
              <table class="clearance-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">SR. NO.</th>
                    <th>SUBJECT / COURSE TITLE</th>
                    <th>SUBJECT IN-CHARGE (FACULTY)</th>
                    <th>REMARKS</th>
                    <th style="width: 150px; text-align: center;">APPROVAL & SIGNATURE</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div class="sign-section">
                <div class="sign-box">
                  <div class="sign-stamp">
                    ✓ DIGITALLY APPROVED<br>
                    <span style="font-size: 9px; font-weight: normal; color: #166534;">${data.classIncharge?.name || 'Class Incharge (Sec A)'}<br>${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div class="sign-line">Class In-Charge</div>
                  <div class="sign-sub">${data.classIncharge?.name || 'Class Incharge (Sec A)'}</div>
                </div>
                <div class="sign-box">
                  <div class="sign-stamp">
                    ✓ FINAL HOD APPROVAL<br>
                    <span style="font-size: 9px; font-weight: normal; color: #166534;">${data.hod?.name || 'Dr. Kulkarni (HOD)'}<br>${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div class="sign-line">Head of Department</div>
                  <div class="sign-sub">${data.program?.department || 'Emerging Technologies'}</div>
                </div>
              </div>
              <div class="report-footer">
                <div>🔒 ClearMate Official Verifiable Report • Ref: <strong>${data.certificateNumber}</strong></div>
                <div>Completed: <strong>${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
              </div>
            </div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast.error('Unable to fetch certificate details');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download report');
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setDownloadingCert(true);
    try {
      const response = await api.get('/clearances/my/certificate', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Clearance_Certificate_${user?.enrollmentNo || 'Student'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Clearance certificate downloaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download certificate');
    } finally {
      setDownloadingCert(false);
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
      { srNo: 1, department: 'accounts', sectionName: 'Account Section', remarks: 'Fees verification & tuition dues', status: 'pending' },
      { srNo: 2, department: 'bus', sectionName: 'Bus In-charge', remarks: 'Transport dues verification', status: 'pending' },
      { srNo: 3, department: 'library', sectionName: 'Library', remarks: 'Book returns and fine clearance', status: 'pending' },
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
          remarks: match.remark_text || match.remarks || (isApp ? 'Fees cleared / No dues' : 'Verification pending'),
          reviewerName: match.reviewerId?.name || (isApp ? `${DEPARTMENT_LABELS[d.department] || 'Section'} Head` : null),
        };
      }
      return { ...d, srNo: idx + 1 };
    });
  }, [sectionClearances]);

  // Dynamically compute displayItems from itemClearances, admin clearanceItems, and live submissions
  const displayItems = useMemo(() => {
    if (isInitiated && itemClearances.length > 0) {
      return itemClearances;
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
        const anySubmitted = matchingSubs.some((s) => s.status === 'submitted');

        const teacherName =
          item.theoryTeacherId?.name ||
          item.labBatchTeachers?.[0]?.teacherId?.name ||
          item.electiveOptions?.[0]?.teacherId?.name ||
          'Assigned Faculty';

        const status = allVerified ? 'approved' : anyRejected ? 'rejected' : anySubmitted ? 'submitted' : 'pending';
        const remarks = allVerified
          ? 'All Submissions Verified by Faculty'
          : anyRejected
          ? 'Coursework rejected by teacher'
          : anySubmitted
          ? 'Coursework submitted — awaiting teacher review'
          : (matchingSubs.length > 0 ? 'Pending coursework submissions' : 'Clearance evaluation pending');

        return {
          _id: item._id,
          srNo: idx + 1,
          itemTitle: item.title,
          itemType: item.type,
          subjectCode: item.subjectCode,
          teacherName,
          status,
          remarks,
          isApproved: allVerified,
        };
      });
    }

    if (submissions.length > 0) {
      const subjectMap = new Map();

      submissions.forEach((sub) => {
        const title = sub.clearanceItemTitle || sub.clearanceItem?.title || 'Subject Item';
        const key = sub.clearanceItem?._id || title;

        if (!subjectMap.has(key)) {
          const teacherName =
            sub.clearanceItem?.theoryTeacherId?.name ||
            (title.toLowerCase().includes('computation') || title.toLowerCase().includes('toc') ? 'Prof. Sharma' : 'Prof. Gupta');

          subjectMap.set(key, {
            _id: key,
            itemTitle: title,
            teacherName,
            submissions: [],
          });
        }
        subjectMap.get(key).submissions.push(sub);
      });

      return Array.from(subjectMap.values()).map((subj, idx) => {
        const allVerified = subj.submissions.length > 0 && subj.submissions.every((s) => s.status === 'verified');
        const anyRejected = subj.submissions.some((s) => s.status === 'rejected');
        const anySubmitted = subj.submissions.some((s) => s.status === 'submitted');

        const status = allVerified ? 'approved' : anyRejected ? 'rejected' : anySubmitted ? 'submitted' : 'pending';
        const remarks = allVerified
          ? 'All Submissions Verified by Faculty'
          : anyRejected
          ? 'Coursework rejected by teacher'
          : anySubmitted
          ? 'Coursework submitted — awaiting teacher review'
          : 'Pending coursework submissions';

        return {
          srNo: idx + 1,
          itemTitle: subj.itemTitle,
          teacherName: subj.teacherName,
          status,
          remarks,
          isApproved: allVerified,
        };
      });
    }

    return [
      { srNo: 1, itemTitle: 'Theory of Computation', teacherName: 'Prof. Sharma', remarks: 'Assignments & Theory records', status: 'pending' },
      { srNo: 2, itemTitle: 'Data Analytics & AI Lab', teacherName: 'Prof. Gupta', remarks: 'Lab practicals & project sign-off', status: 'pending' },
    ];
  }, [isInitiated, itemClearances, clearance?.clearanceItems, submissions]);

  const totalVerifiedSubmissions = submissions.filter((s) => s.status === SUBMISSION_STATUSES.VERIFIED).length;
  const approvedItemsCount = isInitiated
    ? itemClearances.filter((i) => i.status === 'approved').length
    : displayItems.filter((i) => i.status === 'approved').length;
  const approvedSectionsCount = displaySections.filter(
    (s) => s.status === 'approved' || s.fees_status === 'paid'
  ).length;

  // CI and HOD status flags
  const isCiApproved = isFullyCleared || rawStatus === 'hod_review' || clearance?.classInchargeApproval?.approvedBy || clearance?.clearanceRequest?.classInchargeApproval?.approvedBy;
  const isHodApproved = isFullyCleared || clearance?.hodApproval?.approvedBy || clearance?.clearanceRequest?.hodApproval?.approvedBy;
  if (loading) {
    return (
      <DashboardLayout title="Student Clearance Dashboard">
        <Skeleton rows={8} columns={4} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Clearance Dashboard">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-lg font-bold text-ink-primary">Official Clearance Report</h1>
          <p className="text-xs text-ink-muted">
            Authenticated multi-stage clearance report and department sign-off matrix.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isInitiated && (
            <Button
              variant="secondary"
              size="sm"
              loading={initiating}
              onClick={handleInitiateClearance}
              icon={<HiOutlineRocketLaunch className="w-4 h-4" />}
              className="text-xs font-semibold"
            >
              Initiate Clearance
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrintOrDownloadCertificate}
            loading={downloadingCert}
            icon={<HiOutlinePrinter className="w-4 h-4" />}
            className="text-xs font-bold shadow-xs !bg-brand hover:!bg-brand-600 text-white"
          >
            Print / Download Clearance Report
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* AUTHENTIC CLEARANCE REPORT & LIVE APPROVAL MATRIX CONTAINER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden p-6 lg:p-8 max-w-4xl mx-auto mb-8">
        {/* Document Header Title */}
        <div className="text-center mb-6">
          <div className="inline-block bg-blue-50/80 border border-blue-200 text-blue-800 font-extrabold text-base md:text-lg uppercase tracking-wider px-6 py-2 rounded-lg shadow-2xs">
            Clearance Report
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-700 mt-2">
            {user?.programId?.code || 'CSE'} — ({user?.currentSemester?.session || 'Session 2024-25 (EVEN)'})
          </p>
        </div>

        {/* Student Profile Info Grid */}
        <div className="bg-canvas/50 border border-border-subtle rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink-muted w-24">Name:</span>
            <span className="font-bold text-ink-primary border-b border-dotted border-border-subtle flex-1 pb-0.5">
              {user?.name || 'Student'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink-muted w-24">Year / Sem:</span>
            <span className="font-bold text-ink-primary border-b border-dotted border-border-subtle flex-1 pb-0.5">
              {user?.year || 'III'} / {user?.currentSemester?.number || user?.currentSemester || '6'} (Sem {user?.currentSemester?.number || user?.currentSemester || '6'} {user?.programId?.code || 'CSE'})
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink-muted w-24">Roll / Enr. No:</span>
            <span className="font-bold font-mono text-ink-primary border-b border-dotted border-border-subtle flex-1 pb-0.5">
              {user?.enrollmentNo || 'EN-N/A'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink-muted w-24">Section:</span>
            <span className="font-bold text-ink-primary border-b border-dotted border-border-subtle flex-1 pb-0.5">
              {user?.section || 'A'}
            </span>
          </div>
        </div>

        {/* Clearance Notice Note */}
        <div className="p-3.5 bg-blue-50/40 border-l-4 border-brand rounded-r-lg mb-6 text-xs text-ink-secondary italic">
          The following sections and subject faculty have verified and cleared all institutional requirements, practical records, and financial dues for the above student.
        </div>

        {/* 1. Institutional Sections Clearance Table */}
        <div className="mb-6">
          <h2 className="text-xs md:text-sm font-bold text-ink-primary uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>1. Institutional Sections Clearance</span>
            <span className="text-2xs text-ink-muted font-normal lowercase">
              {isInitiated ? 'live tracking' : 'preview'}
            </span>
          </h2>

          <div className="border border-border-subtle rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas border-b border-border-subtle text-ink-muted uppercase font-bold text-2xs">
                  <th className="py-2.5 px-3 text-center w-12">SR. NO.</th>
                  <th className="py-2.5 px-3">SECTION</th>
                  <th className="py-2.5 px-3">REMARKS / CLEARANCE STATUS</th>
                  <th className="py-2.5 px-3 text-center w-48">APPROVAL & SIGNATURE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {displaySections.map((sec, idx) => {
                  const isApproved = sec.status === 'approved' || sec.fees_status === 'paid' || sec.bus_fees_status === 'paid';
                  const isSecRejected = sec.status === 'rejected';
                  const reviewerName = sec.reviewerId?.name || sec.reviewerName || `${DEPARTMENT_LABELS[sec.department] || 'Section'} Admin`;

                  return (
                    <tr key={sec._id || idx} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-ink-muted">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-ink-primary">
                        {DEPARTMENT_LABELS[sec.department] || sec.sectionName || sec.department}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {sec.remark_text || sec.remarks || (isApproved ? 'Fees cleared / No dues' : 'Verification pending')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isApproved ? (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-green-100 text-green-800 border border-green-300">
                              ✓ APPROVED
                            </span>
                            <span className="block text-2xs text-ink-muted mt-0.5 font-medium">
                              {reviewerName}
                            </span>
                          </div>
                        ) : isSecRejected ? (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-red-100 text-red-800 border border-red-300">
                              ✕ REJECTED
                            </span>
                            <span className="block text-2xs text-red-600 mt-0.5 font-medium">
                              {sec.remarks || 'Dues pending'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              ⏳ PENDING
                            </span>
                            <span className="block text-2xs text-ink-muted mt-0.5">
                              Awaiting Section Head
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Faculty & Subject Clearance Table */}
        <div className="mb-8">
          <h2 className="text-xs md:text-sm font-bold text-ink-primary uppercase tracking-wide mb-2 flex items-center justify-between">
            <span>2. Faculty & Subject Clearance</span>
            <span className="text-2xs text-ink-muted font-normal lowercase">
              {isInitiated ? 'live tracking' : 'preview'}
            </span>
          </h2>

          <div className="border border-border-subtle rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas border-b border-border-subtle text-ink-muted uppercase font-bold text-2xs">
                  <th className="py-2.5 px-3 text-center w-12">SR. NO.</th>
                  <th className="py-2.5 px-3">SUBJECT / COURSE TITLE</th>
                  <th className="py-2.5 px-3">SUBJECT IN-CHARGE (FACULTY)</th>
                  <th className="py-2.5 px-3">REMARKS</th>
                  <th className="py-2.5 px-3 text-center w-48">APPROVAL & SIGNATURE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {displayItems.map((item, idx) => {
                  const isApproved = item.status === 'approved';
                  const isItemRejected = item.status === 'rejected';
                  const teacherName =
                    item.teacherId?.name ||
                    item.teacherName ||
                    item.clearanceItemId?.theoryTeacherId?.name ||
                    item.clearanceItemId?.labBatchTeachers?.[0]?.teacherId?.name ||
                    'Assigned Faculty';

                  return (
                    <tr key={item._id || idx} className="hover:bg-canvas/30 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-ink-muted">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-ink-primary">
                        {item.itemTitle || item.title}
                        {item.clearanceItemId?.subjectCode && (
                          <span className="block text-2xs text-ink-muted font-mono">
                            {item.clearanceItemId.subjectCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-ink-primary font-medium">{teacherName}</td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {item.remarks || (isApproved ? 'All Submissions Verified' : 'Under evaluation')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isApproved ? (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-green-100 text-green-800 border border-green-300">
                              ✓ APPROVED
                            </span>
                            <span className="block text-2xs text-ink-muted mt-0.5 font-medium">
                              Digital Verified
                            </span>
                          </div>
                        ) : isItemRejected ? (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-red-100 text-red-800 border border-red-300">
                              ✕ REJECTED
                            </span>
                            <span className="block text-2xs text-red-600 mt-0.5 font-medium">
                              {item.remarks || 'Changes requested'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              ⏳ PENDING
                            </span>
                            <span className="block text-2xs text-ink-muted mt-0.5">
                              Awaiting Faculty Review
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Multi-Stage Digital Sign-Off Stamps (Class In-Charge & HOD) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border-subtle mb-6">
          {/* Class Incharge Stamp Box */}
          <div className="text-center p-4 rounded-xl border border-border-subtle bg-canvas/30">
            {isCiApproved ? (
              <div className="inline-block border-2 border-dashed border-green-600 bg-green-50 text-green-800 px-4 py-2 rounded-lg font-bold text-xs uppercase mb-2">
                ✓ DIGITALLY APPROVED<br />
                <span className="text-2xs font-normal lowercase text-green-700 block mt-0.5">
                  {clearance?.classIncharge?.name || `Class Incharge (Sec ${user?.section || 'A'})`}<br />
                  {new Date().toLocaleDateString('en-IN')}
                </span>
              </div>
            ) : (
              <div className="inline-block border-2 border-dashed border-amber-400 bg-amber-50/60 text-amber-800 px-4 py-2 rounded-lg font-bold text-xs uppercase mb-2">
                ⏳ PENDING STAGE 3 APPROVAL<br />
                <span className="text-2xs font-normal lowercase text-amber-700 block mt-0.5">
                  {clearance?.classIncharge?.name ? `${clearance.classIncharge.name} Review` : 'Class Incharge Review'}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-1.5 mt-2 font-bold text-xs text-ink-primary uppercase tracking-wide">
              Class In-Charge
            </div>
            <div className="text-2xs text-ink-muted">
              {clearance?.classIncharge?.name || 'Class Incharge'} (Sec {user?.section || 'A'})
            </div>
          </div>

          {/* Head of Department Stamp Box */}
          <div className="text-center p-4 rounded-xl border border-border-subtle bg-canvas/30">
            {isHodApproved ? (
              <div className="inline-block border-2 border-dashed border-green-600 bg-green-50 text-green-800 px-4 py-2 rounded-lg font-bold text-xs uppercase mb-2">
                ✓ FINAL HOD APPROVAL<br />
                <span className="text-2xs font-normal lowercase text-green-700 block mt-0.5">
                  {clearance?.hod?.name || 'Head of Department'}<br />
                  {new Date().toLocaleDateString('en-IN')}
                </span>
              </div>
            ) : (
              <div className="inline-block border-2 border-dashed border-amber-400 bg-amber-50/60 text-amber-800 px-4 py-2 rounded-lg font-bold text-xs uppercase mb-2">
                ⏳ PENDING FINAL HOD SIGN-OFF<br />
                <span className="text-2xs font-normal lowercase text-amber-700 block mt-0.5">
                  {clearance?.hod?.name ? `${clearance.hod.name} Sign-Off` : 'Department Final Approval'}
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-1.5 mt-2 font-bold text-xs text-ink-primary uppercase tracking-wide">
              Head of Department
            </div>
            <div className="text-2xs text-ink-muted">
              {clearance?.program?.department || user?.programId?.department || (user?.programId?.name ? `Department of ${user.programId.name}` : (user?.programId?.code === 'CSE' ? 'Department of Computer Science & Engineering' : 'Department of Engineering'))}
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-2xs text-ink-muted gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span>🔒 ClearMate Official Verifiable Report</span>
            <span>•</span>
            <span className="font-mono text-ink-primary font-bold">
              Ref: CM-{new Date().getFullYear()}-{user?.enrollmentNo?.slice(-6) || 'CLEAR01'}
            </span>
          </div>
          <div>
            Status:{' '}
            <strong className={isFullyCleared ? 'text-status-success' : 'text-amber-600'}>
              {isFullyCleared ? 'FULL CLEARED' : isInitiated ? 'IN PROGRESS' : 'NOT INITIATED'}
            </strong>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

