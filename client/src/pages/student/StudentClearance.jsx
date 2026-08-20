import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusStepper from '../../components/common/StatusStepper';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Skeleton from '../../components/common/Skeleton';
import { useAuth } from '../../context/AuthContext';
import logoIcon from '../../assets/logo_icon.png';
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowDown,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlinePaperAirplane,
  HiOutlineClock,
} from 'react-icons/hi2';
import { CLEARANCE_STATUS_LABELS, DEPARTMENT_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';

export default function StudentClearance() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clearance, setClearance] = useState(null);
  const [prereq, setPrereq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [noClearance, setNoClearance] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const fetchClearance = useCallback(async () => {
    setLoading(true);
    try {
      const [clearanceRes, prereqRes] = await Promise.all([
        api.get('/clearances/my'),
        api.get('/clearances/prerequisites').catch(() => ({ data: { data: null } })),
      ]);

      if (clearanceRes.data.data) {
        setClearance(clearanceRes.data.data);
        setNoClearance(false);
      } else {
        setNoClearance(true);
      }
      setPrereq(prereqRes.data?.data || null);
    } catch (err) {
      if (err.status === 404) {
        setNoClearance(true);
      } else {
        toast.error(err.message || 'Failed to load clearance status');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClearance();
  }, [fetchClearance]);

  const handleInitiate = async () => {
    if (prereq && !prereq.allCleared && prereq.pendingItems?.length > 0) {
      toast.error(
        `Cannot initiate clearance yet. Please complete all ${prereq.pendingItems.length} pending submissions and have teachers verify them first.`,
        { duration: 5000 }
      );
      return;
    }

    const semId = user?.currentSemester?._id || user?.currentSemester;
    const isValidObjectId = typeof semId === 'string' && semId.length === 24;
    setInitiating(true);
    try {
      const payload = isValidObjectId ? { semesterId: semId } : {};
      await api.post('/clearances/initiate', payload);
      toast.success('Clearance initiated successfully! Approvals pipeline is now active.');
      fetchClearance();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const handleReInitiate = async () => {
    const semId = user?.currentSemester?._id || user?.currentSemester;
    const isValidObjectId = typeof semId === 'string' && semId.length === 24;
    setInitiating(true);
    try {
      const payload = isValidObjectId ? { semesterId: semId } : {};
      await api.post('/clearances/initiate', payload);
      toast.success('Clearance re-initiated — previous records cleared');
      fetchClearance();
    } catch (err) {
      toast.error(err.message || 'Failed to re-initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setDownloadingCert(true);
    try {
      const res = await api.get('/certificate/my');
      if (res.data.success) {
        const data = res.data.data;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Clearance Certificate - ${data.student.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 40px;
                background: white;
                color: #101828;
              }
              .cert-container {
                border: 8px double #2547D0;
                padding: 40px;
                text-align: center;
                position: relative;
                background: #fafbff;
                border-radius: 8px;
              }
              .logo {
                font-family: 'Outfit', sans-serif;
                font-size: 24px;
                font-weight: 800;
                color: #2547D0;
                margin-bottom: 20px;
              }
              .title {
                font-family: 'Outfit', sans-serif;
                font-size: 32px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .subtitle {
                font-size: 14px;
                color: #4b5563;
                margin-bottom: 35px;
              }
              .certify-text {
                font-size: 16px;
                color: #374151;
                line-height: 1.8;
                max-width: 600px;
                margin: 0 auto 35px auto;
              }
              .student-name {
                font-family: 'Outfit', sans-serif;
                font-size: 24px;
                font-weight: 700;
                color: #2547D0;
                border-bottom: 2px solid #e5e7eb;
                display: inline-block;
                padding-bottom: 4px;
                margin: 8px 0;
              }
              .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                max-width: 500px;
                margin: 0 auto 35px auto;
                text-align: left;
                font-size: 13px;
                color: #4b5563;
                background: white;
                padding: 16px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
              }
              .details-grid div strong {
                color: #1f2937;
              }
              .footer-signatures {
                display: flex;
                justify-content: space-between;
                margin-top: 50px;
                font-size: 13px;
                font-weight: 500;
                color: #4b5563;
              }
              .signature {
                border-top: 1px solid #9ca3af;
                padding-top: 8px;
                width: 130px;
                text-align: center;
              }
              .cert-meta {
                margin-top: 40px;
                font-size: 11px;
                color: #9ca3af;
                display: flex;
                justify-content: space-between;
                border-top: 1px solid #f3f4f6;
                padding-top: 15px;
              }
              @media print {
                body {
                  padding: 0;
                }
                .cert-container {
                  border-color: #2547D0 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="cert-container">
              <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 16px;">
                <img src="${logoIcon}" alt="ClearMate Logo" style="height: 60px; width: auto; object-fit: contain;" />
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 1px; color: #0f172a; font-family: sans-serif;">CLEARMATE</span>
              </div>
              <div class="title">Official Clearance Certificate</div>
              <div class="subtitle font-display">${data.institution || 'Institutional Clearance Portal'}</div>
              
              <div class="certify-text">
                This is to officially certify that the student<br>
                <div class="student-name">${data.student.name}</div><br>
                has successfully cleared all institutional dues, submissions, lab practicals, section clearances, and received final approval from the Head of Department (HOD).
              </div>

              <div class="details-grid">
                <div><strong>Enrollment No:</strong> ${data.student.enrollmentNo}</div>
                <div><strong>Section:</strong> ${data.student.section || 'A'}</div>
                <div><strong>Program:</strong> ${data.program?.name || 'Academic Program'}</div>
                <div><strong>Semester:</strong> Semester ${data.semester?.number || data.student?.currentSemester || '—'}</div>
                <div><strong>Academic Year:</strong> ${data.semester?.academicYear || '2025-26'}</div>
                <div><strong>Completed On:</strong> ${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'})}</div>
              </div>

              <div class="footer-signatures">
                <div class="signature">Class Incharge</div>
                <div class="signature">Head of Department (HOD)</div>
                <div class="signature">Examination Cell / Registrar</div>
              </div>

              <div class="cert-meta">
                <div>Certificate No: <strong>${data.certificateNumber}</strong></div>
                <div>Verification URL: <strong>${data.verificationUrl || 'https://clearmate.portal/verify'}</strong></div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download certificate');
    } finally {
      setDownloadingCert(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Clearance Status">
        <Skeleton rows={6} columns={4} />
      </DashboardLayout>
    );
  }

  // If no clearance has been initiated yet
  if (noClearance) {
    const isReady = prereq?.allCleared;
    const totalRequired = prereq?.totalRequired || 0;
    const verifiedCount = prereq?.verifiedCount || 0;
    const pendingItems = prereq?.pendingItems || [];

    return (
      <DashboardLayout title="Clearance Initiation">
        <div className="max-w-3xl mx-auto space-y-6 py-4">
          {/* Phase 2 Submissions Completion Status Card */}
          <div className={`p-6 rounded-lg border shadow-sm transition-all ${
            isReady ? 'bg-green-50/70 border-green-200' : 'bg-surface border-border-subtle'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isReady ? 'bg-green-100 text-status-success' : 'bg-brand-50 text-brand'
              }`}>
                {isReady ? (
                  <HiOutlineCheckBadge className="w-7 h-7" />
                ) : (
                  <HiOutlineClipboardDocumentCheck className="w-7 h-7" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-ink-primary">
                  {isReady
                    ? 'All Required Submissions Verified by Teachers!'
                    : 'Phase 2: Complete Required Submissions First'}
                </h3>
                <p className="text-sm text-ink-secondary mt-1">
                  {isReady
                    ? 'Your teachers have verified all your assignments and lab records. You are now eligible to initiate your multi-stage Clearance Pipeline.'
                    : `You must submit and obtain teacher verification on all required course assignments and labs before initiating clearance. (${verifiedCount}/${totalRequired} verified)`}
                </p>

                {/* Progress bar */}
                {totalRequired > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-ink-muted uppercase tracking-wider">Teacher Verifications</span>
                      <span className="text-brand font-tabular">{verifiedCount} of {totalRequired} Completed</span>
                    </div>
                    <div className="w-full h-2.5 bg-canvas rounded-full overflow-hidden border border-border-subtle">
                      <div
                        className="h-full bg-status-success transition-all duration-300 rounded-full"
                        style={{ width: `${(verifiedCount / totalRequired) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Pending Submissions Warning Checklist */}
                {!isReady && pendingItems.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                      <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Pending Submissions Awaiting Teacher Verification ({pendingItems.length}):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-amber-800">
                      {pendingItems.map((item) => (
                        <li key={item._id}>
                          <strong>{item.title}</strong> — {item.subject} ({item.type})
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => navigate('/student/submissions')}
                      icon={<HiOutlineArrowRight className="w-3.5 h-3.5" />}
                    >
                      Go to Submissions Portal
                    </Button>
                  </div>
                )}

                {/* Action Trigger */}
                <div className="mt-6 pt-4 border-t border-border-subtle/70 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">
                    {isReady ? 'Clearance pipeline ready' : 'Complete pending items above'}
                  </span>
                  <Button
                    variant={isReady ? 'primary' : 'secondary'}
                    size="md"
                    onClick={handleInitiate}
                    loading={initiating}
                    disabled={!isReady && pendingItems.length > 0}
                    icon={<HiOutlineClipboardDocumentCheck className="w-5 h-5" />}
                  >
                    {isReady ? 'Start Clearance Pipeline' : 'Initiate Clearance'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const status = clearance?.status || clearance?.clearanceRequest?.status;
  const itemClearances = clearance?.itemClearances || [];
  const sectionClearances = clearance?.sectionClearances || [];
  const pendingItems = itemClearances.filter((i) => i.status === 'pending');
  const pendingSections = sectionClearances.filter((s) => s.status === 'pending');
  const rejectionRemarks =
    itemClearances.find((i) => i.status === 'rejected')?.remarks ||
    sectionClearances.find((s) => s.status === 'rejected')?.remarks ||
    clearance?.remarks ||
    clearance?.clearanceRequest?.remarks ||
    '';

  const itemColumns = [
    {
      key: 'itemTitle',
      label: 'Subject / Task',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-sm text-ink-primary">{val}</span>
          {row.clearanceItemId?.subjectCode && (
            <span className="text-xs text-ink-muted font-mono block">
              {row.clearanceItemId.subjectCode}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'itemType',
      label: 'Type',
      render: (val) => <Badge variant="default">{ITEM_TYPE_LABELS[val] || val}</Badge>,
    },
    {
      key: 'teacherId',
      label: 'Evaluating Teacher',
      render: (_, row) => (
        <div>
          <span className="text-sm font-medium text-ink-primary">
            {row.teacherId?.name || row.teacher?.name || 'Assigned Teacher'}
          </span>
          {row.teacherId?.email && (
            <span className="text-xs text-ink-muted block">{row.teacherId.email}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Teacher Status',
      render: (val) => (
        <Badge variant={getStatusVariant(val)}>
          {val === 'pending' ? 'Pending' : val === 'approved' ? 'Approved' : 'Rejected'}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      label: 'Teacher Remarks',
      render: (val) => (
        <span className="text-xs text-ink-muted italic">{val || '—'}</span>
      ),
    },
  ];

  const sectionColumns = [
    {
      key: 'department',
      label: 'Institutional Department',
      render: (val) => (
        <span className="text-sm font-semibold text-ink-primary">
          {DEPARTMENT_LABELS[val] || val}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Section Status',
      render: (val, row) => {
        const isFeeSection = row.department === 'accounts' || row.department === 'bus';
        const feeStatus = row.bus_fees_status || row.fees_status;
        if (isFeeSection && feeStatus) {
          if (feeStatus === 'paid') {
            return <Badge variant="success">Paid</Badge>;
          }
          return (
            <Badge variant="warning">
              Pending {row.reason === 'remark' ? '(Remark)' : ''}
            </Badge>
          );
        }
        return (
          <Badge variant={getStatusVariant(val)}>
            {val === 'pending' ? 'Pending' : val === 'approved' ? 'Approved' : 'Rejected'}
          </Badge>
        );
      },
    },
    {
      key: 'reviewerId',
      label: 'Reviewed By',
      render: (_, row) => (
        <span className="text-sm text-ink-secondary">
          {row.reviewerId?.name || row.reviewer?.name || '—'}
        </span>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (val, row) => {
        const isFeeSection = row.department === 'accounts' || row.department === 'bus';
        const displayRemark = isFeeSection ? (row.remark_text || val) : val;
        return (
          <div className="group relative inline-block">
            <span className="text-sm text-ink-muted">{displayRemark || '—'}</span>
            {isFeeSection && row.reason === 'remark' && row.remark_text && (
              <div className="mt-1 text-xs text-amber-700 font-medium bg-amber-50 p-2 rounded-md border border-amber-200">
                ⚠️ {row.remark_text}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Clearance Status & Certificate">
      {/* Completed Banner: FULL CLEARED + Certificate PDF Download */}
      {status === 'completed' && (
        <div className="mb-6 p-5 rounded-lg bg-gradient-to-r from-green-50 via-emerald-50 to-surface border border-green-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 text-status-success flex items-center justify-center shrink-0">
                <HiOutlineCheckBadge className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-green-900 flex items-center gap-2">
                  <span>FULL CLEARED — Academic & Dues Clearance Completed</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-semibold font-mono">
                    APPROVED
                  </span>
                </p>
                <p className="text-xs text-green-800 mt-1">
                  All approvals received from Subject Teachers, Sections, Class Incharge, and HOD. Your verifiable official certificate is ready.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="shrink-0 !bg-status-success hover:!bg-green-700 text-white font-semibold"
              icon={<HiOutlineDocumentArrowDown className="w-5 h-5" />}
              loading={downloadingCert}
              onClick={handleDownloadCertificate}
            >
              Download Certificate (PDF)
            </Button>
          </div>
        </div>
      )}

      {/* What's Blocking You? Blocker Widget */}
      {status !== 'completed' && (pendingItems.length > 0 || pendingSections.length > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
              What's Blocking Your Clearance?
            </h2>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
              {pendingItems.length + pendingSections.length} Pending
            </span>
          </div>

          <p className="text-xs text-amber-800/90 mb-4">
            The following subjects or departments are currently holding your clearance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingItems.map((item) => (
              <div
                key={item._id}
                className="bg-white/90 border border-amber-100 rounded-lg p-3 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.itemTitle}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <HiOutlineClock className="w-3.5 h-3.5 text-amber-500" />
                    Pending Teacher Review
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  className="text-xs shrink-0"
                  icon={<HiOutlinePaperAirplane className="w-3.5 h-3.5" />}
                  onClick={() => toast.success(`Nudge reminder sent for ${item.itemTitle}!`)}
                >
                  Nudge
                </Button>
              </div>
            ))}

            {pendingSections.map((sec) => (
              <div
                key={sec._id}
                className="bg-white/90 border border-amber-100 rounded-lg p-3 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {DEPARTMENT_LABELS[sec.department] || sec.department} Section
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <HiOutlineClock className="w-3.5 h-3.5 text-amber-500" />
                    Pending Department Clearance
                  </p>
                  {sec.remarks && (
                    <p className="text-2xs text-red-600 mt-1 font-medium bg-red-50 p-1 rounded">
                      Reason: {sec.remarks}
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  className="text-xs shrink-0"
                  icon={<HiOutlinePaperAirplane className="w-3.5 h-3.5" />}
                  onClick={() => toast.success(`Nudge reminder sent to ${sec.department} section!`)}
                >
                  Nudge
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-surface border border-border-subtle rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-ink-primary mb-5">Multi-Stage Clearance Pipeline</h2>
        <StatusStepper status={status} remarks={rejectionRemarks} />
      </div>

      {/* Re-initiate button for rejected clearances */}
      {status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-900">Clearance Rejected</p>
            <p className="text-xs text-red-700 mt-0.5">Please resolve the remarks above and re-initiate your clearance request.</p>
          </div>
          <Button
            variant="primary"
            onClick={handleReInitiate}
            loading={initiating}
            icon={<HiOutlineArrowPath className="w-4 h-4" />}
          >
            Re-initiate clearance
          </Button>
        </div>
      )}

      {/* Stage 1: Item clearances */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-ink-primary mb-3">Stage 1: Faculty Subject Clearances</h2>
        <Table
          columns={itemColumns}
          data={itemClearances}
          loading={false}
          emptyMessage="No item clearances generated"
        />
      </div>

      {/* Stage 2: Section clearances */}
      <div>
        <h2 className="text-base font-semibold text-ink-primary mb-3">Stage 2: Institutional Section Clearances</h2>
        <Table
          columns={sectionColumns}
          data={sectionClearances}
          loading={false}
          emptyMessage="No section clearances generated"
        />
      </div>
    </DashboardLayout>
  );
}
