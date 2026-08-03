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
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowDown,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';
import { CLEARANCE_STATUS_LABELS, DEPARTMENT_LABELS, ITEM_TYPE_LABELS } from '../../utils/constants';

export default function StudentClearance() {
  const [clearance, setClearance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [noClearance, setNoClearance] = useState(false);

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
    setInitiating(true);
    try {
      await api.post('/clearances/initiate');
      toast.success('Clearance initiated successfully');
      fetchClearance();
    } catch (err) {
      toast.error(err.message || 'Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const handleReInitiate = async () => {
    setInitiating(true);
    try {
      await api.post('/clearances/initiate');
      toast.success('Clearance re-initiated — previous records cleared');
      fetchClearance();
    } catch (err) {
      toast.error(err.message || 'Failed to re-initiate clearance');
    } finally {
      setInitiating(false);
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
      render: (val) => (
        <Badge variant={getStatusVariant(val)}>
          {val === 'pending' ? 'Pending' : val === 'approved' ? 'Approved' : 'Rejected'}
        </Badge>
      ),
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
      render: (val) => (
        <span className="text-sm text-ink-muted">{val || '—'}</span>
      ),
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
              onClick={() => toast('Certificate generation coming soon', { icon: '📄' })}
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
