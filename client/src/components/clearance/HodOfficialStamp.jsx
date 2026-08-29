import React from 'react';
import { HiCheckBadge } from 'react-icons/hi2';

/**
 * Dynamic HOD Official University Stamp & Seal Component
 * Changes dynamically based on department, HOD name, and approval status.
 */
export default function HodOfficialStamp({
  hodName = 'Dr. Kulkarni',
  department = 'Computer Science & Engineering',
  departmentCode = 'CSE',
  approved = true,
  date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  size = 'md', // 'sm', 'md', 'lg'
  isPending = false,
}) {
  const sizeStyles = {
    sm: 'w-28 h-28 text-[9px]',
    md: 'w-36 h-36 text-[10px]',
    lg: 'w-44 h-44 text-xs',
  };

  const stampColor = isPending
    ? 'border-amber-600/70 text-amber-700 bg-amber-50/40'
    : 'border-blue-800/85 text-blue-900 bg-blue-50/30';

  const cleanDept = (departmentCode || department || 'CSE').toUpperCase();
  const cleanHodName = (hodName || 'HOD Incharge').toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none font-sans transition-transform duration-200 transform -rotate-3 hover:rotate-0 ${
        sizeStyles[size] || sizeStyles.md
      }`}
      title={`${cleanHodName} Official Seal — ${cleanDept}`}
    >
      {/* Outer Double Ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 border-dashed ${
          isPending ? 'border-amber-500' : 'border-blue-700'
        } opacity-80 animate-spin-slow`}
        style={{ animationDuration: '60s' }}
      />
      <div
        className={`absolute inset-1 rounded-full border-2 ${
          isPending ? 'border-amber-700' : 'border-blue-900'
        } ${stampColor} shadow-inner flex flex-col items-center justify-between p-2 text-center`}
      >
        {/* Top Arc Text */}
        <div className="text-[8.5px] font-extrabold tracking-wider leading-none uppercase pt-0.5 opacity-90">
          ★ S.B. JAIN INST. OF TECH ★
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center justify-center my-auto px-1">
          <div className="flex items-center gap-0.5 justify-center">
            <span className="text-[7.5px] font-bold tracking-widest text-slate-600">DEPT. OF</span>
          </div>
          <div className="font-extrabold tracking-tight text-[11px] leading-tight max-w-[110px] truncate text-center">
            {cleanDept}
          </div>

          <div
            className={`my-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase rounded tracking-wider border ${
              isPending
                ? 'bg-amber-100/90 text-amber-900 border-amber-400'
                : 'bg-blue-900 text-white border-blue-900 shadow-sm'
            }`}
          >
            {isPending ? 'VERIFICATION DUE' : 'OFFICIALLY APPROVED'}
          </div>

          <div className="text-[9px] font-bold tracking-tight truncate max-w-[110px] text-slate-800">
            {cleanHodName}
          </div>
          <div className="text-[7.5px] font-semibold text-slate-500 tracking-tighter">
            HEAD OF DEPARTMENT
          </div>
        </div>

        {/* Bottom Date / Ref */}
        <div className="text-[7.5px] font-bold tracking-widest leading-none border-t border-current/30 pt-0.5 w-full text-center">
          {date} • NAGPUR
        </div>
      </div>
    </div>
  );
}
