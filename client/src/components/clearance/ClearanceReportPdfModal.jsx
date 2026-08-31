import React, { useRef, useState } from 'react';
import {
  HiOutlineXMark,
  HiOutlinePrinter,
  HiOutlineArrowDownTray,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiCheck,
  HiOutlineUser,
  HiOutlineCalendarDays,
  HiOutlineMagnifyingGlassPlus,
  HiOutlineMagnifyingGlassMinus,
} from 'react-icons/hi2';
import { FaGraduationCap, FaUniversity, FaBus, FaWallet, FaBook, FaHourglassHalf, FaShieldAlt, FaBalanceScale, FaStamp } from 'react-icons/fa';
import { downloadClearancePdf, printClearanceReport } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function ClearanceReportPdfModal({ isOpen, onClose, reportData }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !reportData) return null;

  const {
    student = {},
    program = {},
    semester = {},
    sections = [],
    items = [],
    classIncharge = {},
    hod = {},
    certificateNumber = 'CM-2026-CSE002',
    issuedAt = new Date().toISOString(),
    status = 'FINAL APPROVED',
  } = reportData;

  const deptCode = program.code || 'CSE';
  const deptName = program.department || program.name || 'Department of Computer Science & Engineering';
  const rawStatus = (status || 'FINAL APPROVED').toUpperCase();
  const allSectionsCleared = sections.length > 0 && sections.every((s) => s.status?.toLowerCase() === 'approved');
  const allItemsCleared = items.length > 0 && items.every((i) => i.status?.toLowerCase() === 'approved');
  const isCleared = rawStatus === 'FINAL APPROVED' || (allSectionsCleared && allItemsCleared);

  const getSectionTheme = (secName = '', dept = '') => {
    const text = `${secName} ${dept}`.toLowerCase();
    if (text.includes('account') || text.includes('fee')) {
      return {
        icon: <FaWallet className="w-3.5 h-3.5 text-emerald-600" />,
        circleBg: 'bg-[#DCFCE7]',
        name: 'Accounts',
        defaultRemark: 'Fees verification & tuition dues',
        authority: 'Accounts Section Head',
      };
    }
    if (text.includes('bus') || text.includes('transport')) {
      return {
        icon: <FaBus className="w-3.5 h-3.5 text-amber-600" />,
        circleBg: 'bg-[#FFEDD5]',
        name: 'Bus / Transport',
        defaultRemark: 'Transport dues verification',
        authority: 'Transport Section Head',
      };
    }
    if (text.includes('library') || text.includes('book')) {
      return {
        icon: <FaBook className="w-3.5 h-3.5 text-purple-600" />,
        circleBg: 'bg-[#F3E8FF]',
        name: 'Library',
        defaultRemark: 'Book returns and fine clearance',
        authority: 'Library Section Head',
      };
    }
    if (text.includes('disciplinary') || text.includes('conduct') || text.includes('discipline')) {
      return {
        icon: <FaBalanceScale className="w-3.5 h-3.5 text-rose-600" />,
        circleBg: 'bg-[#FFE4E6]',
        name: 'Disciplinary',
        defaultRemark: 'Student conduct & disciplinary clearance',
        authority: 'Disciplinary Section Head',
      };
    }
    return {
      icon: <FaUniversity className="w-3.5 h-3.5 text-blue-600" />,
      circleBg: 'bg-[#DBEAFE]',
      name: secName || 'Section',
      defaultRemark: 'Institutional dues verification',
      authority: `${secName || 'Section'} Head`,
    };
  };

  const handleDownload = async () => {
    if (!isCleared) {
      toast.error('Clearance Incomplete: All institutional sections, faculty coursework, Class Incharge, and HOD approvals are required before downloading the official clearance certificate.');
      return;
    }
    setDownloading(true);
    try {
      const roll = student.enrollmentNo || student.rollNo || 'Report';
      const fileName = `Clearance_Report_${roll}.pdf`;
      await downloadClearancePdf(documentRef.current, fileName, isCleared);
      toast.success(`Official Clearance PDF downloaded: ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    printClearanceReport(reportData);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(certificateNumber);
    setCopied(true);
    toast.success('Reference ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${isCleared ? 'bg-emerald-600' : 'bg-amber-600'} flex items-center justify-center text-white font-bold shadow-md`}>
              <FaShieldAlt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Official University Clearance Report
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide ${
                    isCleared ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isCleared ? '★ FINAL APPROVED' : 'PENDING APPROVALS'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Official University Clearance Certificate (Print-Ready A4)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 mr-2 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom Out"
              >
                <HiOutlineMagnifyingGlassMinus className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.3, z + 0.1))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
                title="Zoom In"
              >
                <HiOutlineMagnifyingGlassPlus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition border border-slate-700"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow transition disabled:opacity-50"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-1"
            >
              <HiOutlineXMark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-8 flex justify-center">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
            className="transition-transform"
          >
            {/* The Print/Capture A4 Sheet - Official University Template */}
            <div
              ref={documentRef}
              id="clearance-printable-a4"
              className="bg-white text-[#0F172A] shadow-xl border border-[#E2E8F0] rounded-[24px] relative"
              style={{
                width: '794px',
                minHeight: '1080px',
                padding: '36px 42px',
                boxSizing: 'border-box',
              }}
            >
              {/* Top Header */}
              <div className="text-center space-y-1.5 mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EEF4FF] border border-[#D0E1FD] text-[#2563EB] mx-auto mb-1">
                  <FaShieldAlt className="w-5 h-5 text-[#2563EB]" />
                </div>

                <div className="text-[11px] font-black uppercase tracking-wider text-[#1E40AF]">
                  S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR
                </div>
                <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-sans">
                  CLEARANCE REPORT
                </h1>

                <div className="flex items-center justify-center gap-3 pt-0.5">
                  <div className="h-[1px] w-14 bg-[#BFDBFE]" />
                  <div className="text-sm font-bold text-[#2563EB]">
                    {deptCode} — ({semester.session || `Session 2024-25 (EVEN)`})
                  </div>
                  <div className="h-[1px] w-14 bg-[#BFDBFE]" />
                </div>

                <div className="flex items-center justify-center gap-1 pt-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#BFDBFE]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                  <span className="w-1 h-1 rounded-full bg-[#BFDBFE]" />
                </div>
              </div>

              {/* Student Details Card */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 mb-4 shadow-2xs">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5 flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-[#DBEAFE] text-[#1E40AF] flex items-center justify-center shrink-0">
                      <HiOutlineUser className="w-7 h-7 text-[#1E3A8A]" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-medium text-[#64748B]">Name</div>
                      <div className="text-base font-extrabold text-[#0F172A]">
                        {student.name || 'Rohan Iyer'}
                      </div>
                      <div className="text-[11px] font-medium text-[#64748B] pt-0.5">Roll / Enr. No.</div>
                      <div className="text-xs font-mono font-bold text-[#0F172A]">
                        {student.enrollmentNo || student.rollNo || 'EN2024CSE002'}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 border-r border-[#E2E8F0] h-14 justify-self-center" />

                  <div className="col-span-4 space-y-2">
                    <div>
                      <div className="text-[11px] font-medium text-[#64748B]">Year / Sem</div>
                      <div className="text-sm font-extrabold text-[#0F172A]">
                        {student.year || 'III'} / {student.currentSemester || '5'} (Sem {student.currentSemester || '5'} {deptCode})
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#64748B]">Section</div>
                      <div className="text-sm font-extrabold text-[#0F172A]">
                        Section {student.section || 'A'}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#BFDBFE] flex flex-col items-center justify-center text-[#93C5FD] p-1 bg-[#F8FAFC]">
                      <FaGraduationCap className="w-5 h-5 text-[#93C5FD] mb-0.5" />
                      <div className="text-[6px] font-black uppercase text-[#60A5FA]">
                        S.B. JAIN
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Notice Banner */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex items-center gap-2.5 text-[#334155] text-xs mb-4">
                <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 text-[10px] font-bold font-serif">
                  i
                </div>
                <p className="leading-snug text-[11.5px]">
                  The following institutional sections and assigned department faculty have verified academic requirements, practical records, and financial clearance for the above student.
                </p>
              </div>

              {/* 1. Institutional Sections Clearance Table */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px]">
                      <FaUniversity className="w-2.5 h-2.5" />
                    </div>
                    <h2 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide">
                      1. INSTITUTIONAL SECTIONS CLEARANCE
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#2563EB] font-semibold">Official Record</span>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-14 text-center">SR. NO.</th>
                        <th className="py-2.5 px-3 w-40">SECTION</th>
                        <th className="py-2.5 px-3">REMARKS / CLEARANCE STATUS</th>
                        <th className="py-2.5 px-3 text-center w-48">APPROVAL & SIGNATURE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {sections.map((sec, idx) => {
                        const theme = getSectionTheme(sec.sectionName, sec.department);
                        const isSecApproved = sec.status?.toLowerCase() === 'approved';
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 text-center">
                              <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-[#F1F5F9] text-[10px] font-bold text-[#475569]">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0F172A]">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-6 h-6 rounded-full ${theme.circleBg} flex items-center justify-center shrink-0`}>
                                  {theme.icon}
                                </div>
                                <span className="text-xs font-bold text-[#0F172A]">{theme.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[#334155] text-xs font-normal">
                                {sec.remarks || theme.defaultRemark}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {isSecApproved ? (
                                  <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold text-[10px]">
                                    <span className="w-3 h-3 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center text-[8px]">✓</span> Cleared
                                  </span>
                                ) : (
                                  <span className="text-rose-600 font-bold text-[10px]">Pending</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-col items-center justify-center">
                                {isSecApproved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                    <HiCheck className="w-3 h-3 stroke-[3]" /> CLEARED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-300">
                                    PENDING
                                  </span>
                                )}
                                <span className="text-[10px] text-[#64748B] mt-0.5">
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

              {/* 2. Faculty & Subject Clearance Table */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px]">
                      <FaGraduationCap className="w-2.5 h-2.5" />
                    </div>
                    <h2 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wide">
                      2. FACULTY & SUBJECT CLEARANCE ({deptCode})
                    </h2>
                  </div>
                  <span className="text-[10px] text-[#2563EB] font-semibold">Semester {student.currentSemester || '5'}</span>
                </div>

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-14 text-center">SR. NO.</th>
                        <th className="py-2.5 px-3">SUBJECT / COURSE TITLE</th>
                        <th className="py-2.5 px-3 w-40">SUBJECT IN-CHARGE (FACULTY)</th>
                        <th className="py-2.5 px-3">REMARKS</th>
                        <th className="py-2.5 px-3 text-center w-48">APPROVAL & SIGNATURE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {items.map((item, idx) => {
                        const isApproved = item.status?.toLowerCase() === 'approved';
                        return (
                          <tr key={idx} className={item.isReRun ? 'bg-rose-50/20' : ''}>
                            <td className="py-2.5 px-3 text-center">
                              <span className="w-5 h-5 inline-flex items-center justify-center rounded bg-[#F1F5F9] text-[10px] font-bold text-[#475569]">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0F172A]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-[#0F172A]">{item.title}</span>
                                {item.isReRun && (
                                  <span className="text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase bg-rose-100 text-rose-700 border border-rose-300">
                                    RE-RUN
                                  </span>
                                )}
                              </div>
                              {item.subjectCode && (
                                <span className="text-[9.5px] font-mono text-slate-500 block">
                                  {item.subjectCode}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0F172A] text-xs">
                              {item.teacherName || 'Prof. Faculty'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[#334155] text-xs font-normal">
                                {item.remarks || 'Assignments & Theory records cleared'}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-1 text-[#16A34A] font-bold text-[10px]">
                                    <span className="w-3 h-3 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center text-[8px]">✓</span> Cleared
                                  </span>
                                ) : (
                                  <span className="text-rose-600 font-bold text-[10px]">Pending</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-col items-center justify-center">
                                {isApproved ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                                    <HiCheck className="w-3 h-3 stroke-[3]" /> CLEARED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-300">
                                    PENDING
                                  </span>
                                )}
                                <span className="text-[10px] text-[#64748B] mt-0.5">
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

              {/* 3. Approval Workflow Cards with Official Stamps */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Class Incharge */}
                <div className="border border-[#86EFAC] bg-[#F0FDF4]/40 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold shrink-0">
                      <HiOutlineUser className="w-4 h-4 text-[#16A34A]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase text-[#15803D]">
                        ✓ CLASS IN-CHARGE APPROVAL
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Verified records & attendance
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="border-t-2 border-[#86EFAC] mb-2" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
                        CLASS IN-CHARGE ({deptCode} — SEC {student.section || 'A'})
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                        {classIncharge.name || `Prof. Class Incharge (Sec ${student.section || 'A'})`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* HOD with Stamp */}
                <div className="border border-[#DDD6FE] bg-[#FAF5FF]/50 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center font-bold shrink-0">
                        <FaShieldAlt className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase text-[#6D28D9]">
                          ★ FINAL HOD SIGN-OFF
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          Authorized Seal & Final Verification
                        </div>
                      </div>
                    </div>

                    {/* Official Stamp */}
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#7C3AED] bg-purple-100/50 flex flex-col items-center justify-center text-center p-1 transform rotate-[-6deg] shrink-0">
                      <div className="text-[5.5px] font-black uppercase text-[#6D28D9]">S.B. JAIN TECH</div>
                      <div className="text-[6.5px] font-black text-[#7C3AED] my-0.5">DEPT. OF {deptCode}</div>
                      <span className="bg-[#7C3AED] text-white text-[5px] font-extrabold px-1 py-0.2 rounded">
                        APPROVED
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="border-t-2 border-[#DDD6FE] mb-2" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">
                        HEAD OF DEPARTMENT ({deptCode})
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                        {hod.name || 'Dr. Kulkarni'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {deptName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Verifiable Reference Bar */}
              <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                    <HiCheck className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#0F172A]">
                      ClearMate Official Verifiable Report
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono">
                      Ref : <span className="font-bold text-[#2563EB]">{certificateNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <HiOutlineCalendarDays className="w-4 h-4 text-[#64748B] shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Generated on</span>
                    <span className="font-bold text-[#0F172A] text-xs">
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

                <div
                  className={`border rounded-lg px-3 py-1.5 flex items-center gap-2.5 ${
                    isCleared ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]' : 'bg-rose-50 border-rose-300 text-rose-700'
                  }`}
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold block leading-none">
                      Status
                    </span>
                    <span className="text-xs font-black uppercase tracking-wide">
                      {isCleared ? 'FINAL APPROVED' : 'PENDING'}
                    </span>
                  </div>
                  <div>
                    {isCleared ? <FaStamp className="w-3.5 h-3.5" /> : <FaHourglassHalf className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span>Reference ID: <strong className="font-mono text-slate-800">{certificateNumber}</strong></span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
            >
              {copied ? <HiOutlineCheck className="w-3.5 h-3.5" /> : <HiOutlineClipboardDocument className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 font-medium transition"
            >
              Close
            </button>
            {isCleared ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-5 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-xs shadow transition inline-flex items-center gap-2"
              >
                <HiOutlineArrowDownTray className="w-4 h-4" />
                {downloading ? 'Downloading...' : `Download Official PDF (Clearance_Report_${student.enrollmentNo || student.rollNo || 'Report'}.pdf)`}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="px-5 py-2 rounded-lg text-slate-400 bg-slate-200 border border-slate-300 font-bold text-xs cursor-not-allowed inline-flex items-center gap-2"
                title="Approvals Pending: Official certificate download is locked until all sections and faculty clear the student."
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                🔒 PDF Download Locked (Approvals Pending)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
