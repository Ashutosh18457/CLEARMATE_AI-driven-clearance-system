import React, { useState, useEffect } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';

function ClearanceBadge({ label }) {
  if (label === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
      <HiOutlineXCircle className="w-3.5 h-3.5" />
      Not Approved
    </span>
  );
}

export default function AdminClearanceReport() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Load available programs
  useEffect(() => {
    api.get('/admin/programs')
      .then((res) => setPrograms(res.data.data || []))
      .catch(() => {});
  }, []);

  const canFetch = selectedProgram && selectedSemester;

  const fetchRoster = async () => {
    if (!canFetch) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({
        semesterNumber: selectedSemester,
        programId: selectedProgram,
      });
      const res = await api.get(`/clearances/hod/class-list?${params}`);
      setResult(res.data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when both dropdowns are selected
  useEffect(() => {
    if (canFetch) fetchRoster();
    else setResult(null);
  }, [selectedProgram, selectedSemester]);

  // Filter by search query client-side
  const displayedStudents = result
    ? searchQuery.trim()
      ? result.students.filter(
          (s) =>
            s.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : result.students
    : [];

  return (
    <DashboardLayout title="Student Clearance Status">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h1 className="text-lg font-bold text-ink-primary">Student Clearance Status</h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Select a program and semester to view clearance approval status for students in that class.
            </p>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-end pt-2">
            {/* Program Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-secondary">Program / Batch *</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="input-base text-sm min-w-[220px]"
              >
                <option value="">-- Select Program --</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-secondary">Semester *</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="input-base text-sm min-w-[160px]"
              >
                <option value="">-- Select Semester --</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    Semester {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Search Box */}
            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-ink-secondary">
                Search by Roll No. / Enrollment No. (optional)
              </label>
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type roll number or name..."
                  className="input-base text-sm pl-9 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Prompt to select filters */}
        {!canFetch && (
          <div className="bg-surface border border-dashed border-border-subtle rounded-2xl p-12 text-center text-sm text-ink-muted max-w-xl mx-auto">
            Please select a <strong>Program / Batch</strong> and <strong>Semester</strong> above to load the student clearance list.
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="py-12 text-center text-sm text-ink-muted">
            Loading student clearance records...
          </div>
        )}

        {/* Results Table */}
        {result && !loading && (
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
            {/* Summary Counters */}
            <div className="flex items-center gap-4 text-xs font-medium text-ink-muted pb-2 border-b border-border-subtle">
              <span>
                Total Students: <strong className="text-ink-primary">{displayedStudents.length}</strong>
              </span>
              <span className="text-green-700">
                Approved: <strong>{displayedStudents.filter((s) => s.label === 'APPROVED').length}</strong>
              </span>
              <span className="text-red-700">
                Not Approved: <strong>{displayedStudents.filter((s) => s.label !== 'APPROVED').length}</strong>
              </span>
            </div>

            {displayedStudents.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-muted border border-dashed border-border-subtle rounded-xl">
                No students found matching the selected filters.
              </div>
            ) : (
              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-canvas border-b border-border-subtle">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Roll No. / Enrollment No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Clearance Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-surface">
                    {displayedStudents.map((s, idx) => (
                      <tr key={s.enrollmentNo || idx} className="hover:bg-canvas transition-colors">
                        <td className="px-4 py-3.5 text-xs text-ink-muted font-tabular">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-mono font-semibold text-ink-secondary">
                          {s.enrollmentNo || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-ink-primary">{s.name}</td>
                        <td className="px-4 py-3.5 text-right">
                          <ClearanceBadge label={s.label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
