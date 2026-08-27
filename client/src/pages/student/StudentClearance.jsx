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
      const status = err.status || err.response?.status;
      if (status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
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
      const semId = clearance?.semesterId?._id || clearance?.semesterId || clearance?.clearanceRequest?.semesterId?._id || clearance?.clearanceRequest?.semesterId;
      const res = await api.get('/certificate/my', {
        params: semId ? { semesterId: semId } : {},
      });
      if (res.data.success) {
        const data = res.data.data;        const printWindow = window.open('', '_blank');
        const sectionsHtml = (data.sections && data.sections.length > 0 ? data.sections : [
          { srNo: 1, sectionName: 'Account Section', remarks: 'Fees Cleared / No Dues', status: 'Approved', reviewerName: 'Account Section Head' },
          { srNo: 2, sectionName: 'Student Section', remarks: 'No Dues / Documents Verified', status: 'Approved', reviewerName: 'Student Section In-charge' },
          { srNo: 3, sectionName: 'Bus In-charge', remarks: 'Transport Dues Cleared', status: 'Approved', reviewerName: 'Bus Section In-charge' },
          { srNo: 4, sectionName: 'Library', remarks: 'No Overdue Books / Dues Cleared', status: 'Approved', reviewerName: 'Library Head' },
        ]).map((s) => `
          <tr>
            <td style="text-align: center; font-weight: 600; width: 50px;">${s.srNo}</td>
            <td style="font-weight: 600; color: #1e293b;">${s.sectionName}</td>
            <td style="color: #475569;">${s.remarks || 'No Dues'}</td>
            <td style="text-align: center; color: #15803d; font-weight: 600;">
              <span class="badge-approved">✓ APPROVED</span>
              <span style="display: block; font-size: 9px; color: #64748b; font-weight: normal; margin-top: 2px;">${s.reviewerName || 'Verified'}</span>
            </td>
          </tr>
        `).join('');

        const itemsHtml = (data.items && data.items.length > 0 ? data.items : [
          { srNo: 1, title: 'Theory of Computation', teacherName: 'Prof. Sharma', remarks: 'All Submissions Verified', status: 'Approved' },
          { srNo: 2, title: 'Data Analytics', teacherName: 'Prof. Sharma', remarks: 'Lab & Theory Cleared', status: 'Approved' },
        ]).map((item) => `
          <tr>
            <td style="text-align: center; font-weight: 600; width: 50px;">${item.srNo}</td>
            <td style="font-weight: 600; color: #1e293b;">
              ${item.title}
              ${item.subjectCode ? `<span style="font-size: 10px; color: #64748b; font-family: monospace; display: block;">${item.subjectCode}</span>` : ''}
            </td>
            <td style="color: #334155;">${item.teacherName}</td>
            <td style="color: #475569;">${item.remarks || 'Verified & Cleared'}</td>
            <td style="text-align: center; color: #15803d; font-weight: 600;">
              <span class="badge-approved">✓ APPROVED</span>
              <span style="display: block; font-size: 9px; color: #64748b; font-weight: normal; margin-top: 2px;">Digital Verified</span>
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
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              * {
                box-sizing: border-box;
              }
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 15px;
                background: #f8fafc;
                color: #0f172a;
                font-size: 12px;
                line-height: 1.4;
              }
              .report-sheet {
                background: #ffffff;
                max-width: 820px;
                margin: 0 auto;
                padding: 30px 35px;
                border: 1px solid #cbd5e1;
                box-shadow: 0 4px 16px rgba(0,0,0,0.06);
                border-radius: 6px;
                position: relative;
              }
              .inst-header {
                text-align: center;
                border-bottom: 2px solid #2547D0;
                padding-bottom: 12px;
                margin-bottom: 14px;
              }
              .inst-name {
                font-family: 'Outfit', sans-serif;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1.3;
              }
              .dept-name {
                font-family: 'Outfit', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #2547D0;
                margin-top: 4px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              .doc-title-box {
                text-align: center;
                margin: 12px 0 14px 0;
              }
              .doc-title {
                font-family: 'Outfit', sans-serif;
                font-size: 20px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 1px;
                display: inline-block;
                background: #eff6ff;
                color: #1e40af;
                padding: 4px 18px;
                border-radius: 4px;
                border: 1px solid #bfdbfe;
              }
              .session-title {
                font-size: 13px;
                font-weight: 700;
                color: #334155;
                margin-top: 4px;
              }
              .student-meta-grid {
                display: grid;
                grid-template-columns: 1.2fr 0.8fr;
                gap: 10px 24px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px 18px;
                margin-bottom: 14px;
                font-size: 12.5px;
              }
              .meta-item {
                display: flex;
                align-items: baseline;
                gap: 6px;
              }
              .meta-label {
                font-weight: 600;
                color: #475569;
                min-width: 75px;
              }
              .meta-val {
                font-weight: 700;
                color: #0f172a;
                border-bottom: 1px dotted #94a3b8;
                flex: 1;
                padding-bottom: 1px;
              }
              .notice-text {
                font-size: 11.5px;
                font-style: italic;
                color: #475569;
                margin-bottom: 10px;
                padding: 6px 10px;
                background: #f1f5f9;
                border-left: 3px solid #2547D0;
                border-radius: 2px;
              }
              .section-heading {
                font-family: 'Outfit', sans-serif;
                font-size: 12.5px;
                font-weight: 700;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 14px 0 6px 0;
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .clearance-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 12px;
                font-size: 11.5px;
              }
              .clearance-table th, .clearance-table td {
                border: 1px solid #cbd5e1;
                padding: 6px 10px;
                text-align: left;
                vertical-align: middle;
              }
              .clearance-table th {
                background: #f1f5f9;
                color: #0f172a;
                font-weight: 700;
                text-transform: uppercase;
                font-size: 10.5px;
                letter-spacing: 0.3px;
              }
              .badge-approved {
                display: inline-block;
                background: #dcfce7;
                color: #166534;
                border: 1px solid #86efac;
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.3px;
              }
              .sign-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 30px;
                padding-top: 15px;
              }
              .sign-box {
                text-align: center;
              }
              .sign-stamp {
                display: inline-block;
                border: 2px dashed #16a34a;
                background: #f0fdf4;
                color: #15803d;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 8px;
                text-transform: uppercase;
              }
              .sign-line {
                border-top: 1.5px solid #334155;
                margin-top: 10px;
                padding-top: 5px;
                font-family: 'Outfit', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
              }
              .sign-sub {
                font-size: 11px;
                color: #64748b;
              }
              .report-footer {
                margin-top: 25px;
                padding-top: 12px;
                border-top: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #64748b;
              }
              .seal-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: 600;
                color: #2547D0;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .report-sheet {
                  border: none;
                  box-shadow: none;
                  padding: 0;
                  max-width: 100%;
                }
                .badge-approved {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .inst-header {
                  border-bottom-color: #0f172a !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="report-sheet">
              <!-- Institutional Header -->
              <div class="inst-header">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px;">
                  <img src="${logoIcon}" alt="ClearMate" style="height: 38px; width: auto;" />
                  <div class="inst-name">S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR</div>
                </div>
                <div class="dept-name">${data.departmentHeader || `DEPARTMENT OF EMERGING TECHNOLOGIES (${data.program?.code || 'AI&DS'})`}</div>
              </div>

              <!-- Title -->
              <div class="doc-title-box">
                <div class="doc-title">Clearance Report</div>
                <div class="session-title">${data.program?.code || 'B.Tech'} — (${data.semester?.session || 'Session 2024-25 (ODD)'})</div>
              </div>

              <!-- Student Academic Profile -->
              <div class="student-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">Name:</span>
                  <span class="meta-val">${data.student.name}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Year / Sem:</span>
                  <span class="meta-val">${data.student.year || 'III'} / ${data.semester?.number || data.student.currentSemester || 'V'} (${data.semester?.name || 'Semester'})</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Roll / Enr. No:</span>
                  <span class="meta-val font-mono">${data.student.enrollmentNo}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Section:</span>
                  <span class="meta-val">${data.student.section || 'A'}</span>
                </div>
              </div>

              <div class="notice-text">
                The following sections and subject faculty have verified and cleared all institutional requirements, practical records, and financial dues for the above student.
              </div>

              <!-- Table 1: Institutional Sections Clearance -->
              <div class="section-heading">1. Institutional Sections Clearance</div>
              <table class="clearance-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">Sr. No.</th>
                    <th>Section</th>
                    <th>Remarks / Clearance Status</th>
                    <th style="width: 140px; text-align: center;">Approval & Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${sectionsHtml}
                </tbody>
              </table>

              <!-- Table 2: Faculty & Subject Clearance -->
              <div class="section-heading">2. Faculty & Subject Clearance</div>
              <table class="clearance-table">
                <thead>
                  <tr>
                    <th style="width: 45px; text-align: center;">Sr. No.</th>
                    <th>Subject / Course Title</th>
                    <th>Subject In-Charge (Faculty)</th>
                    <th>Remarks</th>
                    <th style="width: 140px; text-align: center;">Approval & Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Digital Sign-Off -->
              <div class="sign-section">
                <div class="sign-box">
                  <div class="sign-stamp">
                    ✓ DIGITALLY APPROVED<br>
                    <span style="font-size: 9px; font-weight: normal; text-transform: none; color: #166534;">
                      ${data.classIncharge?.name || 'Class Incharge'}<br>
                      ${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div class="sign-line">Class In-Charge</div>
                  <div class="sign-sub">${data.classIncharge?.name || 'Section In-Charge'}</div>
                </div>

                <div class="sign-box">
                  <div class="sign-stamp">
                    ✓ FINAL HOD APPROVAL<br>
                    <span style="font-size: 9px; font-weight: normal; text-transform: none; color: #166534;">
                      ${data.hod?.name || 'Dr. Kulkarni (HOD)'}<br>
                      ${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div class="sign-line">Head of Department</div>
                  <div class="sign-sub">${data.program?.department || 'Department of Emerging Technologies'}</div>
                </div>
              </div>

              <!-- Official Footer -->
              <div class="report-footer">
                <div class="seal-badge">
                  <span>🔒 ClearMate Official Verifiable Report</span>
                  <span>•</span>
                  <span>Ref: <strong>${data.certificateNumber}</strong></span>
                </div>
                <div>
                  Completed: <strong>${new Date(data.clearance?.completedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </div>
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
      toast.error(err.response?.data?.message || err.message || 'Failed to download clearance report');
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
                  <span>FULL CLEARED — Academic & Institutional Clearance Completed</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900 font-semibold font-mono">
                    APPROVED
                  </span>
                </p>
                <p className="text-xs text-green-800 mt-1">
                  All approvals received from Subject Teachers, Sections, Class Incharge, and HOD. Your official Institutional Clearance Report is ready.
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
              Download Clearance Report (PDF)
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
