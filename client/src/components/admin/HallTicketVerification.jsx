import React, { useState, useEffect, useCallback } from 'react';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineTicket,
  HiOutlineDocumentCheck,
  HiOutlineEnvelope,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineBuildingLibrary,
  HiOutlineBookOpen,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlinePrinter,
} from 'react-icons/hi2';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Badge from '../common/Badge';

export default function HallTicketVerification() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Issue modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [hallTicketNumber, setHallTicketNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [issuing, setIssuing] = useState(false);

  // Quick Roster / Cleared Students
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterFilter, setRosterFilter] = useState('cleared_pending_ticket');
  const [activeView, setActiveView] = useState('search');

  const handleSearch = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const query = directQuery !== null ? directQuery : searchQuery;
    if (!query || !query.trim()) {
      toast.error('Please enter a name, roll number, or student ID');
      return;
    }

    setSearching(true);
    try {
      const res = await api.get('/clearances/hall-ticket/search', {
        params: { q: query.trim() },
      });
      const matches = res.data.data?.matches || [];
      setSearchResults(matches);
      if (matches.length === 1) {
        setSelectedMatch(matches[0]);
      } else if (matches.length === 0) {
        setSelectedMatch(null);
        toast('No matching student records found.', { icon: '🔍' });
      } else {
        setSelectedMatch(matches[0]);
      }
    } catch (err) {
      toast.error(err.message || 'Error searching student');
    } finally {
      setSearching(false);
    }
  };

  const fetchRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const res = await api.get('/clearances/hall-ticket/roster', {
        params: { status: rosterFilter },
      });
      setRoster(res.data.data?.roster || []);
    } catch (err) {
      console.warn('Could not load roster:', err);
    } finally {
      setRosterLoading(false);
    }
  }, [rosterFilter]);

  useEffect(() => {
    if (activeView === 'roster') {
      fetchRoster();
    }
  }, [activeView, fetchRoster]);

  const openIssueModal = (match) => {
    const student = match.student;
    const defaultTicket = `HT-${new Date().getFullYear()}-${(student.enrollmentNo || '000').slice(-6)}`;
    setHallTicketNumber(match.clearanceRequest?.hallTicketNumber || defaultTicket);
    setRemarks(match.clearanceRequest?.hallTicketRemarks || 'Physical clearance certificate verified & approved by Dept Admin.');
    setSelectedMatch(match);
    setIssueModalOpen(true);
  };

  const handleConfirmIssue = async () => {
    if (!selectedMatch?.clearanceRequest?._id) {
      toast.error('Clearance request ID not found for this student');
      return;
    }

    setIssuing(true);
    try {
      const res = await api.post('/clearances/hall-ticket/issue', {
        clearanceRequestId: selectedMatch.clearanceRequest._id,
        hallTicketNumber: hallTicketNumber.trim(),
        remarks: remarks.trim(),
      });

      toast.success(
        <div>
          <p className="font-bold">🎉 Hall Ticket Approved &amp; Issued!</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated confirmation email has been sent to {selectedMatch.student.email}
          </p>
        </div>,
        { duration: 6000 }
      );

      setIssueModalOpen(false);

      const updatedCr = res.data.data;
      setSelectedMatch((prev) => ({
        ...prev,
        clearanceRequest: {
          ...prev.clearanceRequest,
          hallTicketIssued: true,
          hallTicketIssuedAt: updatedCr?.hallTicketIssuedAt || new Date().toISOString(),
          hallTicketNumber: updatedCr?.hallTicketNumber || hallTicketNumber.trim(),
          hallTicketIssuedBy: updatedCr?.hallTicketIssuedBy,
          hallTicketRemarks: updatedCr?.hallTicketRemarks || remarks.trim(),
        },
      }));

      if (searchResults) {
        setSearchResults((prev) =>
          prev.map((m) =>
            m.student._id === selectedMatch.student._id
              ? {
                  ...m,
                  clearanceRequest: {
                    ...m.clearanceRequest,
                    hallTicketIssued: true,
                    hallTicketNumber: hallTicketNumber.trim(),
                  },
                }
              : m
          )
        );
      }

      if (activeView === 'roster') {
        fetchRoster();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to issue hall ticket');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 mb-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-emerald-400" />
              Certificate Authenticity &amp; Exam Clearance
            </div>
            <h2 className="text-xl font-bold font-display">
              Physical Clearance Verification &amp; Hall Ticket Issuance
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              When a student presents their printed clearance certificate in person, search their record to cross-verify against the digital ledger, validate the authentic certificate ID, and issue their Examination Hall Ticket.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('search')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === 'search'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <HiOutlineMagnifyingGlass className="w-4 h-4" />
              Search &amp; Verify
            </button>
            <button
              onClick={() => setActiveView('roster')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === 'roster'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <HiOutlineTicket className="w-4 h-4" />
              Issuance Queue
            </button>
          </div>
        </div>
      </div>

      {activeView === 'search' ? (
        <div className="space-y-6">
          {/* Search Box Card */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <HiOutlineIdentification className="w-5 h-5 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter Student Name, Roll No. / Enrollment No. (e.g. EN2024CSE001) or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-canvas border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={searching}
                icon={<HiOutlineMagnifyingGlass className="w-4 h-4" />}
                className="w-full sm:w-auto font-bold px-6"
              >
                Search &amp; Authenticate
              </Button>
            </form>

            {searchResults && searchResults.length > 1 && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                  Found {searchResults.length} matching students. Select one to verify:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {searchResults.map((match) => {
                    const isSelected = selectedMatch?.student?._id === match.student._id;
                    const isCleared = match.clearanceRequest?.isFullyCleared;
                    return (
                      <button
                        key={match.student._id}
                        type="button"
                        onClick={() => setSelectedMatch(match)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand ring-1 ring-brand'
                            : 'bg-canvas hover:bg-surface border-border-subtle'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-ink-primary">{match.student.name}</p>
                          <p className="text-2xs font-mono text-ink-muted">{match.student.enrollmentNo}</p>
                        </div>
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                            isCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCleared ? 'Cleared ✅' : 'Pending'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Verification Results Panel */}
          {selectedMatch ? (
            <div className="space-y-6">
              {/* Authenticity Header Box */}
              <div
                className={`rounded-2xl border p-5 shadow-xs transition-all ${
                  selectedMatch.clearanceRequest?.isFullyCleared
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedMatch.clearanceRequest?.isFullyCleared
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-amber-500 text-white shadow-sm'
                      }`}
                    >
                      {selectedMatch.clearanceRequest?.isFullyCleared ? (
                        <HiOutlineShieldCheck className="w-7 h-7" />
                      ) : (
                        <HiOutlineExclamationTriangle className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {selectedMatch.clearanceRequest?.isFullyCleared
                            ? 'Official Clearance Certificate Authenticated ✅'
                            : 'Clearance Incomplete / Action Required ⚠️'}
                        </h3>
                        <span
                          className={`text-2xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            selectedMatch.clearanceRequest?.isFullyCleared
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {selectedMatch.verificationSummary.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {selectedMatch.clearanceRequest?.isFullyCleared
                          ? `All subject evaluations and institutional departments are fully cleared. Certificate ID: ${selectedMatch.verificationSummary.certificateNumber || 'Generated'}`
                          : 'Student has not completed all 4 clearance review stages. Review the breakdown below.'}
                      </p>
                    </div>
                  </div>

                  {/* Hall ticket status & Issuance CTA */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {selectedMatch.clearanceRequest?.hallTicketIssued ? (
                      <div className="bg-emerald-600/10 border border-emerald-300 px-4 py-2 rounded-xl text-right">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                          <HiOutlineTicket className="w-4 h-4 text-emerald-600" />
                          <span>Hall Ticket Issued</span>
                        </div>
                        <p className="text-2xs font-mono text-emerald-700 mt-0.5">
                          {selectedMatch.clearanceRequest.hallTicketNumber || 'Ticket Confirmed'} •{' '}
                          {new Date(selectedMatch.clearanceRequest.hallTicketIssuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : selectedMatch.clearanceRequest?.isFullyCleared ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => openIssueModal(selectedMatch)}
                        icon={<HiOutlineSparkles className="w-4 h-4 text-amber-300" />}
                        className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        Approve &amp; Issue Hall Ticket
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled
                        icon={<HiOutlineXCircle className="w-4 h-4 text-slate-400" />}
                      >
                        Clearance Incomplete
                      </Button>
                    )}

                    <a
                      href={`/admin/clearance-report?studentId=${selectedMatch.student._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition"
                    >
                      <HiOutlineArrowTopRightOnSquare className="w-4 h-4 text-slate-500" />
                      View Certificate PDF
                    </a>
                  </div>
                </div>
              </div>

              {/* 3-Column Verification Cross-Check Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Student Record Cross-Check */}
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineUser className="w-4 h-4 text-brand" />
                      1. Student Identity Check
                    </h4>
                    <span className="text-2xs font-mono bg-canvas px-2 py-0.5 rounded text-ink-muted">
                      ID: {selectedMatch.student._id.slice(-6)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-ink-muted block text-2xs uppercase">Full Name</span>
                      <strong className="text-ink-primary text-sm font-semibold">{selectedMatch.student.name}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-ink-muted block text-2xs uppercase">Roll / Enrollment No.</span>
                        <strong className="text-ink-primary font-mono">{selectedMatch.student.enrollmentNo || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-2xs uppercase">Current Semester</span>
                        <strong className="text-ink-primary font-semibold">Semester {selectedMatch.student.currentSemester}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-2xs uppercase">Academic Program</span>
                      <strong className="text-ink-primary">{selectedMatch.student.program}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-ink-muted block text-2xs uppercase">Section / Batch</span>
                        <strong className="text-ink-primary">Sec {selectedMatch.student.section || 'A'} • {selectedMatch.student.batch}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted block text-2xs uppercase">Email Address</span>
                        <span className="text-ink-secondary truncate block">{selectedMatch.student.email}</span>
                      </div>
                    </div>
                  </div>

                  {selectedMatch.clearanceRequest?.hallTicketIssued && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-2xs space-y-1">
                      <p className="font-bold text-emerald-900 flex items-center gap-1">
                        <HiOutlineTicket className="w-3.5 h-3.5" /> Hall Ticket Metadata
                      </p>
                      <p className="text-emerald-800">
                        <strong>Ticket / Seat:</strong> {selectedMatch.clearanceRequest.hallTicketNumber || 'Default'}
                      </p>
                      <p className="text-emerald-800">
                        <strong>Issued At:</strong> {new Date(selectedMatch.clearanceRequest.hallTicketIssuedAt).toLocaleString()}
                      </p>
                      {selectedMatch.clearanceRequest.hallTicketIssuedBy && (
                        <p className="text-emerald-800">
                          <strong>Admin:</strong> {selectedMatch.clearanceRequest.hallTicketIssuedBy.name}
                        </p>
                      )}
                      {selectedMatch.clearanceRequest.hallTicketRemarks && (
                        <p className="text-emerald-700 italic mt-1">"{selectedMatch.clearanceRequest.hallTicketRemarks}"</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Column 2: Subject & Lab Teacher Evaluations */}
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineBookOpen className="w-4 h-4 text-indigo-600" />
                      2. Faculty Subject Approvals
                    </h4>
                    <span className="text-2xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                      {selectedMatch.verificationSummary.approvedItems} / {selectedMatch.verificationSummary.totalItems || selectedMatch.items?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedMatch.items && selectedMatch.items.length > 0 ? (
                      selectedMatch.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-canvas rounded-xl border border-border-subtle flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-ink-primary truncate">{item.itemTitle}</p>
                            <p className="text-2xs text-ink-muted truncate">
                              Evaluator: {item.teacherId?.name || 'Assigned Faculty'}
                            </p>
                          </div>
                          <span
                            className={`text-2xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              item.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-ink-muted italic text-center py-6">
                        No subject evaluation records logged.
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 3: Institutional Departments */}
                <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                      <HiOutlineBuildingLibrary className="w-4 h-4 text-purple-600" />
                      3. Institutional Departments
                    </h4>
                    <span className="text-2xs font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                      {selectedMatch.verificationSummary.approvedSections} / {selectedMatch.verificationSummary.totalSections || 4}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedMatch.sections && selectedMatch.sections.length > 0 ? (
                      selectedMatch.sections.map((sec, idx) => {
                        const isApproved = sec.status === 'approved' || sec.fees_status === 'paid' || sec.bus_fees_status === 'paid';
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-canvas rounded-xl border border-border-subtle flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-ink-primary uppercase tracking-wide">
                                {sec.department}
                              </p>
                              <p className="text-2xs text-ink-muted">
                                {sec.reviewerId ? `Verified by ${sec.reviewerId.name}` : 'Section Admin'}
                              </p>
                            </div>
                            <span
                              className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sec.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isApproved ? 'CLEARED ✅' : 'PENDING'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        {['Accounts', 'Library', 'Transport / Bus', 'Disciplinary'].map((dept, i) => (
                          <div key={i} className="p-2 bg-canvas rounded-lg flex items-center justify-between">
                            <span className="font-medium text-ink-secondary">{dept}</span>
                            <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Cleared ✅
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-surface border border-dashed border-border-subtle rounded-2xl max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <HiOutlineIdentification className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-ink-primary">Search a Student to Begin Verification</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto">
                Type the student's name or roll number above to verify their digital clearance certificate against the physical copy they brought in person.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
                <HiOutlineTicket className="w-5 h-5 text-brand" />
                Hall Ticket Issuance Queue
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Manage all cleared students and track which hall tickets have been authenticated and issued.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={rosterFilter}
                onChange={(e) => setRosterFilter(e.target.value)}
                className="input-base text-xs py-1.5 pr-8 font-semibold"
              >
                <option value="cleared_pending_ticket">Pending Hall Tickets (Cleared Only)</option>
                <option value="issued">Issued Hall Tickets</option>
                <option value="all">All Students</option>
              </select>
              <Button variant="secondary" size="sm" onClick={fetchRoster} loading={rosterLoading}>
                Refresh
              </Button>
            </div>
          </div>

          {rosterLoading ? (
            <div className="py-12 text-center text-xs text-ink-muted animate-pulse">
              Loading student queue...
            </div>
          ) : roster.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted border border-dashed border-border-subtle rounded-xl">
              No students found in this filter category.
            </div>
          ) : (
            <div className="border border-border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border-subtle">
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">#</th>
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">Roll No</th>
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">Student Name</th>
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">Program / Sem</th>
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">Clearance</th>
                    <th className="px-3.5 py-3 text-left font-semibold text-ink-muted uppercase">Hall Ticket</th>
                    <th className="px-3.5 py-3 text-right font-semibold text-ink-muted uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface">
                  {roster.map((st, idx) => (
                    <tr key={st._id} className="hover:bg-canvas transition-colors">
                      <td className="px-3.5 py-3 text-ink-muted font-tabular">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-ink-secondary">{st.enrollmentNo || '—'}</td>
                      <td className="px-3.5 py-3 font-bold text-ink-primary">{st.name}</td>
                      <td className="px-3.5 py-3 text-ink-secondary">
                        {st.programCode} • Sem {st.currentSemester} (Sec {st.section || 'A'})
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                            st.isCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {st.isCleared ? 'CLEARED ✅' : 'PENDING'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        {st.hallTicketIssued ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1 w-max">
                            <HiOutlineCheckCircle className="w-3 h-3" />
                            ISSUED {st.hallTicketNumber ? `(${st.hallTicketNumber})` : ''}
                          </span>
                        ) : (
                          <span className="text-2xs text-ink-muted font-semibold">Not Issued</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={() => {
                            setActiveView('search');
                            setSearchQuery(st.enrollmentNo || st.name);
                            handleSearch(null, st.enrollmentNo || st.name);
                          }}
                          className="px-2.5 py-1 text-2xs font-bold text-brand bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                        >
                          Verify &amp; Issue →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Issue Modal */}
      {issueModalOpen && selectedMatch && (
        <Modal
          isOpen={issueModalOpen}
          onClose={() => setIssueModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <HiOutlineTicket className="w-5 h-5 text-emerald-600" />
              <span>Approve &amp; Issue Examination Hall Ticket</span>
            </div>
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" size="md" onClick={() => setIssueModalOpen(false)} disabled={issuing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={issuing}
                onClick={handleConfirmIssue}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                icon={<HiOutlineCheckCircle className="w-4 h-4" />}
              >
                Confirm &amp; Send Congratulations Email
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
                Automated Notification &amp; Email Dispatch
              </p>
              <p className="text-2xs text-emerald-800 leading-relaxed">
                Confirming will officially mark the Hall Ticket as <strong>ISSUED</strong>. An automated congratulatory email containing full exam instructions will be dispatched to <strong>{selectedMatch.student.email}</strong>.
              </p>
            </div>

            <div className="bg-canvas p-3 rounded-xl border border-border-subtle text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Student:</span>
                <strong className="text-ink-primary font-semibold">{selectedMatch.student.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Roll / Enrollment No:</span>
                <span className="font-mono font-bold text-ink-primary">{selectedMatch.student.enrollmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Certificate ID:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {selectedMatch.verificationSummary.certificateNumber || 'CM-2026-CSE001'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary block mb-1">
                Hall Ticket / Desk / Seat Number (Optional)
              </label>
              <input
                type="text"
                value={hallTicketNumber}
                onChange={(e) => setHallTicketNumber(e.target.value)}
                placeholder="e.g. HT-2026-8841"
                className="input-base text-sm w-full font-mono font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-secondary block mb-1">
                Admin Verification Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Physical certificate verified with college stamp."
                className="input-base text-xs w-full resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
