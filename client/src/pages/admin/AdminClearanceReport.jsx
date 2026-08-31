import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClearanceReportDashboardView from '../../components/clearance/ClearanceReportDashboardView';
import Skeleton from '../../components/common/Skeleton';

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
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStudentId = studentId || searchParams.get('studentId') || '';

  const [activeTab, setActiveTab] = useState(queryStudentId ? 'individual' : 'roster');

  // Roster Tab States
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterResult, setRosterResult] = useState(null);

  // Individual Report Tab States
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(queryStudentId);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Load programs
  useEffect(() => {
    api.get('/admin/programs')
      .then((res) => setPrograms(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch list of students for individual inspection
  useEffect(() => {
    api.get('/admin/users', { params: { role: 'student', limit: 100 } })
      .then((res) => {
        if (res.data.success && res.data.data?.users) {
          setStudents(res.data.data.users);
          if (!selectedStudentId && res.data.data.users.length > 0) {
            setSelectedStudentId(res.data.data.users[0]._id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Roster Lookup Logic
  const canFetchRoster = selectedProgram && selectedSemester;

  const fetchRoster = async () => {
    if (!canFetchRoster) return;
    setRosterLoading(true);
    setRosterResult(null);
    try {
      const params = new URLSearchParams({
        semesterNumber: selectedSemester,
        programId: selectedProgram,
      });
      const res = await api.get(`/clearances/hod/class-list?${params}`);
      setRosterResult(res.data.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    if (canFetchRoster) fetchRoster();
    else setRosterResult(null);
  }, [selectedProgram, selectedSemester]);

  const displayedStudents = rosterResult
    ? searchQuery.trim()
      ? rosterResult.students.filter(
          (s) =>
            s.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : rosterResult.students
    : [];

  // Individual Report Fetch Logic
  const fetchReport = useCallback(async (targetId) => {
    const id = targetId || selectedStudentId;
    setReportLoading(true);
    try {
      const url = id ? `/certificate/student/${id}` : `/certificate/preview`;
      const res = await api.get(url);
      if (res.data.success && res.data.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load report:', err);
    } finally {
      setReportLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    if (activeTab === 'individual') {
      fetchReport(selectedStudentId);
    }
  }, [activeTab, selectedStudentId, fetchReport]);

  const handleInspectStudent = (sId) => {
    setSelectedStudentId(sId);
    setSearchParams({ studentId: sId });
    setActiveTab('individual');
    fetchReport(sId);
  };

  return (
    <DashboardLayout title="Student Clearance Reports & Roster">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'roster'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <HiOutlineUserGroup className="w-4 h-4" />
            Class Clearance Roster
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'individual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            Individual Clearance Report
          </button>
        </div>

        {/* Tab 1: Class Clearance Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h1 className="text-lg font-bold text-ink-primary">Student Clearance Status Roster</h1>
                <p className="text-xs text-ink-muted mt-0.5">
                  Select a program and semester to view clearance approval status for students in that class.
                </p>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3 items-end pt-2">
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

                <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
                  <label className="text-xs font-semibold text-ink-secondary">
                    Search by Roll No. / Name (optional)
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

            {!canFetchRoster && (
              <div className="bg-surface border border-dashed border-border-subtle rounded-2xl p-12 text-center text-sm text-ink-muted max-w-xl mx-auto">
                Please select a <strong>Program / Batch</strong> and <strong>Semester</strong> above to load the student clearance list.
              </div>
            )}

            {rosterLoading && (
              <div className="py-12 text-center text-sm text-ink-muted">
                Loading student clearance records...
              </div>
            )}

            {rosterResult && !rosterLoading && (
              <div className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-xs space-y-4">
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
                          <th className="px-4 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">
                            Clearance Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">
                            Action
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
                            <td className="px-4 py-3.5 text-center">
                              <ClearanceBadge label={s.label} />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleInspectStudent(s.studentId || s._id)}
                                className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition border border-blue-200"
                              >
                                View Report →
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
          </div>
        )}

        {/* Tab 2: Individual Clearance Report */}
        {activeTab === 'individual' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <HiOutlineUserGroup className="w-4 h-4 text-blue-600" />
                  Select Student:
                </div>

                <select
                  value={selectedStudentId}
                  onChange={(e) => handleInspectStudent(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[280px]"
                >
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.enrollmentNo || 'No Roll'}) — {s.programId?.code || 'CSE'} Sec {s.section || 'A'}
                    </option>
                  ))}
                  {students.length === 0 && (
                    <option value="demo-student">Rohan Iyer (EN2024CSE002) — CSE Sec A</option>
                  )}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Official University Document Engine
              </div>
            </div>

            {reportLoading && !reportData ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-64 w-full rounded-3xl" />
              </div>
            ) : (
              <ClearanceReportDashboardView
                reportData={reportData}
                onRefresh={() => fetchReport(selectedStudentId)}
                loading={reportLoading}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
