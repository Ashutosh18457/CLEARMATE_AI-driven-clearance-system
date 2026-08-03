const VARIANTS = {
  primary:
    'bg-brand text-white hover:bg-brand-hover focus:ring-brand/30',
  secondary:
    'bg-surface text-ink-primary border border-border-subtle hover:bg-canvas focus:ring-brand/20',
  danger:
    'bg-status-rejected text-white hover:bg-red-600 focus:ring-red-300',
  ghost:
    'bg-transparent text-ink-secondary hover:bg-canvas hover:text-ink-primary focus:ring-brand/20',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

/**
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.icon]
 * @param {string} [props.className]
 * @param {Function} [props.onClick]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-md
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
