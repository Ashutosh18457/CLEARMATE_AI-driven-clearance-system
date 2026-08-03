import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import NotificationBell from '../notifications/NotificationBell';
import { HiOutlineUser } from 'react-icons/hi2';

export default function Navbar({ title }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border-subtle">
      <div className="flex items-center justify-between h-16 px-6 md:px-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 pl-12 md:pl-0">
          <h1 className="text-xl font-semibold text-ink-primary">{title}</h1>
        </div>

        {/* Right side: notification bell + user */}
        <div className="flex items-center gap-4">
          <NotificationBell />

          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-border-subtle">
            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
              <HiOutlineUser className="w-4 h-4 text-brand" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-ink-primary leading-tight">{user?.name}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
