import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeNotificationTitle, isGenericTitle } from './titleNormalizer.js';

test('detects generic source titles', () => {
  assert.equal(isGenericTitle('Notification'), true);
  assert.equal(isGenericTitle('Recruitment'), true);
  assert.equal(isGenericTitle('Hindi /(370 KB)'), true);
  assert.equal(isGenericTitle('Advertisement No.05 - 2026'), false);
});

test('uses PDF URL context for generic titles', () => {
  const title = normalizeNotificationTitle({
    title: 'Hindi /(370 KB)',
    pdfUrl: 'https://sbi.bank.in/documents/77530/57941334/19052026_ENGAGEMENT+OF+APPRENTICE+2026+ADVERTISEMENT+CRPD_APPR_2026-27_07.pdf/fa9015ff?t=1',
    organization: 'State Bank of India',
  });

  assert.match(title, /Apprentice 2026/i);
  assert.doesNotMatch(title, /^Hindi/i);
});

test('falls back to organization notification when title and context are generic', () => {
  const title = normalizeNotificationTitle({
    title: 'Notification',
    context: 'Notification',
    organization: 'Tamil Nadu Public Service Commission',
  });

  assert.equal(title, 'Tamil Nadu Public Service Commission Job Notification');
});
