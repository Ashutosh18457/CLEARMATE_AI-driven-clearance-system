import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell } from 'react-icons/hi2';
import api from '../../api/axios';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count || 0);
    } catch {
      // Silently fail — notification count is not critical
    }
  }, []);

  // Fetch recent notifications for dropdown
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 5 } });
      setNotifications(res.data.data.notifications || res.data.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  const TYPE_COLORS = {
    success: 'bg-status-success',
    warning: 'bg-status-pending',
    error: 'bg-status-rejected',
    info: 'bg-brand',
    deadline: 'bg-status-pending',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-canvas transition-colors duration-150"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <HiOutlineBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-status-rejected text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border-subtle rounded-lg shadow-md z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-ink-primary">Notifications</h3>
            <button
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="text-xs text-brand hover:text-brand-hover font-medium"
            >
              View all
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="px-4 py-6 text-center">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-ink-muted">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  onClick={() => markAsRead(notif._id)}
                  className={`w-full text-left px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-canvas transition-colors duration-100 ${
                    !notif.isRead ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        TYPE_COLORS[notif.type] || 'bg-ink-muted'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
