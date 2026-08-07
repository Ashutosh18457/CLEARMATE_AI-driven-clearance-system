import React from 'react';
import { HiCheck, HiClock, HiXMark } from 'react-icons/hi2';

const stages = [
  { id: 'items', label: '1. Subject Teachers' },
  { id: 'sections', label: '2. Departments' },
  { id: 'class_incharge', label: '3. Class Incharge' },
  { id: 'hod', label: '4. HOD Final' },
];

const stageOrder = {
  items_review: 0,
  sections_review: 1,
  ci_review: 2,
  hod_review: 3,
  completed: 4,
  rejected: -1,
};

const StageProgress = ({ currentStage, status }) => {
  const currentIdx = status === 'completed' ? 4 : (stageOrder[status] ?? 0);
  const isRejected = status === 'rejected';

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-800 -z-0"></div>

        {/* Progress Line */}
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 transition-all duration-500 -z-0 ${
            isRejected ? 'bg-rose-500' : 'bg-primary-500'
          }`}
          style={{ width: `${Math.min(100, (currentIdx / (stages.length - 1)) * 100)}%` }}
        ></div>

        {stages.map((stage, idx) => {
          const isDone = currentIdx > idx;
          const isCurrent = currentIdx === idx && !isRejected;
          const isCurrentRejected = isRejected && currentIdx === idx;

          return (
            <div key={stage.id} className="flex flex-col items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isDone
                    ? 'bg-primary-600 text-white shadow-glow ring-4 ring-primary-950'
                    : isCurrent
                    ? 'bg-amber-500 text-surface-950 animate-pulse ring-4 ring-amber-950'
                    : isCurrentRejected
                    ? 'bg-rose-600 text-white ring-4 ring-rose-950'
                    : 'bg-surface-800 text-surface-400 border border-surface-700'
                }`}
              >
                {isDone ? (
                  <HiCheck className="w-5 h-5 text-white" />
                ) : isCurrentRejected ? (
                  <HiXMark className="w-5 h-5 text-white" />
                ) : isCurrent ? (
                  <HiClock className="w-5 h-5 text-surface-950" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-xs font-semibold mt-2 ${
                  isDone
                    ? 'text-primary-400'
                    : isCurrent
                    ? 'text-amber-400'
                    : isCurrentRejected
                    ? 'text-rose-400'
                    : 'text-surface-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageProgress;
