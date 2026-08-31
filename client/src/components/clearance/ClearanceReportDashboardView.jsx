import React, { useState, useEffect } from 'react';
import {
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineCalendarDays,
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineEye,
  HiOutlineCreditCard,
  HiOutlineTruck,
  HiOutlineBookOpen,
  HiOutlineArrowPath,
  HiCheck,
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
  HiOutlineCheckBadge,
  HiOutlineAdjustmentsHorizontal,
} from 'react-icons/hi2';
import {
  FaGraduationCap,
  FaUniversity,
  FaBus,
  FaWallet,
  FaBook,
  FaHourglassHalf,
  FaShieldAlt,
  FaBalanceScale,
  FaStamp,
} from 'react-icons/fa';
import ClearanceReportPdfModal from './ClearanceReportPdfModal';
import { downloadClearancePdf, printClearanceReport } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function ClearanceReportDashboardView({
  reportData,
  onRefresh,
  loading = false,
  isStudent = false,
  onDynamicFilterChange,
}) {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Dynamic Downstream Controls State
  const [activeBranch, setActiveBranch] = useState(reportData?.program?.code || 'CSE');
  const [activeSem, setActiveSem] = useState(reportData?.semester?.number || reportData?.student?.currentSemester || 5);
  const [activeSection, setActiveSection] = useState(reportData?.student?.section || 'A');
  const [hasReRun, setHasReRun] = useState(false);
  const [forceClearAll, setForceClearAll] = useState(false);
  const [studentName, setStudentName] = useState(reportData?.student?.name || 'Rohan Iyer');
  const [rollNo, setRollNo] = useState(reportData?.student?.enrollmentNo || 'EN2024CSE002');
  const [showControls, setShowControls] = useState(!isStudent);

  // Synchronize initial data
  useEffect(() => {
    if (reportData) {
      setActiveBranch(reportData.program?.code || 'CSE');
      setActiveSem(reportData.semester?.number || reportData.student?.currentSemester || 5);
      setActiveSection(reportData.student?.section || 'A');
      setStudentName(reportData.student?.name || 'Rohan Iyer');
      setRollNo(reportData.student?.enrollmentNo || 'EN2024CSE002');
    }
  }, [reportData]);

  // Handle dynamic filtering
  const handleTriggerDynamicChange = (branch, sem, sec, rerun, clearAll, name, roll) => {
    if (onDynamicFilterChange) {
      onDynamicFilterChange({
        branch: branch || activeBranch,
        semester: sem || activeSem,
        section: sec || activeSection,
        includeReRun: rerun !== undefined ? rerun : hasReRun,
        forceAllCleared: clearAll !== undefined ? clearAll : forceClearAll,
        name: name || studentName,
        rollNo: roll || rollNo,
      });
    }
  };

  if (!reportData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <HiOutlineShieldCheck className="w-9 h-9" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Clearance Report</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Loading official clearance report data...
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition inline-flex items-center gap-2 shadow-sm"
          >
            <HiOutlineArrowPath className="w-4 h-4" /> Load Report
          </button>
        )}
      </div>
    );
  }

  const {
    student = {},
    program = {},
    semester = {},
    sections = [],
    items = [],
    classIncharge = {},
    hod = {},
    workflow = {},
    certificateNumber = 'CM-2026-CSE002',
    issuedAt = new Date().toISOString(),
    status = 'FINAL APPROVED',
  } = reportData;

  const deptCode = program.code || activeBranch || 'CSE';
  const deptName = program.department || program.name || 'Department of Computer Science & Engineering';

  // Determine Approval status
  const allSectionsCleared = sections.length > 0 && sections.every((s) => s.status?.toLowerCase() === 'approved');
  const allItemsCleared = items.length > 0 && items.every((i) => i.status?.toLowerCase() === 'approved');
  const isFinalApproved = (status || '').toUpperCase() === 'FINAL APPROVED' || (allSectionsCleared && allItemsCleared);

  // Compute pending items if any
  const pendingSections = sections.filter((s) => s.status?.toLowerCase() !== 'approved');
  const pendingItems = items.filter((i) => i.status?.toLowerCase() !== 'approved');

  // Section icon resolver
  const getSectionTheme = (secName = '', dept = '') => {
    const text = `${secName} ${dept}`.toLowerCase();
    if (text.includes('account') || text.includes('fee')) {
      return {
        icon: <FaWallet className="w-4 h-4 text-emerald-600" />,
        circleBg: 'bg-[#DCFCE7]',
        name: 'Accounts',
        defaultRemark: 'Fees verification & tuition dues',
        authority: 'Accounts Section Head',
      };
    }
    if (text.includes('bus') || text.includes('transport')) {
      return {
        icon: <FaBus className="w-4 h-4 text-amber-600" />,
        circleBg: 'bg-[#FFEDD5]',
        name: 'Bus / Transport',
        defaultRemark: 'Transport dues verification',
        authority: 'Transport Section Head',
      };
    }
    if (text.includes('library') || text.includes('book')) {
      return {
        icon: <FaBook className="w-4 h-4 text-purple-600" />,
        circleBg: 'bg-[#F3E8FF]',
        name: 'Library',
        defaultRemark: 'Book returns and fine clearance',
        authority: 'Library Section Head',
      };
    }
    if (text.includes('disciplinary') || text.includes('conduct') || text.includes('discipline')) {
      return {
        icon: <FaBalanceScale className="w-4 h-4 text-rose-600" />,
        circleBg: 'bg-[#FFE4E6]',
        name: 'Disciplinary',
        defaultRemark: 'Student conduct & disciplinary clearance',
        authority: 'Disciplinary Section Head',
      };
    }
    return {
      icon: <FaUniversity className="w-4 h-4 text-blue-600" />,
      circleBg: 'bg-[#DBEAFE]',
      name: secName || 'Section',
      defaultRemark: 'Institutional dues verification',
      authority: `${secName || 'Section'} Head`,
    };
  };

  const handleDirectDownload = async () => {
    if (!isFinalApproved) {
      toast.error('Clearance Incomplete: All institutional sections (4/4), faculty coursework, Class Incharge, and HOD must approve before generating the Official Clearance PDF.');
      return;
    }
    setDownloading(true);
    try {
      const fileName = `Clearance_Report_${student.enrollmentNo || rollNo || 'Student'}.pdf`;
      await downloadClearancePdf('official-clearance-card', fileName, isFinalApproved);
      toast.success(`Official Clearance PDF downloaded: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to export PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto pb-12 space-y-4">
      {/* ─── TOP ACTION UTILITY TOOLBAR ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isFinalApproved ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Official University Clearance Report • {deptCode}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition border border-slate-200 bg-white shadow-2xs"
              title="Refresh / Sync"
            >
              <HiOutlineArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => printClearanceReport(reportData)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-200 shadow-2xs"
          >
            <HiOutlinePrinter className="w-4 h-4 text-slate-500" />
            Print
          </button>

          {isFinalApproved ? (
            <button
              type="button"
              onClick={handleDirectDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              {downloading ? 'Exporting...' : 'Export PDF'}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-xl transition border border-slate-200 cursor-not-allowed"
              title="Clearance Incomplete: PDF locked until all approvals are cleared"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Export PDF (Locked)
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
          >
            <HiOutlineEye className="w-4 h-4" />
            Preview Document
          </button>
        </div>
      </div>

      {/* ─── MAIN OFFICIAL UNIVERSITY CLEARANCE CARD ─── */}
      <div
        id="official-clearance-card"
        className="bg-white rounded-[28px] border border-[#E2E8F0] shadow-sm p-6 sm:p-10 space-y-7 relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="text-center space-y-1.5">
          {/* Blue Shield Icon Badge */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEF4FF] border border-[#D0E1FD] text-[#2563EB] shadow-2xs mx-auto mb-1">
            <FaShieldAlt className="w-6 h-6 text-[#2563EB]" />
          </div>

          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] tracking-tight font-sans">
            CLEARANCE REPORT
          </h1>

          {/* Session with Flanking Horizontal Lines */}
          <div className="flex items-center justify-center gap-3 pt-0.5">
            <div className="h-[1px] w-12 sm:w-16 bg-[#BFDBFE]" />
            <div className="text-sm sm:text-[15px] font-bold text-[#2563EB]">
              {deptCode} — ({semester.session || `Session 2024-25 (EVEN)`})
            </div>
            <div className="h-[1px] w-12 sm:w-16 bg-[#BFDBFE]" />
          </div>

          {/* 3 Accent Center Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="w-1 h-1 rounded-full bg-[#BFDBFE]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span className="w-1 h-1 rounded-full bg-[#BFDBFE]" />
          </div>
        </div>

        {/* ─── Student Details Card ─── */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 relative shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Avatar + Name + Roll */}
            <div className="md:col-span-5 flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#DBEAFE] text-[#1E40AF] flex items-center justify-center shrink-0">
                <HiOutlineUser className="w-8 h-8 sm:w-9 sm:h-9 text-[#1E3A8A]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#64748B]">Name</div>
                <div className="text-base sm:text-lg font-extrabold text-[#0F172A] leading-tight">
                  {student.name || studentName}
                </div>
                <div className="text-xs font-medium text-[#64748B] pt-0.5">Roll / Enr. No.</div>
                <div className="text-xs sm:text-sm font-mono font-extrabold text-[#0F172A]">
                  {student.enrollmentNo || rollNo}
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:block md:col-span-1 border-r border-[#E2E8F0] h-16 justify-self-center" />

            {/* Middle: Year/Sem & Section */}
            <div className="md:col-span-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-[#64748B]">Year / Sem</div>
                <div className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                  {student.year || 'III'} / {student.currentSemester || activeSem} (Sem {student.currentSemester || activeSem} {deptCode})
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[#64748B]">Section</div>
                <div className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                  Section {student.section || activeSection}
                </div>
              </div>
            </div>

            {/* Right: University Crest Watermark */}
            <div className="hidden md:flex md:col-span-2 justify-end items-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#BFDBFE] flex flex-col items-center justify-center text-[#93C5FD] p-1 bg-[#F8FAFC]">
                <FaGraduationCap className="w-7 h-7 text-[#93C5FD] mb-0.5" />
                <div className="text-[7px] font-black uppercase tracking-tighter text-[#60A5FA]">
                  ★ S.B. JAIN ★
                </div>
                <div className="text-[6px] font-semibold text-[#94A3B8]">
                  OFFICIAL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Info Alert Banner ─── */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3.5 sm:p-4 flex items-center gap-3 text-[#334155] text-xs sm:text-sm">
          <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 text-xs font-bold font-serif">
            i
          </div>
          <p className="leading-snug">
            The following institutional sections and assigned department faculty have verified academic requirements, practical records, and financial clearance for the above student.
          </p>
        </div>

        {/* ─── 1. INSTITUTIONAL SECTIONS CLEARANCE ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs shadow-2xs">
                <FaUniversity className="w-3 h-3" />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                1. INSTITUTIONAL SECTIONS CLEARANCE
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="text-xs text-[#2563EB] hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <HiOutlineEye className="w-3.5 h-3.5" /> preview
            </button>
          </div>

          {/* Table 1 */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">SR. NO.</th>
                    <th className="py-3 px-4 w-44">SECTION</th>
                    <th className="py-3 px-4">REMARKS / CLEARANCE STATUS</th>
                    <th className="py-3 px-4 text-center w-52">APPROVAL & SIGNATURE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sections.map((sec, idx) => {
                    const theme = getSectionTheme(sec.sectionName, sec.department);
                    const secCleared = sec.status?.toLowerCase() === 'approved';

                    return (
                      <tr
                        key={idx}
                        className={`transition ${
                          secCleared ? 'hover:bg-[#F8FAFC]/60' : 'bg-rose-50/20'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-[#F1F5F9] text-xs font-bold text-[#475569]">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${theme.circleBg} flex items-center justify-center shrink-0`}>
                              {theme.icon}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
                              {theme.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#334155] font-normal text-xs sm:text-sm">
                            {sec.remarks || theme.defaultRemark}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {secCleared ? (
                              <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold text-xs">
                                <span className="w-3.5 h-3.5 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center text-[9px]">✓</span> Cleared
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[9px]">✕</span> Pending Clearance
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {secCleared ? (
                              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                <HiCheck className="w-3.5 h-3.5 stroke-[3]" /> CLEARED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-300">
                                PENDING
                              </span>
                            )}
                            <span className="text-[11px] text-[#64748B] mt-1 font-medium">
                              {sec.reviewerName || theme.authority}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── 2. FACULTY & SUBJECT CLEARANCE (DYNAMIC WITH RE-RUN SUPPORT) ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs shadow-2xs">
                <FaGraduationCap className="w-3 h-3" />
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">
                2. FACULTY & SUBJECT CLEARANCE ({deptCode} — SEMESTER {activeSem})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="text-xs text-[#2563EB] hover:text-blue-800 font-semibold inline-flex items-center gap-1"
            >
              <HiOutlineEye className="w-3.5 h-3.5" /> preview
            </button>
          </div>

          {/* Table 2 */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">SR. NO.</th>
                    <th className="py-3 px-4">SUBJECT / COURSE TITLE</th>
                    <th className="py-3 px-4 w-48">SUBJECT IN-CHARGE (FACULTY)</th>
                    <th className="py-3 px-4">REMARKS</th>
                    <th className="py-3 px-4 text-center w-52">APPROVAL & SIGNATURE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {items.map((item, idx) => {
                    const isItemCleared = item.status?.toLowerCase() === 'approved';
                    return (
                      <tr
                        key={idx}
                        className={`transition ${
                          item.isReRun
                            ? 'bg-amber-50/40 hover:bg-amber-50/70'
                            : isItemCleared
                            ? 'hover:bg-[#F8FAFC]/60'
                            : 'bg-rose-50/20'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <span className="w-6 h-6 inline-flex items-center justify-center rounded-md bg-[#F1F5F9] text-xs font-bold text-[#475569]">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
                              {item.title}
                            </span>
                            {item.isReRun && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-300">
                                RE-RUN / BACKLOG
                              </span>
                            )}
                          </div>
                          {item.subjectCode && (
                            <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                              Code: {item.subjectCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#0F172A] font-bold text-xs sm:text-sm">
                          {item.teacherName || 'Assigned Faculty'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#334155] font-normal text-xs sm:text-sm">
                            {item.remarks || (item.isReRun ? 'Re-run viva & practicals' : 'Assignments & Theory records')}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isItemCleared ? (
                              <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold text-xs">
                                <span className="w-3.5 h-3.5 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center text-[9px]">✓</span> Cleared
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs">
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[9px]">✕</span> Pending Faculty Sign-Off
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {isItemCleared ? (
                              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                <HiCheck className="w-3.5 h-3.5 stroke-[3]" /> CLEARED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-700 border border-rose-300">
                                PENDING
                              </span>
                            )}
                            <span className="text-[11px] text-[#64748B] mt-1 font-medium">
                              {item.teacherName || 'Prof. Faculty'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── 3. APPROVAL WORKFLOW CARDS & DYNAMIC STAMPS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1: Class In-Charge */}
          <div
            className={`border rounded-2xl p-5 flex flex-col justify-between ${
              allItemsCleared
                ? 'border-emerald-300 bg-[#F0FDF4]/50'
                : 'border-dashed border-amber-300 bg-amber-50/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold shrink-0">
                <HiOutlineUser className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-[#15803D]">
                  {allItemsCleared ? '✓ STAGE 2: CLASS IN-CHARGE CLEARED' : 'PENDING STAGE 2 APPROVAL'}
                </div>
                <div className="text-xs text-[#64748B]">
                  {classIncharge.designation || `Class Incharge (Sec ${activeSection})`}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="border-t-2 border-[#86EFAC] mb-3" />
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                  CLASS IN-CHARGE ({deptCode} — SEC {activeSection})
                </div>
                <div className="text-sm font-black text-[#0F172A] mt-0.5">
                  {classIncharge.name || `Prof. Class Incharge (Sec ${activeSection})`}
                </div>
                <div className="text-[10px] text-slate-500">
                  {classIncharge.email || `ci.${activeSection.toLowerCase()}.${deptCode.toLowerCase()}@clearmate.edu`}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Head of Department (Dynamic with Official Stamp) */}
          <div
            className={`border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden ${
              isFinalApproved
                ? 'border-purple-300 bg-[#FAF5FF]/60'
                : 'border-dashed border-slate-300 bg-slate-50/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center font-bold shrink-0">
                  <FaShieldAlt className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-[#6D28D9]">
                    {isFinalApproved ? '★ FINAL STAGE: HOD VERIFIED & SEALED' : 'PENDING FINAL HOD SIGN-OFF'}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    {hod.name || 'Dr. Kulkarni'} (Head of Dept)
                  </div>
                </div>
              </div>

              {/* Dynamic Circular University Stamp */}
              {isFinalApproved && (
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#7C3AED] bg-purple-100/40 flex flex-col items-center justify-center text-center p-1 transform rotate-[-8deg] shrink-0">
                  <div className="text-[6.5px] font-black uppercase text-[#6D28D9]">S.B. JAIN TECH</div>
                  <div className="text-[7.5px] font-black text-[#7C3AED] leading-none my-0.5">DEPT. OF {deptCode}</div>
                  <span className="bg-[#7C3AED] text-white text-[6px] font-extrabold px-1.5 py-0.5 rounded leading-none">
                    SEALED
                  </span>
                  <div className="text-[5.5px] font-bold text-slate-600 mt-0.5">OFFICIAL STAMP</div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="border-t-2 border-[#DDD6FE] mb-3" />
              <div className="text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">
                  HEAD OF DEPARTMENT ({deptCode})
                </div>
                <div className="text-sm font-black text-[#0F172A] mt-0.5">
                  {hod.name || 'Dr. Kulkarni'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {deptName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Verifiable Reference Bar ─── */}
        <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Shield + Reference */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${
                isFinalApproved ? 'bg-[#2563EB] text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {isFinalApproved ? <HiCheck className="w-5 h-5 stroke-[3]" /> : <FaHourglassHalf className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                ClearMate Official University Clearance System
              </div>
              <div className="text-xs text-[#64748B] font-mono">
                Ref : <span className="font-bold text-[#2563EB]">{certificateNumber}</span>
              </div>
            </div>
          </div>

          {/* Middle: Generated On */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#64748B]">
            <HiOutlineCalendarDays className="w-5 h-5 text-[#64748B] shrink-0" />
            <div>
              <span className="text-[11px] text-[#64748B] block">Generated on</span>
              <span className="font-bold text-[#0F172A]">
                {new Date(issuedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}, {new Date(issuedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </div>

          {/* Right: Status Pill */}
          <div
            className={`border rounded-xl px-4 py-2 flex items-center gap-3 ${
              isFinalApproved
                ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]'
                : 'bg-rose-50 border-rose-300 text-rose-700'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold block leading-none opacity-80">
                Status
              </span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                {isFinalApproved ? 'FINAL APPROVED' : 'PENDING'}
              </span>
            </div>
            <div>
              {isFinalApproved ? <HiOutlineCheckBadge className="w-5 h-5" /> : <FaHourglassHalf className="w-4 h-4 text-rose-600" />}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      <ClearanceReportPdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        reportData={reportData}
      />
    </div>
  );
}
