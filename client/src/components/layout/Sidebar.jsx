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
  HiOutlineCog6Tooth,
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
    { to: '/student/submissions', icon: HiOutlineDocumentText, label: 'Submissions' },
    { to: '/student/clearance', icon: HiOutlineClipboardDocumentCheck, label: 'Clearance Pipeline' },
    { to: '/student/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Report' },
  ],
  [ROLES.TEACHER]: [
    { to: '/teacher', icon: HiOutlineHome, label: 'Dashboard', end: true },
    { to: '/teacher/submission-items', icon: HiOutlineDocumentText, label: 'Submission Items' },
    { to: '/teacher/student-submissions', icon: HiOutlineClipboardDocumentList, label: 'Student Submissions' },
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
    { to: '/admin/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Reports' },
    { to: '/admin/faculty-config', icon: HiOutlineCog6Tooth, label: 'Faculty & Subject Mapping' },
    { to: '/admin/programs', icon: HiOutlineAcademicCap, label: 'College Programs' },
    { to: '/admin/bulk-setup', icon: HiOutlineCloudArrowUp, label: 'Bulk Setup' },
    { to: '/admin/users', icon: HiOutlineUsers, label: 'Admins & Staff' },
    { to: '/super-admin/audit', icon: HiOutlineClipboardDocumentList, label: 'System Audit Logs' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', icon: HiOutlineHome, label: 'Dashboard', end: true },
    { to: '/admin/clearance-report', icon: HiOutlineBuildingLibrary, label: 'Clearance Reports' },
    { to: '/admin/faculty-config', icon: HiOutlineCog6Tooth, label: 'Faculty & Subject Mapping' },
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
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-brand-50 text-brand border-r-2 border-brand'
        : 'text-ink-secondary hover:bg-canvas hover:text-ink-primary'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border-subtle shrink-0">
        <img src={logoIcon} alt="ClearMate" className="h-10 w-auto object-contain shrink-0" />
        {!collapsed && (
          <span className="text-xl font-extrabold text-ink-primary tracking-wide font-display">
            CLEARMATE
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            end={item.end}
            className={linkClasses}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-border-subtle p-3 shrink-0">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-ink-primary truncate">{user?.name}</p>
            <p className="text-xs text-ink-muted truncate">{ROLE_LABELS[user?.role]}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-ink-secondary hover:bg-red-50 hover:text-status-rejected transition-colors duration-150 w-full"
        >
          <HiOutlineArrowRightOnRectangle className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
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
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-surface border-r border-border-subtle transition-all duration-200 ${
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
