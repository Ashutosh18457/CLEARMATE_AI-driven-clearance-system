import { useEffect, useRef } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer] - Action buttons at the bottom
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Trap focus and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative bg-surface rounded-lg shadow-md border border-border-subtle w-full ${sizeClasses[size]} max-h-[85vh] flex flex-col animate-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-ink-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-canvas transition-colors duration-150"
            aria-label="Close modal"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
