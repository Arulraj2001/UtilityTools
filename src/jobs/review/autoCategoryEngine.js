import { clampScore, compact, normalizeText, unique } from './reviewUtils.js';

export const CATEGORY_NAMES = [
  'TNPSC',
  'SSC',
  'UPSC',
  'Railway',
  'Banking',
  'Defence',
  'Teaching',
  'Medical',
  'Engineering',
  'State Government',
  'Central Government',
];

const SIGNALS = [
  { category: 'TNPSC', patterns: ['tnpsc', 'tamil nadu public service commission', 'tnpsc.gov.in'], weight: 55 },
  { category: 'SSC', patterns: ['ssc', 'staff selection commission', 'ssc.gov.in', 'ssc.nic.in', 'cgl', 'chsl', 'mts'], weight: 50 },
  { category: 'UPSC', patterns: ['upsc', 'union public service commission', 'upsc.gov.in', 'civil services', 'nda', 'cds'], weight: 50 },
  { category: 'Railway', patterns: ['railway', 'rrb', 'rrc', 'indian railways', 'rrbcdg.gov.in'], weight: 45 },
  { category: 'Banking', patterns: ['bank', 'ibps', 'sbi', 'rbi', 'nabard', 'probationary officer', 'clerk'], weight: 45 },
  { category: 'Defence', patterns: ['defence', 'defense', 'army', 'navy', 'air force', 'drdo', 'bsf', 'cisf', 'crpf'], weight: 45 },
  { category: 'Teaching', patterns: ['teacher', 'teaching', 'professor', 'lecturer', 'tet', 'ugc net', 'education department'], weight: 35 },
  { category: 'Medical', patterns: ['medical', 'doctor', 'nurse', 'nursing', 'mbbs', 'nhm', 'health department'], weight: 35 },
  { category: 'Engineering', patterns: ['engineer', 'engineering', 'je ', 'junior engineer', 'civil engineer', 'mechanical engineer'], weight: 35 },
  { category: 'State Government', patterns: ['state government', 'tamil nadu', 'kerala', 'karnataka', 'maharashtra', 'rajasthan', 'uttar pradesh'], weight: 25 },
  { category: 'Central Government', patterns: ['central government', 'government of india', 'ministry of', '.gov.in', '.nic.in'], weight: 25 },
];

const sourceFields = (input = {}) => {
  const draft = input.draft?.generated_data || input.generatedData || input.draft || {};
  const queue = input.queueItem || {};
  const raw = input.rawNotification || {};
  const source = input.source || {};
  return [
    ['source_domain', source.url || raw.notification_url || queue.source_url],
    ['organization', draft.organization || queue.organization || raw.organization || source.name],
    ['title', draft.title || queue.title || raw.title],
    ['source_category', source.category || queue.job_type || draft.category],
    ['tags', [...(draft.tags || []), ...(input.tags || [])].join(' ')],
  ];
};

export class AutoCategoryEngine {
  categorize(input = {}) {
    const matches = new Map();
    const matchedSignals = [];

    sourceFields(input).forEach(([field, value]) => {
      const haystack = normalizeText(value);
      if (!haystack) return;

      SIGNALS.forEach((signal) => {
        const pattern = signal.patterns.find((item) => haystack.includes(normalizeText(item)));
        if (!pattern) return;
        const score = field === 'source_domain' ? signal.weight + 15 : signal.weight;
        matches.set(signal.category, (matches.get(signal.category) || 0) + score);
        matchedSignals.push({
          category: signal.category,
          field,
          pattern,
          weight: score,
        });
      });
    });

    const ranked = [...matches.entries()]
      .map(([category, score]) => ({ category, score: clampScore(score) }))
      .sort((a, b) => b.score - a.score);

    const primaryCategory = ranked[0]?.category || 'Central Government';
    const confidence = clampScore(ranked[0]?.score || 35);
    const secondaryCategories = ranked.slice(1, 4).map((item) => item.category);
    const warnings = [];

    if (!matchedSignals.length) {
      warnings.push({
        severity: 'medium',
        code: 'low_category_evidence',
        message: 'Category could not be matched from deterministic source signals.',
      });
    } else if (confidence < 70) {
      warnings.push({
        severity: 'low',
        code: 'category_confidence_low',
        message: `Category confidence is ${confidence}.`,
      });
    }

    return {
      primaryCategory,
      secondaryCategories: unique(secondaryCategories),
      confidence,
      matchedSignals,
      warnings,
    };
  }
}

export const categorizeDraft = (input) => new AutoCategoryEngine().categorize(input);

export default AutoCategoryEngine;
