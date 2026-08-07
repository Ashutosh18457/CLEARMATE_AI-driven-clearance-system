import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { HiBell, HiSparkles } from 'react-icons/hi2';
import api from '../api/axios';

const DashboardLayout = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        if (res.data.success) {
          setUnreadCount(res.data.data.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread notifications', err);
      }
    };
    fetchUnread();
  }, []);

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-surface-800 bg-surface-900/50 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-full text-xs font-semibold uppercase tracking-wider">
              {user?.role?.replace('_', ' ')}
            </span>
            <span className="text-surface-500 text-sm font-medium">
              S.B. Jain Institute of Technology, Management & Research
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification badge button */}
            <div className="relative">
              <button className="p-2.5 rounded-xl bg-surface-800 text-surface-300 hover:text-white hover:bg-surface-700 transition-all">
                <HiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs font-extrabold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page View */}
        <main className="p-8 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
