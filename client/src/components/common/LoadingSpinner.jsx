/**
 * Full-page loading spinner — used during initial auth verification.
 */
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    </div>
  );
}
