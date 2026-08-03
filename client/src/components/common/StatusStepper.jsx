import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import { CLEARANCE_STAGES } from '../../utils/constants';

/**
 * StatusStepper — the signature visual element of ClearMate.
 * Shows the clearance progress through all stages as connected nodes.
 *
 * @param {Object} props
 * @param {string} props.status - Current status of the clearance request
 * @param {string} [props.remarks] - Rejection remarks (shown when rejected)
 */
export default function StatusStepper({ status, remarks }) {
  const isRejected = status === 'rejected';

  // Find the index of the current stage
  const currentIndex = CLEARANCE_STAGES.findIndex((s) => s.key === status);

  const getStepState = (index) => {
    if (isRejected) {
      // When rejected, we don't know exactly which stage rejected,
      // so show all as neutral except mark the stepper as rejected
      return 'neutral';
    }
    if (currentIndex === -1) return 'neutral';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="w-full">
      {/* Rejected banner */}
      {isRejected && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <div className="flex items-start gap-2">
            <HiOutlineXCircle className="w-5 h-5 text-status-rejected shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Clearance Rejected</p>
              {remarks && (
                <p className="text-sm text-red-600 mt-1">{remarks}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal stepper for md+ screens */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between relative">
          {/* Connection line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border-subtle" />
          {!isRejected && currentIndex > 0 && (
            <div
              className="absolute top-4 left-0 h-0.5 bg-status-success transition-all duration-500"
              style={{
                width: `${(Math.min(currentIndex, CLEARANCE_STAGES.length - 1) / (CLEARANCE_STAGES.length - 1)) * 100}%`,
              }}
            />
          )}

          {CLEARANCE_STAGES.map((stage, index) => {
            const state = getStepState(index);
            return (
              <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ flex: '1 1 0' }}>
                {/* Node */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    state === 'completed'
                      ? 'bg-status-success border-status-success'
                      : state === 'active'
                      ? 'bg-brand border-brand ring-4 ring-brand/15'
                      : isRejected
                      ? 'bg-red-50 border-red-200'
                      : 'bg-surface border-border-subtle'
                  }`}
                >
                  {state === 'completed' ? (
                    <HiOutlineCheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={`text-xs font-semibold ${
                        state === 'active'
                          ? 'text-white'
                          : isRejected
                          ? 'text-status-rejected'
                          : 'text-ink-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-xs font-medium text-center leading-tight ${
                    state === 'completed'
                      ? 'text-status-success'
                      : state === 'active'
                      ? 'text-brand'
                      : isRejected
                      ? 'text-status-rejected'
                      : 'text-ink-muted'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical stepper for mobile */}
      <div className="md:hidden space-y-0">
        {CLEARANCE_STAGES.map((stage, index) => {
          const state = getStepState(index);
          const isLast = index === CLEARANCE_STAGES.length - 1;
          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {/* Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${
                    state === 'completed'
                      ? 'bg-status-success border-status-success'
                      : state === 'active'
                      ? 'bg-brand border-brand'
                      : 'bg-surface border-border-subtle'
                  }`}
                >
                  {state === 'completed' ? (
                    <HiOutlineCheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <span
                      className={`text-xs font-semibold ${
                        state === 'active' ? 'text-white' : 'text-ink-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-8 ${
                      state === 'completed' ? 'bg-status-success' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </div>
              <div className="pt-1 pb-6">
                <p
                  className={`text-sm font-medium ${
                    state === 'completed'
                      ? 'text-status-success'
                      : state === 'active'
                      ? 'text-brand'
                      : 'text-ink-muted'
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
