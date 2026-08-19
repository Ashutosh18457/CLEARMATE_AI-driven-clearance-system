import { useState, useEffect, useCallback } from 'react';
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
} from 'react-icons/hi2';
import { CLEARANCE_STATUS_LABELS, DEPARTMENT_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';

export default function StudentClearance() {
  const { user } = useAuth();
  const [clearance, setClearance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [noClearance, setNoClearance] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const fetchClearance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/clearances/my');
      if (res.data.data) {
        setClearance(res.data.data);
        setNoClearance(false);
      } else {
        setNoClearance(true);
      }
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
    const semId = user?.currentSemester?._id || user?.currentSemester;
    const isValidObjectId = typeof semId === 'string' && semId.length === 24;
    setInitiating(true);
    try {
      const payload = isValidObjectId ? { semesterId: semId } : {};
      await api.post('/clearances/initiate', payload);
      toast.success('Clearance initiated successfully');
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
                border: 8px double #4f46e5;
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
                color: #4f46e5;
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
                color: #4f46e5;
                border-bottom: 2px solid #e5e7eb;
                display: inline-block;
                padding-bottom: 4px;
                margin: 8px 0;
              }
              .details-grid {
                display: grid;
                grid-template-cols: 1fr 1fr;
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
                  border-color: #4f46e5 !important;
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
              <div class="title">Clearance Certificate</div>
              <div class="subtitle font-display">${data.institution}</div>
              
              <div class="certify-text">
                This is to certify that the student<br>
                <div class="student-name">${data.student.name}</div><br>
                has successfully cleared all dues and completed the academic clearance process.
              </div>

              <div class="details-grid">
                <div><strong>Enrollment No:</strong> ${data.student.enrollmentNo}</div>
                <div><strong>Section:</strong> ${data.student.section}</div>
                <div><strong>Program:</strong> ${data.program.name}</div>
                <div><strong>Semester:</strong> Semester ${data.semester.number}</div>
                <div><strong>Academic Year:</strong> ${data.semester.academicYear}</div>
                <div><strong>Completed On:</strong> ${new Date(data.clearance.completedAt).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'})}</div>
              </div>

              <div class="footer-signatures">
                <div class="signature">Class Incharge</div>
                <div class="signature">HOD, Dept. of ET</div>
                <div class="signature">Principal / Registrar</div>
              </div>

              <div class="cert-meta">
                <div>Certificate No: <strong>${data.certificateNumber}</strong></div>
                <div>Verification URL: <strong>${data.verificationUrl}</strong></div>
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

  if (noClearance) {
    return (
      <DashboardLayout title="Clearance Status">
        <EmptyState
          icon={<HiOutlineClipboardDocumentCheck className="w-10 h-10" />}
          title="No clearance initiated yet"
          description="Start your clearance process to get approvals from your teachers, section heads, class incharge, and HOD."
          action={
            <Button variant="primary" onClick={handleInitiate} loading={initiating}>
              Initiate clearance
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  const { status, itemClearances = [], sectionClearances = [] } = clearance;
  const rejectionRemarks =
    itemClearances.find((i) => i.status === 'rejected')?.remarks ||
    sectionClearances.find((s) => s.status === 'rejected')?.remarks ||
    clearance.remarks ||
    '';

  const itemColumns = [
    {
      key: 'itemTitle',
      label: 'Item',
      render: (val) => <span className="text-sm font-medium text-ink-primary">{val}</span>,
    },
    {
      key: 'itemType',
      label: 'Type',
      render: (val) => <Badge variant="default">{ITEM_TYPE_LABELS[val] || val}</Badge>,
    },
    {
      key: 'teacherId',
      label: 'Teacher',
      render: (_, row) => (
        <span className="text-sm text-ink-secondary">
          {row.teacherId?.name || row.teacher?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={getStatusVariant(val)}>
          {val === 'pending' ? 'Pending' : val === 'approved' ? 'Approved' : 'Rejected'}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (val) => (
        <span className="text-sm text-ink-muted">{val || '—'}</span>
      ),
    },
  ];

  const sectionColumns = [
    {
      key: 'department',
      label: 'Department',
      render: (val) => (
        <span className="text-sm font-medium text-ink-primary">
          {DEPARTMENT_LABELS[val] || val}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
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
    <DashboardLayout title="Clearance Status">
      {/* Completed banner */}
      {status === 'completed' && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <HiOutlineCheckBadge className="w-6 h-6 text-status-success shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Clearance completed</p>
              <p className="text-sm text-green-700 mt-0.5">
                All approvals received. You can download your clearance certificate.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="ml-auto shrink-0"
              icon={<HiOutlineDocumentArrowDown className="w-4 h-4" />}
              loading={downloadingCert}
              onClick={handleDownloadCertificate}
            >
              Download certificate
            </Button>
          </div>
        </div>
      )}

      {/* Status stepper */}
      <div className="bg-surface border border-border-subtle rounded-lg p-6 mb-6">
        <h2 className="text-base font-semibold text-ink-primary mb-5">Progress</h2>
        <StatusStepper status={status} remarks={rejectionRemarks} />
      </div>

      {/* Re-initiate button for rejected clearances */}
      {status === 'rejected' && (
        <div className="mb-6">
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

      {/* Item clearances */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-ink-primary mb-3">Item Clearances</h2>
        <Table
          columns={itemColumns}
          data={itemClearances}
          loading={false}
          emptyMessage="No item clearances"
        />
      </div>

      {/* Section clearances */}
      <div>
        <h2 className="text-base font-semibold text-ink-primary mb-3">Section Clearances</h2>
        <Table
          columns={sectionColumns}
          data={sectionClearances}
          loading={false}
          emptyMessage="No section clearances"
        />
      </div>
    </DashboardLayout>
  );
}
