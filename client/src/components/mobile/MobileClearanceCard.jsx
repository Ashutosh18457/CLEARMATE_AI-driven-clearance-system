import React from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineArrowPath,
  HiOutlineUser,
  HiOutlineChevronRight,
  HiOutlineChatBubbleBottomCenterText,
} from 'react-icons/hi2';

/**
 * MobileClearanceCard
 * Converts a table row of clearance into a touch-friendly mobile card.
 *
 * @param {Object} props
 * @param {string} props.title - Subject/Section name
 * @param {string} [props.code] - Subject code (e.g. CS601)
 * @param {string} props.status - 'approved' | 'pending' | 'rejected' | 'resubmitted' | etc.
 * @param {string} [props.assignedTo] - Teacher or Section incharge name
 * @param {string} [props.remarks] - Feedback or rejection note
 * @param {string} [props.date] - Updated date or timestamp
 * @param {React.ReactNode} [props.actionButton] - Custom action button or dropdown
 * @param {Function} [props.onClick] - Card tap handler
 */
export default function MobileClearanceCard({
  title,
  code,
  status = 'pending',
  assignedTo,
  remarks,
  date,
  actionButton,
  onClick,
}) {
  const normalizedStatus = (status || 'pending').toLowerCase();

  const getStatusBadge = () => {
    switch (normalizedStatus) {
      case 'approved':
      case 'cleared':
        return {
          label: 'Approved',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <HiOutlineXCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'resubmitted':
        return {
          label: 'Resubmitted',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: <HiOutlineArrowPath className="w-3.5 h-3.5 text-sky-600" />,
        };
      default:
        return {
          label: 'Pending',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <HiOutlineClock className="w-3.5 h-3.5 text-amber-600" />,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      onClick={onClick}
      className={`p-4 bg-white rounded-xl border border-slate-200 shadow-2xs transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-300 active:scale-[0.99]' : ''
      }`}
    >
      {/* Header Row: Subject Name + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">
              {title}
            </h3>
            {code && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {code}
              </span>
            )}
          </div>

          {assignedTo && (
            <p className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
              <HiOutlineUser className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{assignedTo}</span>
            </p>
          )}
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${badge.bg}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Remarks Note (If rejected or feedback given) */}
      {remarks && (
        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
          <HiOutlineChatBubbleBottomCenterText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 font-normal leading-relaxed">
            <strong className="font-semibold text-slate-700">Remarks: </strong>
            {remarks}
          </p>
        </div>
      )}

      {/* Footer Row: Date / Action Button */}
      {(date || actionButton || onClick) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          {date ? (
            <span className="text-[11px] text-slate-400 font-medium font-tabular">
              Updated: {new Date(date).toLocaleDateString()}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            {actionButton}
            {onClick && !actionButton && (
              <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
