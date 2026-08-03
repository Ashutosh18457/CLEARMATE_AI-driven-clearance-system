/**
 * EmptyState — shown when a data view has no items to display.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - A button or link to show below
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-canvas flex items-center justify-center text-ink-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-ink-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
