import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a high-resolution A4 PDF of the official clearance report.
 * @param {HTMLElement|string} elementOrId - The DOM element or its ID to capture
 * @param {string} fileName - Destination filename
 * @param {boolean} isCleared - Approval flag
 */
export async function downloadClearancePdf(elementOrId, fileName = 'Clearance_Report.pdf', isCleared = true) {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    throw new Error('Report element not found for PDF export');
  }

  const canvas = await html2canvas(element, {
    scale: 2.5, // High resolution for crystal clear text
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth - 16; // 8mm margin on left and right
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const posX = 8;
  const posY = 8;

  if (imgHeight <= pdfHeight - 16) {
    pdf.addImage(imgData, 'PNG', posX, posY, imgWidth, imgHeight, undefined, 'FAST');
  } else {
    let heightLeft = imgHeight;
    let position = posY;

    pdf.addImage(imgData, 'PNG', posX, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', posX, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }
  }

  pdf.save(fileName);
}

/**
 * Generates a clean, simple, official university print window for immediate physical printing or browser PDF saving.
 */
export function printClearanceReport(data) {
  if (!data) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const deptCode = data.program?.code || 'CSE';
  const deptName = data.program?.name || data.program?.department || 'Computer Science & Engineering';
  const student = data.student || {};
  const semester = data.semester || {};
  const sections = data.sections || [];
  const items = data.items || [];
  const classIncharge = data.classIncharge || {};
  const hod = data.hod || {};
  const isFinalApproved = (data.status || '').toUpperCase() === 'FINAL APPROVED' || (data.status || '').toUpperCase() === 'CLEARED';

  const sectionsRowsHtml = sections.map((s, idx) => {
    const isApp = s.status?.toLowerCase() === 'approved';
    return `
      <tr>
        <td style="text-align: center; font-weight: 600; width: 40px; padding: 6px 8px; border: 1px solid #334155;">${idx + 1}</td>
        <td style="font-weight: 600; color: #0f172a; padding: 6px 8px; border: 1px solid #334155;">${s.sectionName || s.department}</td>
        <td style="color: #334155; padding: 6px 8px; border: 1px solid #334155;">${s.remarks || (isApp ? 'No Dues / Verified' : 'Pending Clearance')}</td>
        <td style="text-align: center; font-weight: 700; color: ${isApp ? '#166534' : '#991b1b'}; width: 90px; padding: 6px 8px; border: 1px solid #334155;">
          ${isApp ? 'CLEARED' : 'PENDING'}
        </td>
        <td style="color: #475569; font-size: 10px; width: 140px; padding: 6px 8px; border: 1px solid #334155;">${s.reviewerName || 'Section Authority'}</td>
      </tr>
    `;
  }).join('');

  const itemsRowsHtml = items.map((item, idx) => {
    const isApp = item.status?.toLowerCase() === 'approved';
    return `
      <tr>
        <td style="text-align: center; font-weight: 600; width: 40px; padding: 6px 8px; border: 1px solid #334155;">${idx + 1}</td>
        <td style="font-weight: 600; color: #0f172a; padding: 6px 8px; border: 1px solid #334155;">
          ${item.title}
          ${item.subjectCode ? `<span style="font-size: 9.5px; color: #64748b; font-family: monospace; display: block;">[${item.subjectCode}]</span>` : ''}
        </td>
        <td style="color: #334155; padding: 6px 8px; border: 1px solid #334155;">${item.teacherName || 'Faculty In-charge'}</td>
        <td style="color: #475569; padding: 6px 8px; border: 1px solid #334155;">${item.remarks || (isApp ? 'Coursework & Records Cleared' : 'Evaluation in progress')}</td>
        <td style="text-align: center; font-weight: 700; color: ${isApp ? '#166534' : '#991b1b'}; width: 90px; padding: 6px 8px; border: 1px solid #334155;">
          ${isApp ? 'CLEARED' : 'PENDING'}
        </td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clearance Certificate - ${student.name || 'Student'} (${student.enrollmentNo || student.rollNo || ''})</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif, Arial, sans-serif; margin: 0; padding: 12px; background: #ffffff; color: #000000; font-size: 11.5px; line-height: 1.35; }
        .document-wrapper { border: 2px solid #000000; padding: 22px 26px; background: #ffffff; min-height: 980px; position: relative; }
        
        .header-box { text-align: center; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 14px; }
        .inst-title { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; color: #000000; }
        .inst-sub { font-size: 10.5px; font-style: italic; color: #333333; margin-top: 2px; }
        .dept-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 5px; color: #000000; }
        .doc-heading { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; text-decoration: underline; }
        .session-info { font-size: 11px; font-weight: bold; margin-top: 4px; }

        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
        .meta-table td { padding: 4px 6px; border: 1px solid #334155; }
        .meta-label { font-weight: bold; width: 18%; background: #f1f5f9; }
        .meta-val { width: 32%; font-weight: 600; }

        .section-title { font-size: 11.5px; font-weight: bold; text-transform: uppercase; margin: 12px 0 5px 0; letter-spacing: 0.3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
        .data-table th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; padding: 6px 8px; border: 1px solid #334155; text-align: left; }
        .data-table td { border: 1px solid #334155; vertical-align: middle; }

        .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; padding-top: 10px; }
        .sign-block { text-align: center; }
        .sign-line { border-top: 1px solid #000000; margin-top: 45px; padding-top: 5px; font-size: 11px; font-weight: bold; }
        .sign-sub { font-size: 10px; color: #444444; }

        .footer-note { margin-top: 30px; border-top: 1px solid #666666; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9.5px; color: #555555; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div class="document-wrapper">
        <div class="header-box">
          <div class="inst-title">S. B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR</div>
          <div class="inst-sub">(An Autonomous Institute Affiliated to R.T.M. Nagpur University)</div>
          <div class="dept-title">DEPARTMENT OF ${deptName.toUpperCase()}</div>
          <div class="doc-heading">STUDENT NO-DUES & CLEARANCE CERTIFICATE</div>
          <div class="session-info">Session: ${semester.session || '2024-2025 (EVEN)'} • Semester: ${student.currentSemester || '5'} (${deptCode})</div>
        </div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Student Name:</td>
            <td class="meta-val">${student.name || '—'}</td>
            <td class="meta-label">Enrollment / Roll No:</td>
            <td class="meta-val" style="font-family: monospace;">${student.enrollmentNo || student.rollNo || '—'}</td>
          </tr>
          <tr>
            <td class="meta-label">Program / Branch:</td>
            <td class="meta-val">${data.program?.name || deptName} (${deptCode})</td>
            <td class="meta-label">Year / Section:</td>
            <td class="meta-val">Year ${student.year || 'III'} • Section ${student.section || 'A'}</td>
          </tr>
        </table>

        <div class="section-title">1. Institutional Sections Clearance (No Dues)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">Sr. No.</th>
              <th>Institutional Department / Section</th>
              <th>Clearance Remarks / Dues Status</th>
              <th style="width: 90px; text-align: center;">Status</th>
              <th style="width: 140px;">Authorized Reviewer</th>
            </tr>
          </thead>
          <tbody>${sectionsRowsHtml}</tbody>
        </table>

        <div class="section-title">2. Academic Coursework & Subject Clearances</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">Sr. No.</th>
              <th>Course Code & Title</th>
              <th>Faculty In-Charge</th>
              <th>Coursework Status / Remarks</th>
              <th style="width: 90px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>${itemsRowsHtml}</tbody>
        </table>

        <div class="sign-grid">
          <div class="sign-block">
            <div class="sign-line">Class In-Charge Signature</div>
            <div>${classIncharge.name || `Prof. Class Incharge (Sec ${student.section || 'A'})`}</div>
            <div class="sign-sub">Department of ${deptCode}</div>
          </div>
          <div class="sign-block">
            <div class="sign-line">Head of Department (HOD) Signature</div>
            <div>${hod.name || 'Dr. Kulkarni (HOD)'}</div>
            <div class="sign-sub">Department of ${deptName}</div>
          </div>
        </div>

        <div class="footer-note">
          <div>ClearMate Official ERP Reference: <strong>${data.certificateNumber || 'CM-2026-CSE002'}</strong></div>
          <div>Issue Date: <strong>${new Date(data.issuedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
          <div>Clearance Status: <strong>${isFinalApproved ? 'APPROVED & ISSUED' : 'IN REVIEW / PENDING'}</strong></div>
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
