import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiSquares2X2,
  HiDocumentCheck,
  HiShieldCheck,
  HiChatBubbleLeftRight,
  HiAcademicCap,
  HiUserGroup,
  HiCalendarDays,
  HiClipboardDocumentList,
  HiChartBar,
  HiArrowRightOnRectangle,
  HiBell,
} from 'react-icons/hi2';

const roleMenus = {
  student: [
    { path: '/dashboard', label: 'Dashboard', icon: HiSquares2X2 },
    { path: '/dashboard/submissions', label: 'My Submissions', icon: HiDocumentCheck },
    { path: '/dashboard/clearance', label: 'My Clearance', icon: HiShieldCheck },
    { path: '/dashboard/chatbot', label: 'AI Assistant', icon: HiChatBubbleLeftRight },
  ],
  teacher: [
    { path: '/dashboard', label: 'Dashboard', icon: HiSquares2X2 },
    { path: '/dashboard/submissions-review', label: 'Submission Verification', icon: HiDocumentCheck },
    { path: '/dashboard/clearance-review', label: 'Clearance Approvals', icon: HiShieldCheck },
  ],
  section_head: [
    { path: '/dashboard', label: 'Department Approvals', icon: HiShieldCheck },
  ],
  class_incharge: [
    { path: '/dashboard', label: 'Class Approvals', icon: HiShieldCheck },
  ],
  hod: [
    { path: '/dashboard', label: 'HOD Approvals', icon: HiShieldCheck },
    { path: '/dashboard/analytics', label: 'Analytics & Risk', icon: HiChartBar },
  ],
  admin: [
    { path: '/dashboard', label: 'System Overview', icon: HiSquares2X2 },
    { path: '/dashboard/users', label: 'Manage Users', icon: HiUserGroup },
    { path: '/dashboard/semesters', label: 'Programs & Semesters', icon: HiCalendarDays },
    { path: '/dashboard/clearance-items', label: 'Clearance Rules', icon: HiClipboardDocumentList },
    { path: '/dashboard/analytics', label: 'System Analytics', icon: HiChartBar },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navItems = roleMenus[user?.role] || [];

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-surface-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-lg shadow-glow">
            CM
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-wide">ClearMate</h1>
            <p className="text-xs text-primary-400 font-medium capitalize">{user?.role?.replace('_', ' ')} Portal</p>
          </div>
        </div>

        {/* User Info Pill */}
        <div className="mx-4 my-4 p-3 bg-surface-800/60 rounded-xl border border-surface-700/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-600/20 text-primary-400 font-bold flex items-center justify-center border border-primary-500/30">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-surface-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="px-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-glow'
                      : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer logout */}
      <div className="p-4 border-t border-surface-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200"
        >
          <HiArrowRightOnRectangle className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
