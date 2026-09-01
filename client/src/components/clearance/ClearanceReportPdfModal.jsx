import React, { useRef, useState } from 'react';
import {
  HiOutlineXMark,
  HiOutlinePrinter,
  HiOutlineArrowDownTray,
  HiOutlineMagnifyingGlassPlus,
  HiOutlineMagnifyingGlassMinus,
} from 'react-icons/hi2';
import { downloadClearancePdf, printClearanceReport } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

export default function ClearanceReportPdfModal({ isOpen, onClose, reportData }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);

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
  const deptName = program.name || program.department || 'Computer Science & Engineering';
  const isFinalApproved = (status || '').toUpperCase() === 'FINAL APPROVED' || (status || '').toUpperCase() === 'CLEARED';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const roll = student.enrollmentNo || student.rollNo || 'Student';
      const fileName = `Official_Clearance_Report_${roll}.pdf`;
      await downloadClearancePdf(documentRef.current, fileName, isFinalApproved);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Toolbar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              Official University Clearance Document
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  isFinalApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {isFinalApproved ? 'FINAL APPROVED' : 'PENDING APPROVALS'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Standard University Print-Ready A4 Document
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs text-slate-300 gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                className="p-1 hover:text-white rounded"
                title="Zoom Out"
              >
                <HiOutlineMagnifyingGlassMinus className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] px-1">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                className="p-1 hover:text-white rounded"
                title="Zoom In"
              >
                <HiOutlineMagnifyingGlassPlus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              <HiOutlinePrinter className="w-4 h-4 text-slate-300" />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition"
            >
              <HiOutlineArrowDownTray className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download PDF'}
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

        {/* Scrollable A4 Document View */}
        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-8 flex justify-center">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
          >
            <div
              ref={documentRef}
              id="official-clearance-card"
              className="bg-white text-black shadow-lg border border-black relative"
              style={{
                width: '794px',
                minHeight: '1050px',
                padding: '36px 40px',
                boxSizing: 'border-box',
                fontFamily: 'Times New Roman, Times, serif, Arial, sans-serif',
              }}
            >
              {/* Header Box */}
              <div className="text-center border-b-2 border-black pb-3 mb-4">
                <h1 className="text-[17px] font-bold uppercase tracking-wide text-black m-0">
                  S. B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR
                </h1>
                <p className="text-[11px] italic text-slate-700 mt-0.5">
                  (An Autonomous Institute Affiliated to R.T.M. Nagpur University)
                </p>
                <h2 className="text-[13.5px] font-bold uppercase text-black mt-1">
                  DEPARTMENT OF {deptName.toUpperCase()}
                </h2>
                <div className="text-[15px] font-bold uppercase tracking-wider text-black mt-2 underline">
                  STUDENT NO-DUES & ACADEMIC CLEARANCE CERTIFICATE
                </div>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  Session: {semester.session || '2024-2025 (EVEN)'} • Semester: {student.currentSemester || '5'} ({deptCode})
                </div>
              </div>

              {/* Student Details Meta Box */}
              <table className="w-full border-collapse border border-slate-700 text-xs mb-4">
                <tbody>
                  <tr className="border-b border-slate-700">
                    <td className="bg-slate-100 font-bold p-1.5 w-[20%] border-r border-slate-700">Student Name:</td>
                    <td className="p-1.5 font-bold text-slate-900 w-[30%] border-r border-slate-700">{student.name || '—'}</td>
                    <td className="bg-slate-100 font-bold p-1.5 w-[20%] border-r border-slate-700">Enrollment / Roll No:</td>
                    <td className="p-1.5 font-mono font-bold text-slate-900 w-[30%]">{student.enrollmentNo || student.rollNo || '—'}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold p-1.5 border-r border-slate-700">Program / Branch:</td>
                    <td className="p-1.5 font-semibold text-slate-900 border-r border-slate-700">{program.name || deptName} ({deptCode})</td>
                    <td className="bg-slate-100 font-bold p-1.5 border-r border-slate-700">Year / Section:</td>
                    <td className="p-1.5 font-semibold text-slate-900">Year {student.year || 'III'} • Section {student.section || 'A'}</td>
                  </tr>
                </tbody>
              </table>

              {/* 1. Institutional Sections Clearance Table */}
              <div className="mb-4">
                <div className="text-xs font-bold uppercase text-black mb-1 tracking-wide">
                  1. Institutional Sections Clearance (No Dues)
                </div>
                <table className="w-full border-collapse border border-slate-700 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-700 text-[10.5px] uppercase font-bold">
                      <th className="border border-slate-700 p-1.5 w-10 text-center">Sr.</th>
                      <th className="border border-slate-700 p-1.5 text-left w-44">Section / Department</th>
                      <th className="border border-slate-700 p-1.5 text-left">Clearance Remarks / Dues Status</th>
                      <th className="border border-slate-700 p-1.5 text-center w-24">Status</th>
                      <th className="border border-slate-700 p-1.5 text-left w-36">Authorized Signatory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec, idx) => {
                      const isApp = sec.status?.toLowerCase() === 'approved';
                      return (
                        <tr key={idx} className="border-b border-slate-700">
                          <td className="border border-slate-700 p-1.5 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-700 p-1.5 font-bold text-slate-900">{sec.sectionName || sec.department}</td>
                          <td className="border border-slate-700 p-1.5 text-slate-800">{sec.remarks || (isApp ? 'No Dues / Verified' : 'Pending Clearance')}</td>
                          <td className={`border border-slate-700 p-1.5 text-center font-bold ${isApp ? 'text-emerald-800 bg-emerald-50/50' : 'text-rose-800 bg-rose-50/50'}`}>
                            {isApp ? 'CLEARED' : 'PENDING'}
                          </td>
                          <td className="border border-slate-700 p-1.5 text-slate-600 text-[10px]">{sec.reviewerName || 'Authority'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2. Faculty & Subject Clearance Table */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase text-black mb-1 tracking-wide">
                  2. Academic Coursework & Subject Clearances ({deptCode})
                </div>
                <table className="w-full border-collapse border border-slate-700 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-700 text-[10.5px] uppercase font-bold">
                      <th className="border border-slate-700 p-1.5 w-10 text-center">Sr.</th>
                      <th className="border border-slate-700 p-1.5 text-left">Course Code & Title</th>
                      <th className="border border-slate-700 p-1.5 text-left w-44">Faculty In-Charge</th>
                      <th className="border border-slate-700 p-1.5 text-left">Coursework Status / Remarks</th>
                      <th className="border border-slate-700 p-1.5 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const isApp = item.status?.toLowerCase() === 'approved';
                      return (
                        <tr key={idx} className="border-b border-slate-700">
                          <td className="border border-slate-700 p-1.5 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-700 p-1.5 font-bold text-slate-900">
                            {item.title}
                            {item.subjectCode && <span className="font-mono text-[10px] text-slate-600 ml-1">[{item.subjectCode}]</span>}
                          </td>
                          <td className="border border-slate-700 p-1.5 font-semibold text-slate-800">{item.teacherName || 'Faculty'}</td>
                          <td className="border border-slate-700 p-1.5 text-slate-700">{item.remarks || (isApp ? 'Coursework & Records Cleared' : 'Evaluation pending')}</td>
                          <td className={`border border-slate-700 p-1.5 text-center font-bold ${isApp ? 'text-emerald-800 bg-emerald-50/50' : 'text-rose-800 bg-rose-50/50'}`}>
                            {isApp ? 'CLEARED' : 'PENDING'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Endorsement Box */}
              <div className="grid grid-cols-2 gap-12 mt-8 pt-2">
                <div className="text-center">
                  <div className="border-t border-black pt-2 font-bold text-xs">
                    Class In-Charge Signature
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {classIncharge.name || `Prof. Class Incharge (Sec ${student.section || 'A'})`}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Department of {deptCode}
                  </div>
                </div>

                <div className="text-center">
                  <div className="border-t border-black pt-2 font-bold text-xs">
                    Head of Department (HOD) Signature & Seal
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {hod.name || 'Dr. Kulkarni (HOD)'}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Department of {deptName}
                  </div>
                </div>
              </div>

              {/* Formal Footer */}
              <div className="mt-10 pt-2 border-t border-slate-400 flex items-center justify-between text-[10px] text-slate-600 font-sans">
                <div>
                  ClearMate ERP Reference: <strong className="font-mono text-black">{certificateNumber}</strong>
                </div>
                <div>
                  Issued: <strong>{new Date(issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </div>
                <div>
                  Status: <strong className={isFinalApproved ? 'text-emerald-800' : 'text-amber-800'}>{isFinalApproved ? 'APPROVED & ISSUED' : 'IN PROGRESS'}</strong>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
