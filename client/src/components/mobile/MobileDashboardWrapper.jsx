import React from 'react';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

/**
 * MobileDashboardWrapper
 * Provides an app-like container with glassmorphism, responsive width constraint,
 * safe-area padding for mobile notches, and optional bottom navigation.
 *
 * @param {Object} props
 * @param {string} [props.title='ClearMate ERP']
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.showBottomNav=true]
 * @param {React.ReactNode} [props.headerRight]
 * @param {string} [props.className='']
 */
export default function MobileDashboardWrapper({
  title = 'ClearMate ERP',
  subtitle,
  children,
  showBottomNav = true,
  headerRight,
  className = '',
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center selection:bg-blue-500 selection:text-white antialiased">
      {/* App frame container: centered, responsive max-w-md on desktop, full-width on mobile */}
      <div className={`w-full max-w-md min-h-screen bg-slate-50 border-x border-slate-200/80 flex flex-col relative shadow-xl ${className}`}>
        {/* Sticky Glassmorphic Header */}
        <MobileHeader title={title} subtitle={subtitle} headerRight={headerRight} />

        {/* Scrollable Dashboard Body */}
        <main className={`flex-1 px-4 py-4 space-y-4 touch-scroll ${showBottomNav ? 'pb-24' : 'pb-8'}`}>
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        {showBottomNav && <MobileBottomNav />}
      </div>
    </div>
  );
}
