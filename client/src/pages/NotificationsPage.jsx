import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import Skeleton from '../components/common/Skeleton';
import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineEnvelopeOpen,
} from 'react-icons/hi2';

const TYPE_COLORS = {
  success: 'bg-status-success',
  warning: 'bg-status-pending',
  error: 'bg-status-rejected',
  info: 'bg-brand',
  deadline: 'bg-status-pending',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page, limit: 20 } });
      const data = res.data.data;
      setNotifications(data.notifications || data || []);
      if (data.totalPages) setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete notification');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <DashboardLayout title="Notifications">
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">
          {notifications.filter((n) => !n.isRead).length} unread
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={markAllRead}
          loading={markingAll}
          icon={<HiOutlineEnvelopeOpen className="w-4 h-4" />}
        >
          Mark all as read
        </Button>
      </div>

      {/* Notification list */}
      {loading ? (
        <Skeleton rows={8} columns={3} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<HiOutlineBell className="w-10 h-10" />}
          title="No notifications"
          description="You're all caught up. Notifications about your clearance progress and submissions will appear here."
        />
      ) : (
        <div className="border border-border-subtle rounded-lg bg-surface divide-y divide-border-subtle overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`flex items-start gap-4 px-5 py-4 transition-colors duration-100 ${
                !notif.isRead ? 'bg-blue-50/30' : 'hover:bg-canvas/50'
              }`}
            >
              {/* Type indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  TYPE_COLORS[notif.type] || 'bg-ink-muted'
                }`}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm ${!notif.isRead ? 'font-medium' : 'font-normal'} text-ink-primary`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-ink-muted mt-0.5">{notif.message}</p>
                  </div>
                  <span className="text-xs text-ink-muted whitespace-nowrap shrink-0">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!notif.isRead && (
                  <button
                    onClick={() => markAsRead(notif._id)}
                    className="p-1.5 rounded-md text-ink-muted hover:text-status-success hover:bg-green-50 transition-colors duration-150"
                    title="Mark as read"
                  >
                    <HiOutlineCheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(notif._id)}
                  className="p-1.5 rounded-md text-ink-muted hover:text-status-rejected hover:bg-red-50 transition-colors duration-150"
                  title="Delete notification"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-ink-muted px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
