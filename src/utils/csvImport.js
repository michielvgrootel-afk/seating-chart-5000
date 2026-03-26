/**
 * CSV Import — parses a CSV file into class data with students and relationships.
 *
 * Expected CSV format (header row required):
 *   Class, Student Name, Prefer 1, Prefer 2, Prefer 3, Prefer 4, Prefer 5, Avoid 1, Avoid 2, Avoid 3, Avoid 4, Avoid 5
 *
 * - "Class" groups students into classes. All rows with the same class name belong to the same class.
 * - "Student Name" is the student's full name (first + last).
 * - "Prefer 1–5" are names of students this student works well with (optional).
 * - "Avoid 1–5" are names of students this student can't sit with (optional).
 *
 * Relationship names are matched case-insensitively against the student list.
 * No data is sent anywhere — this is pure client-side parsing.
 */

/**
 * Parse raw CSV text into an array of row objects.
 * Handles quoted fields, commas inside quotes, and CRLF/LF line endings.
 */
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === '\n' || ch === '\r') {
        lines.push(current);
        current = '';
        if (ch === '\r' && text[i + 1] === '\n') i++; // skip CRLF
      } else {
        current += ch;
      }
    }
  }
  if (current.length > 0) lines.push(current);

  // Split each line into fields
  return lines.map(line => {
    const fields = [];
    let field = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          q = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          q = true;
        } else if (ch === ',') {
          fields.push(field.trim());
          field = '';
        } else {
          field += ch;
        }
      }
    }
    fields.push(field.trim());
    return fields;
  });
}

/**
 * Normalise a header label to a known column key.
 * Returns null if the header isn't recognised.
 */
function normaliseHeader(raw) {
  const h = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h === 'class' || h === 'classname' || h === 'className') return 'class';
  if (h === 'studentname' || h === 'student' || h === 'name' || h === 'fullname') return 'student';
  if (/^prefer\d?$/.test(h) || /^workswellwith\d?$/.test(h) || /^cansit(with)?\d?$/.test(h)) {
    const num = h.match(/\d/)?.[0] ?? '1';
    return `prefer${num}`;
  }
  if (/^avoid\d?$/.test(h) || /^cantsit(with)?\d?$/.test(h) || /^cannotsit(with)?\d?$/.test(h)) {
    const num = h.match(/\d/)?.[0] ?? '1';
    return `avoid${num}`;
  }
  return null;
}

/**
 * Parse a CSV file and return structured class data.
 *
 * Returns: {
 *   classes: [
 *     {
 *       name: string,
 *       students: string[],   // names
 *       relationships: [{ studentA: string, studentB: string, type: 'avoid'|'prefer' }]
 *     }
 *   ],
 *   warnings: string[]
 * }
 */
export function parseClassCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row.');
  }

  // Map headers
  const headerRow = rows[0];
  const colMap = {}; // index → key
  for (let i = 0; i < headerRow.length; i++) {
    const key = normaliseHeader(headerRow[i]);
    if (key) colMap[i] = key;
  }

  if (!Object.values(colMap).includes('class')) {
    throw new Error('CSV must have a "Class" column.');
  }
  if (!Object.values(colMap).includes('student')) {
    throw new Error('CSV must have a "Student Name" column.');
  }

  const warnings = [];
  const classMap = new Map(); // className → { students: Set, rawRelationships: [] }

  // Parse data rows
  for (let r = 1; r < rows.length; r++) {
    const fields = rows[r];
    // Skip empty rows
    if (fields.every(f => f === '')) continue;

    const rowData = {};
    for (const [idx, key] of Object.entries(colMap)) {
      rowData[key] = fields[idx] ?? '';
    }

    const className = rowData.class;
    const studentName = rowData.student;

    if (!className || !studentName) {
      warnings.push(`Row ${r + 1}: missing class name or student name — skipped.`);
      continue;
    }

    // Get or create class entry
    if (!classMap.has(className)) {
      classMap.set(className, { students: new Set(), rawRelationships: [] });
    }
    const classEntry = classMap.get(className);
    classEntry.students.add(studentName);

    // Collect relationship names
    for (let p = 1; p <= 5; p++) {
      const preferName = rowData[`prefer${p}`];
      if (preferName) {
        classEntry.rawRelationships.push({
          studentA: studentName,
          studentB: preferName,
          type: 'prefer',
        });
      }
      const avoidName = rowData[`avoid${p}`];
      if (avoidName) {
        classEntry.rawRelationships.push({
          studentA: studentName,
          studentB: avoidName,
          type: 'avoid',
        });
      }
    }
  }

  if (classMap.size === 0) {
    throw new Error('No valid data rows found in the CSV.');
  }

  // Build output
  const classes = [];
  for (const [name, entry] of classMap) {
    const studentNames = [...entry.students];
    // Build a case-insensitive lookup
    const nameLookup = new Map();
    for (const n of studentNames) {
      nameLookup.set(n.toLowerCase(), n);
    }

    // Deduplicate relationships (A→B same as B→A with same type)
    const relSet = new Set();
    const relationships = [];

    for (const raw of entry.rawRelationships) {
      const matchedB = nameLookup.get(raw.studentB.toLowerCase());
      if (!matchedB) {
        warnings.push(`Class "${name}": relationship target "${raw.studentB}" (from ${raw.studentA}) not found in student list — skipped.`);
        continue;
      }
      if (matchedB.toLowerCase() === raw.studentA.toLowerCase()) {
        continue; // self-relationship
      }
      // Dedup key: sorted pair + type
      const pair = [raw.studentA.toLowerCase(), matchedB.toLowerCase()].sort().join('|||');
      const key = `${pair}::${raw.type}`;
      if (relSet.has(key)) continue;
      relSet.add(key);

      relationships.push({
        studentA: raw.studentA,
        studentB: matchedB,
        type: raw.type,
      });
    }

    classes.push({ name, students: studentNames, relationships });
  }

  return { classes, warnings };
}

/**
 * Open a file picker for CSV upload. Returns parsed class data.
 */
export function loadCSVFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';

    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error('No file selected'));

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = parseClassCSV(ev.target.result);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}

/**
 * Download a blank CSV template that colleagues can fill in.
 */
export function downloadCSVTemplate() {
  const header = 'Class,Student Name,Prefer 1,Prefer 2,Prefer 3,Prefer 4,Prefer 5,Avoid 1,Avoid 2,Avoid 3,Avoid 4,Avoid 5';
  const example1 = 'Period 1 - English,Amy Garcia,Ben Torres,,,,,Susan Lee,,,,';
  const example2 = 'Period 1 - English,Ben Torres,,,,,,,,,,';
  const example3 = 'Period 1 - English,Susan Lee,,,,,Amy Garcia,,,,,';
  const example4 = 'Period 2 - Math,Amy Garcia,Carlos Diaz,,,,,,,,, ';
  const example5 = 'Period 2 - Math,Carlos Diaz,,,,,,,,,,';

  const csv = [header, example1, example2, example3, example4, example5].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'seating-chart-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
