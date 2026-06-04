export const SOURCE_CONFIGS = {
  upsc: {
    sourceKey: 'upsc',
    organization: 'Union Public Service Commission',
    allowedDomains: ['upsc.gov.in', 'www.upsc.gov.in'],
    startUrls: [
      'https://upsc.gov.in/recruitment/recruitment-advertisement',
      'https://upsc.gov.in/whats-new',
      'https://upsc.gov.in',
    ],
    positiveKeywords: ['recruitment', 'vacancy', 'advertisement', 'notification', 'posts', 'apply', 'examination'],
    negativeKeywords: ['answer key', 'admit card', 'e-admit', 'result', 'marks', 'interview schedule', 'syllabus'],
  },
  ssc: {
    sourceKey: 'ssc',
    organization: 'Staff Selection Commission',
    allowedDomains: ['ssc.nic.in', 'www.ssc.nic.in', 'ssc.gov.in', 'www.ssc.gov.in'],
    startUrls: [
      'https://ssc.gov.in/Portal/Notice',
      'https://ssc.gov.in',
      'https://ssc.nic.in',
    ],
    positiveKeywords: ['notice', 'notification', 'recruitment', 'vacancy', 'examination', 'apply', 'advertisement'],
    negativeKeywords: ['answer key', 'admit card', 'result', 'marks', 'court case', 'syllabus'],
  },
  ibps: {
    sourceKey: 'ibps',
    organization: 'Institute of Banking Personnel Selection',
    allowedDomains: ['ibps.in', 'www.ibps.in'],
    startUrls: [
      'https://www.ibps.in',
      'https://ibps.in',
    ],
    positiveKeywords: ['crp', 'recruitment', 'notification', 'advertisement', 'apply', 'common recruitment process', 'vacancy'],
    negativeKeywords: ['score card', 'result', 'marks', 'call letter', 'reserve list', 'provisional allotment'],
  },
  sbi: {
    sourceKey: 'sbi',
    organization: 'State Bank of India',
    allowedDomains: ['sbi.co.in', 'www.sbi.co.in', 'bank.sbi', 'www.bank.sbi', 'sbi.bank.in', 'www.sbi.bank.in'],
    startUrls: [
      'https://sbi.bank.in/web/careers/current-openings',
      'https://sbi.co.in/web/careers/current-openings',
      'https://sbi.co.in/careers',
      'https://bank.sbi/web/careers/current-openings',
    ],
    positiveKeywords: ['recruitment', 'current opening', 'advertisement', 'apply online', 'notification', 'vacancy'],
    negativeKeywords: ['result', 'interview schedule', 'call letter', 'marks', 'final selection'],
  },
  drdo: {
    sourceKey: 'drdo',
    organization: 'Defence Research and Development Organisation',
    allowedDomains: [
      'drdo.gov.in',
      'www.drdo.gov.in',
      'rac.gov.in',
      'www.rac.gov.in',
      'drdo.res.in',
      'xn--m1b0a2bb8esed.xn--11b7cb3a6a.xn--h2brj9c',
    ],
    startUrls: [
      'https://rac.gov.in/index.php?lang=en&id=0',
      'https://www.drdo.gov.in',
      'https://www.drdo.gov.in/drdo/careers',
      'https://rac.gov.in',
    ],
    positiveKeywords: ['recruitment', 'career', 'advertisement', 'vacancy', 'apprentice', 'scientist', 'notification'],
    negativeKeywords: ['result', 'interview', 'shortlisted', 'admit card', 'answer key'],
  },
  isro: {
    sourceKey: 'isro',
    organization: 'Indian Space Research Organisation',
    allowedDomains: [
      'isro.gov.in',
      'www.isro.gov.in',
      'apps.ursc.gov.in',
      'ursc.gov.in',
      'www.ursc.gov.in',
      'nrsc.gov.in',
      'www.nrsc.gov.in',
      'vssc.gov.in',
      'www.vssc.gov.in',
      'sac.gov.in',
      'www.sac.gov.in',
      'iprc.gov.in',
      'www.iprc.gov.in',
    ],
    startUrls: [
      'https://www.isro.gov.in/Careers.html',
      'https://www.isro.gov.in',
    ],
    positiveKeywords: ['career', 'recruitment', 'vacancy', 'advertisement', 'notification', 'apprentice', 'scientist'],
    negativeKeywords: ['result', 'interview', 'shortlisted', 'answer key', 'admit card'],
  },
  rrb: {
    sourceKey: 'rrb',
    organization: 'Railway Recruitment Board',
    allowedDomains: [
      'indianrailways.gov.in',
      'www.indianrailways.gov.in',
      'rrbapply.gov.in',
      'www.rrbapply.gov.in',
      'rrbcdg.gov.in',
      'www.rrbcdg.gov.in',
      'rrbahmedabad.gov.in',
      'www.rrbahmedabad.gov.in',
      'rrbajmer.gov.in',
      'www.rrbajmer.gov.in',
      'rrbald.gov.in',
      'www.rrbald.gov.in',
      'rrbbhopal.gov.in',
      'www.rrbbhopal.gov.in',
      'rrbbnc.gov.in',
      'www.rrbbnc.gov.in',
      'rrbchennai.gov.in',
      'www.rrbchennai.gov.in',
      'rrbgkp.gov.in',
      'www.rrbgkp.gov.in',
      'rrbkolkata.gov.in',
      'www.rrbkolkata.gov.in',
      'rrbmumbai.gov.in',
      'www.rrbmumbai.gov.in',
      'rrbpatna.gov.in',
      'www.rrbpatna.gov.in',
      'rrbsecunderabad.gov.in',
      'www.rrbsecunderabad.gov.in',
    ],
    startUrls: [
      'https://www.rrbapply.gov.in',
      'https://indianrailways.gov.in',
    ],
    positiveKeywords: ['cen', 'rrb', 'rrc', 'recruitment', 'vacancy', 'notification', 'employment notice', 'apply'],
    negativeKeywords: ['result', 'score', 'answer key', 'admit card', 'exam city', 'mock test'],
  },
  tnpsc: {
    sourceKey: 'tnpsc',
    organization: 'Tamil Nadu Public Service Commission',
    allowedDomains: ['tnpsc.gov.in', 'www.tnpsc.gov.in', 'apply.tnpscexams.in', 'www.tnpscexams.in'],
    startUrls: [
      'https://www.tnpsc.gov.in',
      'https://www.tnpsc.gov.in/English/Notification.aspx',
    ],
    positiveKeywords: ['notification', 'recruitment', 'vacancy', 'apply online', 'advertisement', 'combined', 'services'],
    negativeKeywords: ['hall ticket', 'result', 'answer key', 'marks', 'counselling', 'memorandum'],
  },
};

export const sourceUrlHost = (source = {}) => {
  try {
    return new URL(source.url || '').hostname.toLowerCase();
  } catch (_error) {
    return '';
  }
};

export const mergeSourceConfig = (config, overrides = {}) => ({
  ...config,
  ...overrides,
  allowedDomains: [
    ...(config.allowedDomains || []),
    ...(overrides.allowedDomains || []),
  ],
  startUrls: [
    ...(overrides.startUrls || []),
    ...(config.startUrls || []),
  ],
});

export const resolveSourceKey = (source = {}) => {
  const haystack = `${source.name || ''} ${source.url || ''} ${source.description || ''}`.toLowerCase();
  if (haystack.includes('upsc')) return 'upsc';
  if (haystack.includes('ssc.nic') || haystack.includes('ssc.gov') || /\bssc\b/.test(haystack)) return 'ssc';
  if (haystack.includes('ibps')) return 'ibps';
  if (haystack.includes('sbi') || haystack.includes('bank.sbi')) return 'sbi';
  if (haystack.includes('drdo') || haystack.includes('rac.gov')) return 'drdo';
  if (haystack.includes('isro') || haystack.includes('ursc') || haystack.includes('vssc')) return 'isro';
  if (haystack.includes('rrb') || haystack.includes('railway')) return 'rrb';
  if (haystack.includes('tnpsc')) return 'tnpsc';
  return '';
};

export default SOURCE_CONFIGS;
