const VARIANTS = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  default: 'bg-gray-50 text-gray-600 border border-gray-200',
};

/**
 * @param {Object} props
 * @param {'success'|'pending'|'rejected'|'info'|'default'} [props.variant='default']
 * @param {React.ReactNode} props.children
 */
export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium leading-tight ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Helper to map common status strings to badge variants.
 */
export function getStatusVariant(status) {
  switch (status) {
    case 'approved':
    case 'verified':
    case 'completed':
      return 'success';
    case 'pending':
    case 'initiated':
    case 'submitted':
    case 'items_review':
    case 'sections_review':
    case 'ci_review':
    case 'hod_review':
      return 'pending';
    case 'rejected':
      return 'rejected';
    default:
      return 'default';
  }
}
