import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell, HiOutlineCheckCircle } from 'react-icons/hi2';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.count || 0);
    } catch {
      // Silently fail
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

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Real-time Socket.IO listener for live notification updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      const notif = data?.notification || data;
      if (notif) {
        setNotifications((prev) => [notif, ...prev.filter((n) => n._id !== notif._id).slice(0, 4)]);
        if (data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        } else {
          setUnreadCount((prev) => prev + 1);
        }
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

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

  const markAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch {
      // Silently fail
    }
  };

  const TYPE_COLORS = {
    success: 'bg-status-success',
    warning: 'bg-status-pending',
    error: 'bg-status-rejected',
    info: 'bg-brand',
    deadline: 'bg-amber-500',
    task: 'bg-indigo-600',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-canvas transition-colors duration-150"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <HiOutlineBell className="w-5 h-5" />
        {/* Real-time connection indicator badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-status-rejected text-white text-[10px] font-semibold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border-subtle rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-canvas/40">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-primary">Notifications</h3>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  Live
                </span>
              )}
            </div>
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
                  onClick={() => markAsRead(notif._id, notif.link)}
                  className={`w-full text-left px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-canvas transition-colors duration-100 ${
                    !notif.isRead ? 'bg-brand-50/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        TYPE_COLORS[notif.type] || 'bg-ink-muted'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-primary truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-ink-muted mt-1 block">
                        {new Date(notif.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
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
