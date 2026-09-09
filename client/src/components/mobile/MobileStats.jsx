import React from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineDocumentCheck,
  HiOutlineAcademicCap,
} from 'react-icons/hi2';

/**
 * MobileStats
 * Horizontal scrollable statistics cards with snap alignment,
 * progress bars, and high-contrast metric badges.
 *
 * @param {Object} props
 * @param {Array<{label: string, value: string|number, total?: number, variant?: 'success'|'warning'|'danger'|'info', icon?: any}>} props.stats
 */
export default function MobileStats({ stats = [] }) {
  if (!stats.length) return null;

  const getVariantStyles = (variant = 'info') => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-50/80 border-emerald-200/80',
          text: 'text-emerald-800',
          num: 'text-emerald-700',
          iconBg: 'bg-emerald-500 text-white',
          bar: 'bg-emerald-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/80 border-amber-200/80',
          text: 'text-amber-800',
          num: 'text-amber-700',
          iconBg: 'bg-amber-500 text-white',
          bar: 'bg-amber-500',
        };
      case 'danger':
        return {
          bg: 'bg-rose-50/80 border-rose-200/80',
          text: 'text-rose-800',
          num: 'text-rose-700',
          iconBg: 'bg-rose-500 text-white',
          bar: 'bg-rose-500',
        };
      default:
        return {
          bg: 'bg-blue-50/80 border-blue-200/80',
          text: 'text-blue-800',
          num: 'text-blue-700',
          iconBg: 'bg-blue-600 text-white',
          bar: 'bg-blue-600',
        };
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 overflow-x-auto touch-scroll no-scrollbar py-1 snap-x snap-mandatory">
        {stats.map((item, idx) => {
          const styles = getVariantStyles(item.variant);
          const percentage =
            item.total && typeof item.value === 'number'
              ? Math.min(100, Math.round((item.value / item.total) * 100))
              : null;

          return (
            <div
              key={idx}
              className={`min-w-[150px] flex-1 snap-start p-3 rounded-xl border ${styles.bg} shadow-2xs flex flex-col justify-between transition-transform active:scale-[0.98]`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </span>
                {item.icon && (
                  <span className={`w-6 h-6 rounded-lg ${styles.iconBg} flex items-center justify-center text-xs shadow-2xs`}>
                    {item.icon}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black font-tabular tracking-tight ${styles.num}`}>
                  {item.value}
                </span>
                {item.total !== undefined && (
                  <span className="text-xs font-semibold text-slate-400 font-tabular">
                    /{item.total}
                  </span>
                )}
              </div>

              {percentage !== null && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${styles.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-0.5">
                    <span className="text-[9px] font-extrabold text-slate-500 font-tabular">
                      {percentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
