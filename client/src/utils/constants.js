// ─── User Roles ───
export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  SECTION_HEAD: 'section_head',
  ACCOUNT_SECTION: 'account_section',
  BUS_SECTION: 'bus_section',
  LIBRARY_SECTION: 'library_section',
  DISCIPLINARY_SECTION: 'disciplinary_section',
  CLASS_INCHARGE: 'class_incharge',
  HOD: 'hod',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const ROLE_LABELS = {
  [ROLES.STUDENT]: 'Student',
  [ROLES.TEACHER]: 'Teacher',
  [ROLES.SECTION_HEAD]: 'Section Head',
  [ROLES.ACCOUNT_SECTION]: 'Account Section',
  [ROLES.BUS_SECTION]: 'Bus Section',
  [ROLES.LIBRARY_SECTION]: 'Library Section',
  [ROLES.DISCIPLINARY_SECTION]: 'Disciplinary Section',
  [ROLES.CLASS_INCHARGE]: 'Class Incharge',
  [ROLES.HOD]: 'HOD',
  [ROLES.ADMIN]: 'Department Admin',
};

// ─── Role → Dashboard route mapping ───
export const ROLE_DASHBOARD_ROUTES = {
  [ROLES.STUDENT]: '/student',
  [ROLES.TEACHER]: '/teacher',
  [ROLES.SECTION_HEAD]: '/section-head',
  [ROLES.ACCOUNT_SECTION]: '/account-section',
  [ROLES.BUS_SECTION]: '/bus-section',
  [ROLES.LIBRARY_SECTION]: '/library-section',
  [ROLES.DISCIPLINARY_SECTION]: '/disciplinary-section',
  [ROLES.CLASS_INCHARGE]: '/class-incharge',
  [ROLES.HOD]: '/hod',
  [ROLES.ADMIN]: '/admin',
  [ROLES.SUPER_ADMIN]: '/super-admin',
};

// ─── Clearance Request Statuses ───
export const CLEARANCE_STATUSES = {
  INITIATED: 'initiated',
  ITEMS_REVIEW: 'items_review',
  SECTIONS_REVIEW: 'sections_review',
  CI_REVIEW: 'ci_review',
  HOD_REVIEW: 'hod_review',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
};

export const CLEARANCE_STATUS_LABELS = {
  [CLEARANCE_STATUSES.INITIATED]: 'Initiated',
  [CLEARANCE_STATUSES.ITEMS_REVIEW]: 'Items Review',
  [CLEARANCE_STATUSES.SECTIONS_REVIEW]: 'Sections Review',
  [CLEARANCE_STATUSES.CI_REVIEW]: 'CI Review',
  [CLEARANCE_STATUSES.HOD_REVIEW]: 'HOD Review',
  [CLEARANCE_STATUSES.COMPLETED]: 'Completed',
  [CLEARANCE_STATUSES.REJECTED]: 'Rejected',
};

// Ordered stages for the stepper component
export const CLEARANCE_STAGES = [
  { key: 'initiated', label: 'Initiated' },
  { key: 'items_review', label: 'Items Review' },
  { key: 'sections_review', label: 'Sections Review' },
  { key: 'ci_review', label: 'CI Review' },
  { key: 'hod_review', label: 'HOD Review' },
  { key: 'completed', label: 'Completed' },
];

// ─── Submission Statuses ───
export const SUBMISSION_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const SUBMISSION_STATUS_LABELS = {
  [SUBMISSION_STATUSES.PENDING]: 'Pending',
  [SUBMISSION_STATUSES.SUBMITTED]: 'Submitted',
  [SUBMISSION_STATUSES.VERIFIED]: 'Verified',
  [SUBMISSION_STATUSES.REJECTED]: 'Rejected',
};

// ─── Item Clearance Statuses ───
export const ITEM_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// ─── Section Departments ───
export const DEPARTMENTS = {
  LIBRARY: 'library',
  ACCOUNTS: 'accounts',
  BUS: 'bus',
  DISCIPLINARY: 'disciplinary',
};

export const DEPARTMENT_LABELS = {
  [DEPARTMENTS.LIBRARY]: 'Library',
  [DEPARTMENTS.ACCOUNTS]: 'Accounts',
  [DEPARTMENTS.BUS]: 'Bus / Transport',
  [DEPARTMENTS.DISCIPLINARY]: 'Disciplinary Section',
};

// ─── Clearance Item Types ───
export const ITEM_TYPES = {
  THEORY: 'theory',
  LAB: 'lab',
  ELECTIVE: 'elective',
  SPECIAL: 'special',
};

export const ITEM_TYPE_LABELS = {
  [ITEM_TYPES.THEORY]: 'Theory',
  [ITEM_TYPES.LAB]: 'Lab',
  [ITEM_TYPES.ELECTIVE]: 'Elective',
  [ITEM_TYPES.SPECIAL]: 'Special',
};

// ─── Submission Item Types ───
export const SUBMISSION_ITEM_TYPES = {
  ASSIGNMENT: 'assignment',
  LAB_RECORD: 'lab_record',
  PROJECT: 'project',
  PRESENTATION: 'presentation',
  OTHER: 'other',
};

export const SUBMISSION_ITEM_TYPE_LABELS = {
  [SUBMISSION_ITEM_TYPES.ASSIGNMENT]: 'Assignment',
  [SUBMISSION_ITEM_TYPES.LAB_RECORD]: 'Lab Record',
  [SUBMISSION_ITEM_TYPES.PROJECT]: 'Project',
  [SUBMISSION_ITEM_TYPES.PRESENTATION]: 'Presentation',
  [SUBMISSION_ITEM_TYPES.OTHER]: 'Other',
};

// ─── Semester Types ───
export const SEMESTER_TYPES = {
  ODD: 'ODD',
  EVEN: 'EVEN',
};
