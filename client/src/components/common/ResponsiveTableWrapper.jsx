import React from 'react';
import { HiOutlineArrowsRightLeft } from 'react-icons/hi2';

/**
 * ResponsiveTableWrapper
 * Non-intrusive wrapper that provides mobile-friendly touch scrolling,
 * subtle swipe indicator for small screens, and prevents table clipping.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @param {boolean} [props.showSwipeHint=true]
 */
export default function ResponsiveTableWrapper({
  children,
  className = '',
  showSwipeHint = false,
}) {
  return (
    <div className={`w-full relative ${className}`}>
      {showSwipeHint && (
        <div className="flex sm:hidden items-center gap-1 text-[11px] text-ink-muted mb-1.5 px-1 font-medium">
          <HiOutlineArrowsRightLeft className="w-3.5 h-3.5" />
          <span>Swipe horizontally to view all columns</span>
        </div>
      )}
      <div className="w-full overflow-x-auto touch-scroll custom-scrollbar">
        {children}
      </div>
    </div>
  );
}
