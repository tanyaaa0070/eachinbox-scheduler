import { describe, it, expect } from 'vitest';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const COMMON_HEADER_NAMES = ['email', 'e-mail', 'mail', 'email address', 'email_address', 'recipient', 'to', 'emails', 'recipients'];

function parseCsvOrText(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { validEmails: [], invalidEmails: [], duplicateCount: 0, detectedColumn: null };
  }

  const firstLine = lines[0];
  const delimiter = firstLine.includes(',') ? ',' : firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : null;

  let emailColIdx = -1;
  let detectedColumn: string | null = null;
  let startIdx = 0;

  if (delimiter) {
    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    for (let i = 0; i < headers.length; i++) {
      if (COMMON_HEADER_NAMES.includes(headers[i])) {
        emailColIdx = i;
        detectedColumn = headers[i];
        startIdx = 1;
        break;
      }
    }
  } else {
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
      const parts = line.split(delimiter);
      const match = parts.find((p) => p.includes('@'));
      if (match) candidate = match.trim().replace(/^["']|["']$/g, '');
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

  return { validEmails, invalidEmails, duplicateCount, detectedColumn };
}

describe('CSV Intelligence & Lead Parsing', () => {
  it('should auto-detect email header column and extract valid emails', () => {
    const csv = `Name,Email,Company\nJohn Doe,john@example.com,Acme Inc\nJane Smith,jane@test.org,Global`;
    const result = parseCsvOrText(csv);

    expect(result.detectedColumn).toBe('email');
    expect(result.validEmails).toEqual(['john@example.com', 'jane@test.org']);
    expect(result.invalidEmails).toHaveLength(0);
    expect(result.duplicateCount).toBe(0);
  });

  it('should filter invalid email addresses and remove duplicates', () => {
    const csv = `email\nalice@reachinbox.io\ninvalid-email-here\nalice@reachinbox.io\nbob@domain.com\nnot_an_email@`;
    const result = parseCsvOrText(csv);

    expect(result.validEmails).toEqual(['alice@reachinbox.io', 'bob@domain.com']);
    expect(result.duplicateCount).toBe(1); // alice duplicated
    expect(result.invalidEmails).toEqual(['invalid-email-here', 'not_an_email@']);
  });

  it('should parse plain text newline-separated email lists', () => {
    const txt = `user1@example.com\nuser2@example.com\nuser1@example.com\nuser3@example.com`;
    const result = parseCsvOrText(txt);

    expect(result.validEmails).toEqual(['user1@example.com', 'user2@example.com', 'user3@example.com']);
    expect(result.duplicateCount).toBe(1);
  });
});
