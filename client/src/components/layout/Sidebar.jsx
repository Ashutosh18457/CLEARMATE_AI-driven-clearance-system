import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoIcon from '../../assets/logo.png';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUsers,
  HiOutlineAcademicCap,
  HiOutlineBuildingLibrary,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineUserGroup,
  HiOutlineRectangleStack,
  HiOutlineClipboardDocumentList,
  HiOutlineBookOpen,
  HiOutlineCloudArrowUp,
} from 'react-icons/hi2';

const NAV_ITEMS = {
  [ROLES.STUDENT]: [
    { to: '/student', icon: HiOutlineHome, label: 'Dashboard', end: true },

    { to: '/student/clearance', icon: HiOutlineClipboardDocumentCheck, label: 'Clearance Pipeline' },
    { to: '/student/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Report' },
  ],
  [ROLES.TEACHER]: [
    { to: '/teacher', icon: HiOutlineHome, label: 'Dashboard', end: true },

    { to: '/teacher/clearance-reviews', icon: HiOutlineClipboardDocumentCheck, label: 'Clearance Reviews' },
  ],
  [ROLES.SECTION_HEAD]: [
    { to: '/section-head', icon: HiOutlineHome, label: 'Dashboard', end: true },
  ],
  [ROLES.ACCOUNT_SECTION]: [
    { to: '/account-section', icon: HiOutlineHome, label: 'Dashboard', end: true },
  ],
  [ROLES.BUS_SECTION]: [
    { to: '/bus-section', icon: HiOutlineHome, label: 'Dashboard', end: true },
  ],
  [ROLES.LIBRARY_SECTION]: [
    { to: '/library-section', icon: HiOutlineHome, label: 'Dashboard', end: true },
  ],
  [ROLES.DISCIPLINARY_SECTION]: [
    { to: '/disciplinary-section', icon: HiOutlineHome, label: 'Dashboard', end: true },
  ],
  [ROLES.CLASS_INCHARGE]: [
    { to: '/class-incharge', icon: HiOutlineHome, label: 'Dashboard', end: true },
    { to: '/admin/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Student Reports' },
  ],
  [ROLES.HOD]: [
    { to: '/hod', icon: HiOutlineHome, label: 'Dashboard', end: true },
    { to: '/admin/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Reports' },
  ],
  [ROLES.SUPER_ADMIN]: [
    { to: '/super-admin', icon: HiOutlineHome, label: 'Overview', end: true },
    { to: '/admin/programs', icon: HiOutlineAcademicCap, label: 'College Programs' },
    { to: '/admin/users', icon: HiOutlineUsers, label: 'Admins & Staff' },
    { to: '/super-admin/audit', icon: HiOutlineClipboardDocumentList, label: 'System Audit Logs' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', icon: HiOutlineHome, label: 'Dashboard', end: true },
    { to: '/admin/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Reports' },
    { to: '/admin/bulk-setup', icon: HiOutlineCloudArrowUp, label: 'Bulk Setup' },
    { to: '/admin/semesters', icon: HiOutlineCalendarDays, label: 'Semesters' },
    { to: '/admin/clearance-items', icon: HiOutlineBookOpen, label: 'Clearance Subjects' },
    { to: '/admin/batches', icon: HiOutlineClipboardDocumentList, label: 'Lab Batches' },
    { to: '/admin/users', icon: HiOutlineUsers, label: 'Students & Faculty' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-blue-50/90 text-blue-700 font-bold border-l-3 border-blue-600 shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 shrink-0 bg-slate-50/50">
        <img src={logoIcon} alt="ClearMate" className="h-9 w-auto object-contain shrink-0" />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-base font-black text-slate-900 tracking-wider font-display leading-tight">
              CLEARMATE
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Academic ERP
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Navigation Menu
            </span>
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            end={item.end}
            className={linkClasses}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-slate-200 p-3 shrink-0 bg-slate-50/60">
        {!collapsed && (
          <div className="px-3 py-2 mb-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
            <p className="text-[11px] font-semibold text-blue-600 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
            {user?.enrollmentNo && (
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-medium">ID: {user.enrollmentNo}</p>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors duration-150 w-full"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-surface border border-border-subtle shadow-sm md:hidden"
        aria-label="Open navigation"
      >
        <HiOutlineBars3 className="w-5 h-5 text-ink-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-subtle transform transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-canvas"
          aria-label="Close navigation"
        >
          <HiOutlineXMark className="w-5 h-5 text-ink-muted" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col h-full z-30 bg-surface border-r border-border-subtle transition-all duration-200 shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface border border-border-subtle shadow-sm flex items-center justify-center hover:bg-canvas z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-3 h-3 text-ink-muted transition-transform duration-150 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
