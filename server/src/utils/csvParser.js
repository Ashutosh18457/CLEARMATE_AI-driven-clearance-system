/**
 * RFC-4180 compliant CSV text parser.
 * Correctly handles quoted fields, escaped quotes (""), CRLF/LF line breaks, and whitespace trimming.
 *
 * @param {string} text - Raw CSV string content
 * @returns {{ headers: string[], normalizedHeaders: string[], rows: Array<{ line: number, raw: object, normalized: object }> }}
 */
function parseCsv(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { headers: [], normalizedHeaders: [], rows: [] };
  }

  const lines = [];
  let currentField = '';
  let inQuotes = false;
  let currentLine = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Skip \n in CRLF
        currentLine.push(currentField.trim());
        if (currentLine.some((f) => f.length > 0)) lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else if (char === '\n') {
        currentLine.push(currentField.trim());
        if (currentLine.some((f) => f.length > 0)) lines.push(currentLine);
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some((f) => f.length > 0)) lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], normalizedHeaders: [], rows: [] };
  }

  // First non-empty line is headers
  const rawHeaders = lines[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeaderKey);

  const rows = [];
  for (let idx = 1; idx < lines.length; idx++) {
    const rowLine = lines[idx];
    const rawObj = {};
    const normalizedObj = {};

    rawHeaders.forEach((header, colIdx) => {
      const val = rowLine[colIdx] !== undefined ? rowLine[colIdx] : '';
      rawObj[header] = val;
      const normKey = normalizedHeaders[colIdx];
      if (normKey) {
        normalizedObj[normKey] = val;
      }
    });

    rows.push({
      line: idx + 1, // 1-indexed (header is line 1)
      raw: rawObj,
      normalized: normalizedObj,
    });
  }

  return {
    headers: rawHeaders,
    normalizedHeaders,
    rows,
  };
}

/**
 * Normalizes CSV column names to schema keys.
 */
function normalizeHeaderKey(header) {
  if (!header || typeof header !== 'string') return '';
  const clean = header.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (['student_id', 'studentid', 'roll_number', 'rollno', 'enrollmentno', 'enrollment_no'].includes(clean)) {
    return 'enrollmentNo';
  }
  if (['full_name', 'fullname', 'name', 'student_name'].includes(clean)) {
    return 'name';
  }
  if (['email', 'email_address'].includes(clean)) {
    return 'email';
  }
  if (['department', 'dept', 'program', 'program_code', 'course'].includes(clean)) {
    return 'department';
  }
  if (['semester', 'sem', 'current_semester'].includes(clean)) {
    return 'semester';
  }
  if (['section', 'sec'].includes(clean)) {
    return 'section';
  }
  return clean;
}

module.exports = { parseCsv, normalizeHeaderKey };
