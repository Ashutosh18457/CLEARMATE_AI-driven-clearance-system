import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * MobileActions
 * Touch-friendly grid of action buttons with quick navigation or modal triggers.
 *
 * @param {Object} props
 * @param {Array<{label: string, description?: string, icon: any, to?: string, onClick?: Function, color?: string, badge?: string|number}>} props.actions
 * @param {string} [props.title]
 */
export default function MobileActions({ actions = [], title = 'Quick Actions' }) {
  const navigate = useNavigate();

  if (!actions.length) return null;

  const handleClick = (action) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.to) {
      navigate(action.to);
    }
  };

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </h2>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              onClick={() => handleClick(act)}
              className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs text-left transition-all active:scale-[0.97] tap-target group relative overflow-hidden"
            >
              {/* Top Row: Icon + optional Badge */}
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                    act.color || 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                </div>

                {act.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {act.badge}
                  </span>
                )}
              </div>

              {/* Action Title & Subtext */}
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                {act.label}
              </span>
              {act.description && (
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                  {act.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
