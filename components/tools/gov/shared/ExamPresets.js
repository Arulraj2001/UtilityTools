// Official exam presets with exact dimensions and KB limits

export const EXAM_PRESETS = {
  photo: [
    { id: 'ssc-cgl', label: 'SSC CGL/CHSL', width: 100, height: 120, maxKB: 20, minKB: 4, format: 'jpg', note: '100×120 px, 4-20 KB' },
    { id: 'ssc-mts', label: 'SSC MTS/CPO', width: 100, height: 120, maxKB: 20, minKB: 4, format: 'jpg', note: '100×120 px, 4-20 KB' },
    { id: 'ibps-po', label: 'IBPS PO/Clerk', width: 200, height: 230, maxKB: 50, minKB: 20, format: 'jpg', note: '200×230 px, 20-50 KB' },
    { id: 'sbi-po', label: 'SBI PO/Clerk', width: 200, height: 230, maxKB: 50, minKB: 20, format: 'jpg', note: '200×230 px, 20-50 KB' },
    { id: 'rrb-ntpc', label: 'RRB NTPC', width: 100, height: 120, maxKB: 40, minKB: 10, format: 'jpg', note: '100×120 px, 10-40 KB' },
    { id: 'rrb-group-d', label: 'RRB Group D', width: 100, height: 120, maxKB: 40, minKB: 10, format: 'jpg', note: '100×120 px, 10-40 KB' },
    { id: 'upsc', label: 'UPSC CSE', width: 200, height: 240, maxKB: 300, minKB: 10, format: 'jpg', note: '200×240 px, up to 300 KB' },
    { id: 'tnpsc', label: 'TNPSC', width: 150, height: 200, maxKB: 30, minKB: 5, format: 'jpg', note: '150×200 px, 5-30 KB' },
    { id: 'passport', label: 'Passport Size', width: 354, height: 472, maxKB: 200, minKB: 20, format: 'jpg', note: '354×472 px (35×45mm @300dpi)' },
    { id: 'custom', label: 'Custom', width: null, height: null, maxKB: null, minKB: null, format: 'jpg', note: 'Set your own dimensions' },
  ],
  signature: [
    { id: 'ssc-sig', label: 'SSC Signature', width: 140, height: 60, maxKB: 12, minKB: 1, format: 'jpg', note: '140×60 px, 1-12 KB' },
    { id: 'ibps-sig', label: 'IBPS Signature', width: 140, height: 60, maxKB: 20, minKB: 10, format: 'jpg', note: '140×60 px, 10-20 KB' },
    { id: 'sbi-sig', label: 'SBI Signature', width: 140, height: 60, maxKB: 20, minKB: 10, format: 'jpg', note: '140×60 px, 10-20 KB' },
    { id: 'rrb-sig', label: 'RRB Signature', width: 140, height: 60, maxKB: 20, minKB: 4, format: 'jpg', note: '140×60 px, 4-20 KB' },
    { id: 'tnpsc-sig', label: 'TNPSC Signature', width: 140, height: 60, maxKB: 20, minKB: 5, format: 'jpg', note: '140×60 px, 5-20 KB' },
    { id: 'custom', label: 'Custom', width: null, height: null, maxKB: null, minKB: null, format: 'jpg', note: 'Set your own dimensions' },
  ],
  bankSignature: [
    { id: 'bank-default', label: 'Bank Signature', width: 140, height: 60, maxKB: 20, minKB: 8, format: 'jpg', note: '140×60 px, up to 20 KB' },
    { id: 'bank-clear', label: 'Clear Scan', width: 140, height: 60, maxKB: 15, minKB: 6, format: 'jpg', note: '140×60 px, up to 15 KB' },
    { id: 'custom', label: 'Custom', width: null, height: null, maxKB: null, minKB: null, format: 'jpg', note: 'Set your own dimensions' },
  ],
};

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function getFileSizeKB(bytes) {
  return (bytes / 1024).toFixed(1);
}