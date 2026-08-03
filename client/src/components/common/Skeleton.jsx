/**
 * Table skeleton loader — mimics a table layout during data fetching.
 *
 * @param {Object} props
 * @param {number} [props.rows=5]
 * @param {number} [props.columns=4]
 */
export default function Skeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface animate-pulse">
      {/* Header row */}
      <div className="bg-canvas border-b border-border-subtle px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="px-4 py-3.5 flex gap-4 border-b border-border-subtle last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 bg-gray-100 rounded flex-1"
              style={{ maxWidth: colIndex === 0 ? '40%' : '60%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
