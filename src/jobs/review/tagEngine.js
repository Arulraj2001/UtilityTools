import { clampScore, compact, containsEvidence, evidenceTextFromContext, normalizeText, unique } from './reviewUtils.js';

const TAG_PATTERNS = {
  qualification: [
    ['10th', /\b(10th|sslc|matric)\b/i],
    ['12th', /\b(12th|hsc|higher secondary)\b/i],
    ['graduate', /\b(graduate|graduation|bachelor|degree)\b/i],
    ['post-graduate', /\b(post graduate|postgraduate|masters|master degree|m\.sc|m\.a|m\.com)\b/i],
    ['diploma', /\bdiploma\b/i],
    ['iti', /\biti\b/i],
    ['btech', /\b(b\.?tech|b\.?e\.?|engineering degree)\b/i],
    ['mbbs', /\bmbbs\b/i],
    ['nursing', /\bnursing|gnm|anm\b/i],
  ],
  exam: [
    ['tnpsc', /\btnpsc\b|tamil nadu public service commission/i],
    ['ssc', /\bssc\b|staff selection commission/i],
    ['cgl', /\bcgl\b/i],
    ['chsl', /\bchsl\b/i],
    ['upsc', /\bupsc\b|union public service commission/i],
    ['rrb', /\brrb\b|railway recruitment board/i],
    ['ibps', /\bibps\b/i],
    ['sbi', /\bsbi\b|state bank of india/i],
    ['drdo', /\bdrdo\b/i],
  ],
  department: [
    ['railway', /\brailway|indian railways\b/i],
    ['banking', /\bbank|banking\b/i],
    ['defence', /\bdefence|defense|army|navy|air force|drdo\b/i],
    ['teaching', /\bteacher|teaching|professor|lecturer\b/i],
    ['medical', /\bmedical|health|doctor|nurse|nursing\b/i],
    ['engineering', /\bengineer|engineering\b/i],
  ],
  location: [
    ['india', /\bindia\b/i],
    ['tamil-nadu', /\btamil nadu\b/i],
    ['delhi', /\bdelhi\b/i],
    ['maharashtra', /\bmaharashtra\b/i],
    ['karnataka', /\bkarnataka\b/i],
    ['kerala', /\bkerala\b/i],
  ],
};

const slugTag = (value = '') => normalizeText(value)
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 64);

const addPatternTags = (text, patterns) => (
  patterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag)
);

const organizationTags = (organization = '') => {
  const tags = [];
  const text = compact(organization);
  const slug = slugTag(text);
  if (slug) tags.push(slug);
  const acronym = text
    .split(/\s+/)
    .filter((word) => /^[A-Z][A-Za-z&]+/.test(word))
    .map((word) => word[0])
    .join('')
    .toLowerCase();
  if (acronym.length >= 2 && acronym.length <= 8) tags.push(acronym);
  return tags;
};

export class TagEngine {
  generate(input = {}) {
    const draft = input.draft?.generated_data || input.generatedData || input.draft || {};
    const rawText = evidenceTextFromContext(input);
    const sourceText = [
      rawText,
      draft.title,
      draft.organization,
      draft.qualification,
      draft.job_location,
      draft.location,
      draft.category,
      ...(draft.tags || []),
    ].filter(Boolean).join(' ');

    const tagGroups = {
      qualification: addPatternTags(sourceText, TAG_PATTERNS.qualification),
      organization: organizationTags(draft.organization || input.queueItem?.organization || input.rawNotification?.organization || input.source?.name || ''),
      exam: addPatternTags(sourceText, TAG_PATTERNS.exam),
      location: addPatternTags(sourceText, TAG_PATTERNS.location),
      department: addPatternTags(sourceText, TAG_PATTERNS.department),
    };

    Object.keys(tagGroups).forEach((group) => {
      tagGroups[group] = unique(tagGroups[group].map(slugTag).filter(Boolean));
    });

    const tags = unique(Object.values(tagGroups).flat());
    const warnings = [];
    if (!tags.length) {
      warnings.push({
        severity: 'medium',
        code: 'no_source_tags',
        message: 'No tags could be generated from source-derived signals.',
      });
    }

    const ungrounded = tags.filter((tag) => !containsEvidence(sourceText, tag.replace(/-/g, ' ')));
    if (ungrounded.length > 0) {
      warnings.push({
        severity: 'low',
        code: 'weak_tag_grounding',
        message: `Some tags are inferred from normalized source terms: ${ungrounded.slice(0, 5).join(', ')}.`,
      });
    }

    const populatedGroups = Object.values(tagGroups).filter((items) => items.length > 0).length;
    return {
      tags,
      tagGroups,
      confidence: clampScore((populatedGroups / Object.keys(tagGroups).length) * 100),
      warnings,
    };
  }
}

export const generateTags = (input) => new TagEngine().generate(input);

export default TagEngine;
