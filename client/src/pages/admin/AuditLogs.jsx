import { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineArrowPath,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import api from '../../api/axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;

      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.data?.logs || []);
      setTotalPages(res.data.data?.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (val) => (
        <span className="text-xs text-ink-muted font-mono whitespace-nowrap">
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'userId',
      label: 'User',
      render: (val) => (
        <div>
          <p className="text-xs font-semibold text-ink-primary">{val?.name || 'System / Guest'}</p>
          <p className="text-2xs text-ink-muted">{val?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (val) => {
        const isReject = val.includes('reject');
        const isApprove = val.includes('approve') || val.includes('completed');
        return (
          <span
            className={`px-2 py-0.5 rounded-md font-mono text-2xs font-semibold ${
              isReject
                ? 'bg-red-50 text-red-700 border border-red-200'
                : isApprove
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {val}
          </span>
        );
      },
    },
    {
      key: 'resource',
      label: 'Target Resource',
      render: (val, row) => (
        <span className="text-xs text-ink-secondary">
          {val || row.targetModel || 'General'}
        </span>
      ),
    },
    {
      key: 'ip',
      label: 'IP / Client',
      render: (val) => (
        <span className="text-2xs font-mono text-ink-muted">
          {val || '127.0.0.1'}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="System Audit Logs">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink-primary flex items-center gap-2">
            <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
            Institutional Audit & Security Trail
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Tamper-evident logs of clearance initiations, approvals, rejections, and administrative actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="input-base text-xs py-1.5 px-3 max-w-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            icon={<HiOutlineArrowPath className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-subtle rounded-xl shadow-xs overflow-hidden">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs found matching your criteria"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
