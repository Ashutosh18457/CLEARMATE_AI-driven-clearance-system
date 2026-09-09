import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../notifications/NotificationBell';
import logoIcon from '../../assets/logo.png';
import { ROLE_LABELS } from '../../utils/constants';

/**
 * MobileHeader
 * Sticky, glassmorphism header with institutional branding,
 * real-time socket connectivity indicator, and user status capsule.
 */
export default function MobileHeader({ title = 'ClearMate ERP', subtitle, headerRight }) {
  const { user } = useAuth();
  const { isConnected } = useSocket() || {};

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img src={logoIcon} alt="ClearMate" className="w-8 h-8 object-contain rounded-lg shadow-2xs" />
            {/* Live Socket Status Dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              title={isConnected ? 'Real-time connected' : 'Connecting...'}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                {title}
              </h1>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded-sm shrink-0">
                {ROLE_LABELS[user?.role] || user?.role || 'ERP'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 truncate leading-none mt-0.5">
              {subtitle || (user?.name ? `Signed in as ${user.name}` : 'Student Clearance Portal')}
            </p>
          </div>
        </div>

        {/* Right Actions: Notification Bell or Custom Action */}
        <div className="flex items-center gap-2 shrink-0">
          {headerRight || <NotificationBell />}
        </div>
      </div>
    </header>
  );
}
