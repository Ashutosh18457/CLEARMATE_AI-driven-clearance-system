import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a high-resolution A4 PDF of the official clearance report.
 * Blocks download if clearance is not 100% approved.
 * @param {HTMLElement|string} elementOrId - The DOM element or its ID to capture
 * @param {string} fileName - Destination filename
 * @param {boolean} isCleared - Approval flag
 */
export async function downloadClearancePdf(elementOrId, fileName = 'Clearance_Report.pdf', isCleared = true) {
  if (isCleared === false) {
    throw new Error('Clearance is incomplete. All institutional sections and faculty approvals must be cleared before downloading the official certificate.');
  }

  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    throw new Error('Report element not found for PDF export');
  }

  const canvas = await html2canvas(element, {
    scale: 2.5, // High resolution for crystal clear text and stamps
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
 * Generates an official university print window for immediate physical printing or browser PDF saving.
 * Enforces approval verification.
 */
export function printClearanceReport(data) {
  if (!data) return;

  const allSectionsCleared = (data.sections || []).length > 0 && (data.sections || []).every((s) => s.status?.toLowerCase() === 'approved');
  const allItemsCleared = (data.items || []).length > 0 && (data.items || []).every((i) => i.status?.toLowerCase() === 'approved');
  const isApproved = (data.status || '').toUpperCase() === 'FINAL APPROVED' || (allSectionsCleared && allItemsCleared);

  if (!isApproved) {
    alert('Clearance Incomplete!\n\nThe official university clearance certificate can ONLY be generated after all Institutional Sections, Faculty Coursework, Class Incharge, and HOD approvals are cleared.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const sectionsHtml = (data.sections || []).map((s, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 600; width: 45px;">${idx + 1}</td>
      <td style="font-weight: 600; color: #0f172a;">${s.sectionName || s.department}</td>
      <td style="color: #475569;">${s.remarks || 'No Dues / Verified'}</td>
      <td style="text-align: center; width: 140px;">
        <span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; border-radius: 9999px; background: #dcfce7; color: #15803d; border: 1px solid #86efac;">
          ✓ CLEARED
        </span>
        <span style="display: block; font-size: 9px; color: #64748b; margin-top: 2px;">${s.reviewerName || 'Authority'}</span>
      </td>
    </tr>
  `).join('');

  const itemsHtml = (data.items || []).map((item, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 600; width: 45px;">${idx + 1}</td>
      <td style="font-weight: 600; color: #0f172a;">
        ${item.title}
        ${item.subjectCode ? `<span style="font-size: 9.5px; color: #64748b; display: block; font-family: monospace;">Code: ${item.subjectCode}</span>` : ''}
      </td>
      <td style="color: #334155; font-weight: 500;">${item.teacherName || 'Faculty'}</td>
      <td style="color: #475569;">${item.remarks || 'Assignments & Theory records cleared'}</td>
      <td style="text-align: center; width: 140px;">
        <span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; border-radius: 9999px; background: #dcfce7; color: #15803d; border: 1px solid #86efac;">
          ✓ CLEARED
        </span>
        <span style="display: block; font-size: 9px; color: #64748b; margin-top: 2px;">${item.teacherName || 'Faculty'}</span>
      </td>
    </tr>
  `).join('');

  const hodName = data.hod?.name || 'Dr. Kulkarni (HOD - CSE)';
  const deptName = data.program?.name || 'Computer Science & Engineering';
  const deptCode = data.program?.code || 'CSE';
  const isCleared = (data.status || '').toUpperCase() === 'CLEARED' || (data.status || '').toUpperCase() === 'COMPLETED';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Clearance Report - ${data.student?.name} (${data.student?.enrollmentNo})</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 10px; background: #fff; color: #0f172a; font-size: 11.5px; line-height: 1.35; }
        .document-wrapper { border: 2px solid #1e3a8a; padding: 24px 28px; position: relative; background: #ffffff; min-height: 980px; }
        .watermark { position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 58px; font-weight: 800; color: rgba(30, 58, 138, 0.04); text-transform: uppercase; pointer-events: none; white-space: nowrap; font-family: 'Outfit', sans-serif; letter-spacing: 4px; border: 4px dashed rgba(30,58,138,0.06); padding: 15px 40px; }
        .inst-header { text-align: center; border-bottom: 2px solid #2547d0; padding-bottom: 10px; margin-bottom: 12px; }
        .inst-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.4px; }
        .dept-title { font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 700; color: #2547d0; margin-top: 3px; text-transform: uppercase; }
        .doc-title-pill { display: inline-block; background: #eff6ff; color: #1e40af; border: 1.5px solid #93c5fd; padding: 4px 18px; border-radius: 4px; font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 800; letter-spacing: 1px; margin-top: 8px; text-transform: uppercase; }
        .session-subtitle { font-size: 12px; font-weight: 700; color: #475569; margin-top: 4px; }
        
        .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin: 12px 0; }
        .grid-row { display: flex; align-items: baseline; gap: 6px; }
        .grid-label { font-weight: 600; color: #475569; min-width: 80px; font-size: 11px; text-transform: uppercase; }
        .grid-val { font-weight: 700; color: #0f172a; border-bottom: 1px dotted #cbd5e1; flex: 1; font-size: 12px; }

        .section-heading { font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin: 12px 0 6px 0; letter-spacing: 0.3px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
        .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
        .data-table th { background: #f1f5f9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 10px; }

        .workflow-box { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
        .stage-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #fafafa; }
        .stamp-wrapper { display: flex; justify-content: flex-end; margin-top: -10px; }
        .official-stamp { width: 120px; height: 120px; border-radius: 50%; border: 2px dashed #1e40af; background: rgba(239, 246, 255, 0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; transform: rotate(-5deg); padding: 6px; }
        
        .footer-verif { display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #cbd5e1; padding-top: 8px; margin-top: 18px; font-size: 10px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="document-wrapper">
        <div class="watermark">OFFICIAL CLEARANCE DOCUMENT</div>

        <div class="inst-header">
          <div class="inst-name">S.B. JAIN INSTITUTE OF TECHNOLOGY, MANAGEMENT & RESEARCH, NAGPUR</div>
          <div class="dept-title">DEPARTMENT OF ${deptName.toUpperCase()} (${deptCode.toUpperCase()})</div>
          <div class="doc-title-pill">STUDENT CLEARANCE REPORT</div>
          <div class="session-subtitle">${deptCode} — (${data.semester?.session || 'Session 2024-25 (EVEN)'})</div>
        </div>

        <div class="student-grid">
          <div class="grid-row"><span class="grid-label">Student Name:</span><span class="grid-val">${data.student?.name || '—'}</span></div>
          <div class="grid-row"><span class="grid-label">Year / Sem:</span><span class="grid-val">${data.student?.year || 'III'} / ${data.student?.currentSemester || '6'} (Sem ${data.student?.currentSemester || '6'} ${deptCode})</span></div>
          <div class="grid-row"><span class="grid-label">Roll / Enr No:</span><span class="grid-val">${data.student?.enrollmentNo || '—'}</span></div>
          <div class="grid-row"><span class="grid-label">Section:</span><span class="grid-val">${data.student?.section || 'A'}</span></div>
        </div>

        <div style="font-size: 10.5px; color: #475569; font-style: italic; background: #eff6ff; padding: 5px 10px; border-left: 3px solid #2547d0; margin-bottom: 8px;">
          The following sections and subject faculty have verified and cleared all institutional requirements, practical records, and financial dues for the above student.
        </div>

        <div class="section-heading">1. INSTITUTIONAL SECTIONS CLEARANCE</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">SR. NO.</th>
              <th>SECTION</th>
              <th>REMARKS / CLEARANCE STATUS</th>
              <th style="text-align: center; width: 140px;">APPROVAL & SIGNATURE</th>
            </tr>
          </thead>
          <tbody>${sectionsHtml}</tbody>
        </table>

        <div class="section-heading">2. FACULTY & SUBJECT CLEARANCE</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">SR. NO.</th>
              <th>SUBJECT / COURSE TITLE</th>
              <th>SUBJECT IN-CHARGE (FACULTY)</th>
              <th>REMARKS</th>
              <th style="text-align: center; width: 140px;">APPROVAL & SIGNATURE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="workflow-box">
          <div class="stage-card">
            <div style="font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase;">✓ STAGE 3: CLASS IN-CHARGE APPROVAL</div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Verified records & attendance requirements</div>
            <div style="margin-top: 20px; border-top: 1px dotted #94a3b8; padding-top: 4px;">
              <div style="font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">CLASS IN-CHARGE</div>
              <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">${data.classIncharge?.name || 'Prof. Class Incharge (Sec A)'}</div>
            </div>
          </div>

          <div class="stage-card" style="position: relative;">
            <div style="font-size: 10px; font-weight: 700; color: #1e40af; text-transform: uppercase;">★ FINAL STAGE: DEPARTMENT HOD SIGN-OFF</div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Authorized Seal & Final Verification</div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px;">
              <div style="border-top: 1px dotted #94a3b8; padding-top: 4px; flex: 1;">
                <div style="font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase;">HEAD OF DEPARTMENT</div>
                <div style="font-size: 11.5px; font-weight: 700; color: #0f172a;">${hodName}</div>
                <div style="font-size: 9px; color: #475569;">Dept. of ${deptName}</div>
              </div>
              
              <div class="official-stamp">
                <div style="font-size: 6.5px; font-weight: 800; color: #1e3a8a;">S.B. JAIN INST OF TECH</div>
                <div style="font-size: 7.5px; font-weight: 800; color: #1e40af; margin: 1px 0;">DEPT. OF ${deptCode}</div>
                <div style="background: #1e40af; color: #fff; font-size: 6.5px; font-weight: 800; padding: 1px 4px; border-radius: 2px;">APPROVED</div>
                <div style="font-size: 6.5px; font-weight: 700; color: #0f172a; margin-top: 1px;">${hodName.slice(0, 16)}</div>
                <div style="font-size: 6px; color: #475569;">OFFICIAL SEAL</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-verif">
          <div>
            <strong>ClearMate Official Verifiable Report</strong> • Ref: <code>${data.certificateNumber || 'CM-2026-CSE002'}</code>
          </div>
          <div>
            Generated on: <strong>${new Date(data.issuedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
          <div>
            Status: <span style="font-weight: 800; color: ${isCleared ? '#15803d' : '#d97706'}">${data.status || 'IN PROGRESS'}</span>
          </div>
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
