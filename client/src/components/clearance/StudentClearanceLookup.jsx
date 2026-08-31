import { useState, useEffect } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock, HiOutlineExclamationCircle } from 'react-icons/hi2';
import api from '../../api/axios';
import toast from 'react-hot-toast';

function ClearanceBadge({ label }) {
  if (label === 'APPROVED')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300"><HiOutlineCheckCircle className="w-3.5 h-3.5" />Approved</span>;
  if (label === 'REJECTED')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300"><HiOutlineXCircle className="w-3.5 h-3.5" />Not Approved</span>;
  if (label === 'IN PROGRESS')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300"><HiOutlineClock className="w-3.5 h-3.5" />In Progress</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-300"><HiOutlineExclamationCircle className="w-3.5 h-3.5" />Not Approved</span>;
}

export default function StudentClearanceLookup() {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Load programs on mount
  useEffect(() => {
    api.get('/admin/programs').then(res => setPrograms(res.data.data || [])).catch(() => {});
  }, []);

  const canFetch = selectedProgram && selectedSemester;

  const fetchRoster = async () => {
    if (!canFetch) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ semesterNumber: selectedSemester, programId: selectedProgram });
      if (searchQuery.trim()) params.set('enrollmentQuery', searchQuery.trim());
      const res = await api.get(`/clearances/hod/class-list?${params}`);
      setResult(res.data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when dropdowns change
  useEffect(() => {
    if (canFetch) fetchRoster();
    else setResult(null);
  }, [selectedProgram, selectedSemester]);

  // Filter by search query client-side if roster is already loaded
  const displayedStudents = result
    ? searchQuery.trim()
      ? result.students.filter(s =>
          s.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : result.students
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-ink-primary">Student Clearance Status</h2>
        <p className="text-xs text-ink-muted mt-0.5">Select a program and semester to view clearance status for all students in that class.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Program dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-secondary">Program / Batch *</label>
          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            className="input-base text-sm min-w-[200px]"
          >
            <option value="">-- Select Program --</option>
            {programs.map(p => (
              <option key={p._id} value={p._id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Semester dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-secondary">Semester *</label>
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="input-base text-sm min-w-[160px]"
          >
            <option value="">-- Select Semester --</option>
            {[1,2,3,4,5,6,7,8].map(n => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>

        {/* Search box */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-ink-secondary">Search by Roll No. / Enrollment No. (optional)</label>
          <div className="relative">
            <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="e.g. 22BCA001"
              className="input-base text-sm pl-8 w-full"
            />
          </div>
        </div>
      </div>

      {/* Prompt to select filters */}
      {!canFetch && (
        <div className="text-center py-10 text-ink-muted text-sm border border-dashed border-border-subtle rounded-lg">
          Select a <strong>Program</strong> and <strong>Semester</strong> to load the student list.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-ink-muted text-sm">Loading students...</div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="flex items-center gap-4 text-xs text-ink-muted">
            <span>Total: <strong className="text-ink-primary">{displayedStudents.length}</strong></span>
            <span className="text-green-700">Approved: <strong>{displayedStudents.filter(s => s.label === 'APPROVED').length}</strong></span>
            <span className="text-red-700">Not Approved: <strong>{displayedStudents.filter(s => s.label !== 'APPROVED').length}</strong></span>
          </div>

          {/* Table */}
          {displayedStudents.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm border border-dashed border-border-subtle rounded-lg">
              No students found.
            </div>
          ) : (
            <div className="border border-border-subtle rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas border-b border-border-subtle">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Roll No. / Enrollment No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">Clearance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {displayedStudents.map((s, idx) => (
                    <tr key={s.enrollmentNo || idx} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 text-xs text-ink-muted">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-ink-secondary text-sm">{s.enrollmentNo || '—'}</td>
                      <td className="px-4 py-3 text-ink-primary font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right">
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
  );
}
