import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { HiOutlineInboxStack } from 'react-icons/hi2';

/**
 * Reusable data table with sticky header, pagination, loading/empty states.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, render?: Function, align?: 'left'|'center'|'right'}>} props.columns
 * @param {Array<Object>} props.data
 * @param {boolean} [props.loading=false]
 * @param {string} [props.emptyMessage='No data found']
 * @param {React.ReactNode} [props.emptyIcon]
 * @param {{page: number, totalPages: number, onPageChange: Function}} [props.pagination]
 * @param {string} [props.rowKey='_id'] - Key to use for row keys
 */
export default function Table({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  pagination,
  rowKey = '_id',
}) {
  if (loading) {
    return <Skeleton rows={6} columns={columns.length} />;
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={emptyIcon || <HiOutlineInboxStack className="w-10 h-10" />}
        title={emptyMessage}
        description="There is nothing to display right now."
      />
    );
  }

  const alignClass = (align) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-canvas border-b border-border-subtle">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-ink-muted uppercase tracking-wider ${alignClass(col.align)}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row, rowIndex) => (
              <tr
                key={row[rowKey] || rowIndex}
                className="hover:bg-canvas/50 transition-colors duration-100"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-ink-primary ${alignClass(col.align)}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-canvas/50">
          <p className="text-xs text-ink-muted">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Previous page"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
              aria-label="Next page"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
