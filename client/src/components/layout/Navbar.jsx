import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ROLE_LABELS } from '../../utils/constants';
import NotificationBell from '../notifications/NotificationBell';
import { HiOutlineUser, HiOutlineAcademicCap } from 'react-icons/hi2';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const { isConnected } = useSocket() || {};

  return (
    <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 md:px-8">
        {/* Left side: Page Title & Breadcrumb context */}
        <div className="flex flex-col justify-center pl-12 md:pl-0 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <HiOutlineAcademicCap className="w-3.5 h-3.5 text-brand" />
              ERP Portal
            </span>
            <span className="hidden sm:inline text-border-subtle">/</span>
            <h1 className="text-base sm:text-lg font-bold text-ink-primary truncate tracking-tight">{title}</h1>
          </div>
        </div>

        {/* Right side: Session badge + notification bell + user ERP profile */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Academic Session Pill (Real ERP feel) */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AY 2024-25 | Even Sem</span>
          </div>

          <NotificationBell />

          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-border-subtle">
            <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-sm text-brand shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <HiOutlineUser className="w-4 h-4 text-brand" />}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-ink-primary leading-tight truncate max-w-[150px]">{user?.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="text-[11px] font-medium text-brand bg-brand-50 px-1.5 py-0.2 rounded">
                  {ROLE_LABELS[user?.role] || user?.role}
                </span>
                {user?.enrollmentNo && (
                  <span className="text-[10px] text-ink-muted font-tabular">
                    • {user.enrollmentNo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

