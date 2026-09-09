import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_DASHBOARD_ROUTES } from '../../utils/constants';
import {
  HiOutlineHome,
  HiOutlineClipboardDocumentCheck,
  HiOutlineDocumentChartBar,
  HiOutlineBell,
  HiOutlineUserCircle,
} from 'react-icons/hi2';

/**
 * MobileBottomNav
 * Fixed mobile app bottom tab bar with dynamic role links and active states.
 */
export default function MobileBottomNav() {
  const { user } = useAuth();
  const role = user?.role || ROLES.STUDENT;

  // Compute dynamic navigation items based on user role
  const getNavLinks = () => {
    const dashboardPath = ROLE_DASHBOARD_ROUTES[role] || '/student';

    if (role === ROLES.STUDENT) {
      return [
        { to: dashboardPath, icon: HiOutlineHome, label: 'Home', end: true },
        { to: '/student/clearance', icon: HiOutlineClipboardDocumentCheck, label: 'Pipeline' },
        { to: '/student/clearance-report', icon: HiOutlineDocumentChartBar, label: 'Report' },
        { to: '/notifications', icon: HiOutlineBell, label: 'Alerts' },
      ];
    }

    if (role === ROLES.TEACHER) {
      return [
        { to: dashboardPath, icon: HiOutlineHome, label: 'Home', end: true },
        { to: '/teacher/clearance-reviews', icon: HiOutlineClipboardDocumentCheck, label: 'Reviews' },
        { to: '/notifications', icon: HiOutlineBell, label: 'Alerts' },
      ];
    }

    // Admins / Heads / Officers
    return [
      { to: dashboardPath, icon: HiOutlineHome, label: 'Home', end: true },
      { to: '/admin/clearance-report', icon: HiOutlineDocumentChartBar, label: 'Reports' },
      { to: '/notifications', icon: HiOutlineBell, label: 'Alerts' },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 safe-bottom">
      <div className="flex items-center justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors tap-target ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 leading-none">
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
