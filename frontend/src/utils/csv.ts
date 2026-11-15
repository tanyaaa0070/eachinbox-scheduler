export interface CsvParseResult {
  validEmails: string[];
  invalidEmails: string[];
  duplicateCount: number;
  detectedColumn: string | null;
  totalRows: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const COMMON_HEADER_NAMES = ['email', 'e-mail', 'mail', 'email address', 'email_address', 'recipient', 'to', 'emails', 'recipients'];

export function parseCsvOrText(content: string): CsvParseResult {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return {
      validEmails: [],
      invalidEmails: [],
      duplicateCount: 0,
      detectedColumn: null,
      totalRows: 0,
    };
  }

  // Check if first row is a CSV header
  const firstLine = lines[0];
  const delimiter = firstLine.includes(',') ? ',' : firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : null;

  let emailColIdx = -1;
  let detectedColumn: string | null = null;
  let startIdx = 0;

  if (delimiter) {
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    // Auto-detect email column header name
    for (let i = 0; i < headers.length; i++) {
      if (COMMON_HEADER_NAMES.includes(headers[i])) {
        emailColIdx = i;
        detectedColumn = headers[i];
        startIdx = 1;
        break;
      }
    }

    // If no header matched keywords, check if header itself is an email
    if (emailColIdx === -1) {
      const isHeaderEmail = headers.some(h => EMAIL_REGEX.test(h));
      if (!isHeaderEmail) {
        const sampleRow = (lines.length > 1 ? lines[1] : firstLine).split(delimiter);
        for (let i = 0; i < sampleRow.length; i++) {
          if (sampleRow[i].includes('@')) {
            emailColIdx = i;
            detectedColumn = headers[i] || `Column ${i + 1}`;
            startIdx = 1;
            break;
          }
        }
      }
    }
  } else {
    // Single column TXT or CSV without commas: check if first line is a header title like "email"
    const cleanedFirst = firstLine.toLowerCase().replace(/^["']|["']$/g, '');
    if (COMMON_HEADER_NAMES.includes(cleanedFirst)) {
      startIdx = 1;
      detectedColumn = cleanedFirst;
    }
  }

  const seen = new Set<string>();
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  let duplicateCount = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    let candidate = line;

    if (delimiter && emailColIdx !== -1) {
      const parts = line.split(delimiter);
      candidate = parts[emailColIdx]?.trim().replace(/^["']|["']$/g, '') || '';
    } else if (delimiter) {
      // Find the first token with @ in the row
      const parts = line.split(delimiter);
      const match = parts.find(p => p.includes('@'));
      if (match) {
        candidate = match.trim().replace(/^["']|["']$/g, '');
      }
    }

    candidate = candidate.toLowerCase().trim();

    if (!candidate) continue;

    if (EMAIL_REGEX.test(candidate)) {
      if (seen.has(candidate)) {
        duplicateCount++;
      } else {
        seen.add(candidate);
        validEmails.push(candidate);
      }
    } else {
      invalidEmails.push(candidate);
    }
  }

  return {
    validEmails,
    invalidEmails,
    duplicateCount,
    detectedColumn: detectedColumn || 'email',
    totalRows: lines.length - startIdx,
  };
}
