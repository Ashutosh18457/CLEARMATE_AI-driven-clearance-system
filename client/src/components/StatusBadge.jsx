import React from 'react';

const statusConfig = {
  // Submission / Item / Section statuses
  approved: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  verified: { label: 'Verified', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  
  pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  submitted: { label: 'Submitted', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  initiated: { label: 'Initiated', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },

  items_review: { label: 'Teacher Review', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  sections_review: { label: 'Department Review', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  ci_review: { label: 'Class Incharge', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  hod_review: { label: 'HOD Review', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },

  rejected: { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  overdue: { label: 'Overdue', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },

  high: { label: 'High Risk', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  medium: { label: 'Medium Risk', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  low: { label: 'Low Risk', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status?.toLowerCase()] || {
    label: status || 'Unknown',
    bg: 'bg-surface-500/10',
    text: 'text-surface-400',
    border: 'border-surface-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.text.replace('text-', 'bg-')}`}></span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
