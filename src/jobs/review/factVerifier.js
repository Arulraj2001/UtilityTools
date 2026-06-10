import {
  VERIFICATION_VERSION,
  clampScore,
  compact,
  containsEvidence,
  dateAppearsInEvidence,
  domainsMatch,
  evidenceTextFromContext,
  evidenceUrlsFromContext,
  hasRawEvidence,
  hostnameOf,
  isMissing,
  normalizeText,
  normalizeUrl,
  parseIsoDate,
  textSimilarity,
} from './reviewUtils.js';

const FIELD_LABELS = {
  official_website: 'official website',
  apply_link: 'application URL',
  notification_pdf: 'PDF URL',
  dates: 'dates',
  organization: 'organization',
  category: 'category',
  vacancies: 'vacancies',
  salary: 'salary',
  qualification: 'qualification',
  age: 'age',
  location: 'location',
  application_mode: 'application mode',
};

const result = (status, confidence, message, evidence = null) => ({
  status,
  confidence: clampScore(confidence),
  message,
  evidence,
});

const issue = (code, message, field, severity = 'critical') => ({
  code,
  field,
  severity,
  message,
});

const warning = (code, message, field, severity = 'medium') => ({
  code,
  field,
  severity,
  message,
});

const importantDateValues = (draft = {}) => {
  const values = [];
  if (draft.application_start_date) values.push({ field: 'application_start_date', date: draft.application_start_date });
  if (draft.last_date) values.push({ field: 'last_date', date: draft.last_date });
  (draft.important_dates || []).forEach((item, index) => {
    if (item?.date) values.push({ field: `important_dates.${index}`, event: item.event || '', date: item.date });
  });
  return values;
};

const verifyUrl = ({ field, value, evidenceUrls, evidenceText, officialDomains, strict = true }) => {
  if (isMissing(value)) {
    return {
      fieldResult: result('missing', 50, `${FIELD_LABELS[field]} is missing.`),
      blocker: null,
      warning: warning('missing_url', `${FIELD_LABELS[field]} is missing.`, field, 'low'),
    };
  }

  const normalized = normalizeUrl(value);
  if (!normalized) {
    return {
      fieldResult: result('blocked', 0, `${FIELD_LABELS[field]} is not a valid URL.`),
      blocker: issue('hallucinated_url', `${FIELD_LABELS[field]} is invalid or hallucinated.`, field),
      warning: null,
    };
  }

  const exactEvidence = evidenceUrls.includes(normalized) || evidenceText.includes(normalized.toLowerCase());
  const sameOfficialDomain = officialDomains.some((domain) => domainsMatch(normalized, domain));
  const grounded = exactEvidence || (!strict && sameOfficialDomain);

  if (!grounded) {
    return {
      fieldResult: result('blocked', 15, `${FIELD_LABELS[field]} was not found in source evidence.`, normalized),
      blocker: issue('hallucinated_url', `${FIELD_LABELS[field]} is not grounded in source evidence.`, field),
      warning: null,
    };
  }

  return {
    fieldResult: result('verified', exactEvidence ? 100 : 80, `${FIELD_LABELS[field]} is grounded.`, normalized),
    blocker: null,
    warning: sameOfficialDomain || exactEvidence
      ? null
      : warning('url_domain_unverified', `${FIELD_LABELS[field]} domain does not match the known official source.`, field),
  };
};

const rawOrganization = (context = {}) => (
  context.rawNotification?.organization ||
  context.queueItem?.organization ||
  context.source?.name ||
  ''
);

const duplicateUrlBlocker = (duplicateLogs = []) => duplicateLogs.find((log) => {
  const details = log.details || {};
  const risk = Number(log.similarity ?? details.risk ?? 0);
  return (log.check_type === 'url' || details.matched_url) && (log.is_duplicate || risk >= 80);
});

const criticalUngroundedFields = new Set(['vacancies', 'salary', 'qualification', 'age']);

export class FactVerifier {
  verify(context = {}) {
    const draft = context.draft?.generated_data || context.generatedData || context.draft || {};
    const evidenceTextRaw = evidenceTextFromContext(context);
    const evidenceText = normalizeText(evidenceTextRaw);
    const evidenceUrls = evidenceUrlsFromContext(context);
    const fieldResults = {};
    const blockingIssues = [];
    const warnings = [];

    const sourceUrl = context.source?.url || context.rawNotification?.notification_url || context.queueItem?.source_url || '';
    const officialDomains = [
      hostnameOf(sourceUrl),
      hostnameOf(context.rawNotification?.notification_url),
      hostnameOf(context.rawNotification?.pdf_url),
      hostnameOf(draft.official_website),
    ].filter(Boolean);

    if (!hasRawEvidence(context)) {
      blockingIssues.push(issue('no_raw_evidence', 'No raw source evidence is available for this draft.', 'source'));
    }

    [
      ['official_website', draft.official_website, false],
      ['apply_link', draft.apply_link || draft.application_link, true],
      ['notification_pdf', draft.notification_pdf, true],
    ].forEach(([field, value, strict]) => {
      const checked = verifyUrl({ field, value, evidenceUrls, evidenceText, officialDomains, strict });
      fieldResults[field] = checked.fieldResult;
      if (checked.blocker) blockingIssues.push(checked.blocker);
      if (checked.warning) warnings.push(checked.warning);
    });

    const orgEvidence = rawOrganization(context);
    const draftOrg = draft.organization || '';
    if (isMissing(draftOrg)) {
      fieldResults.organization = result('missing', 0, 'Organization is missing.');
      blockingIssues.push(issue('organization_missing', 'Organization is missing from the draft.', 'organization', 'high'));
    } else if (orgEvidence && textSimilarity(draftOrg, orgEvidence) < 45 && !containsEvidence(evidenceTextRaw, draftOrg)) {
      fieldResults.organization = result('blocked', 10, 'Organization does not match source evidence.', orgEvidence);
      blockingIssues.push(issue('organization_mismatch', 'Draft organization does not match source evidence.', 'organization'));
    } else {
      fieldResults.organization = result('verified', orgEvidence ? 95 : 70, 'Organization is grounded.', orgEvidence || draftOrg);
      if (!orgEvidence) warnings.push(warning('weak_organization_evidence', 'Organization was verified only from source text.', 'organization'));
    }

    const dateChecks = importantDateValues(draft);
    const invalidDates = [];
    const ungroundedDates = [];
    dateChecks.forEach((item) => {
      const iso = parseIsoDate(item.date);
      if (!iso) invalidDates.push(item);
      else if (!dateAppearsInEvidence(evidenceTextRaw, iso)) ungroundedDates.push(item);
    });
    if (invalidDates.length > 0) {
      fieldResults.dates = result('blocked', 0, 'One or more critical dates are invalid.', invalidDates);
      blockingIssues.push(issue('invalid_critical_date', 'A critical date is invalid.', 'dates'));
    } else if (ungroundedDates.length > 0) {
      fieldResults.dates = result('warning', 55, 'Some dates were not found verbatim in source evidence.', ungroundedDates);
      warnings.push(warning('ungrounded_date', 'Some dates need manual confirmation against the source.', 'dates', 'high'));
    } else {
      fieldResults.dates = result(dateChecks.length ? 'verified' : 'missing', dateChecks.length ? 95 : 50, dateChecks.length ? 'Dates are grounded.' : 'No dates were provided.', dateChecks);
    }

    const duplicateLog = duplicateUrlBlocker(context.duplicateLogs || []);
    if (duplicateLog) {
      fieldResults.duplicate_url = result('blocked', 0, 'A duplicate URL match exists.', duplicateLog.details || duplicateLog);
      blockingIssues.push(issue('duplicate_url', 'Duplicate URL detected in duplicate analysis.', 'duplicate_url'));
    }

    const categoryValue = draft.category || draft.job_type || '';
    fieldResults.category = isMissing(categoryValue)
      ? result('missing', 40, 'Category is missing.')
      : result(containsEvidence(evidenceTextRaw, categoryValue) ? 'verified' : 'warning', containsEvidence(evidenceTextRaw, categoryValue) ? 85 : 60, 'Category has partial source support.', categoryValue);
    if (fieldResults.category.status === 'warning') {
      warnings.push(warning('category_not_verbatim', 'Category was inferred and should be reviewed.', 'category', 'low'));
    }

    [
      ['vacancies', draft.vacancies],
      ['salary', draft.salary],
      ['qualification', draft.qualification || draft.eligibility?.education],
      ['age', draft.age || draft.age_limit || draft.eligibility?.age],
      ['location', draft.location || draft.job_location],
      ['application_mode', draft.application_mode],
    ].forEach(([field, value]) => {
      if (isMissing(value)) {
        fieldResults[field] = result('missing', 50, `${FIELD_LABELS[field]} is missing.`);
        return;
      }
      const grounded = containsEvidence(evidenceTextRaw, value);
      fieldResults[field] = result(grounded ? 'verified' : 'warning', grounded ? 90 : 55, grounded ? `${FIELD_LABELS[field]} is grounded.` : `${FIELD_LABELS[field]} needs manual verification.`, value);
      if (!grounded) {
        const ungroundedWarning = warning(
          `ungrounded_${field}`,
          `${FIELD_LABELS[field]} was not found in source evidence.`,
          field,
          criticalUngroundedFields.has(field) ? 'critical' : 'medium',
        );
        warnings.push(ungroundedWarning);
        if (criticalUngroundedFields.has(field)) {
          blockingIssues.push(issue(
            `ungrounded_${field}`,
            `${FIELD_LABELS[field]} is a critical factual field and was not found in source evidence.`,
            field,
          ));
          fieldResults[field] = result('blocked', 0, `${FIELD_LABELS[field]} is not grounded in source evidence.`, value);
        }
      }
    });

    const sourceConfidence = clampScore(
      (context.source?.tier === 1 ? 25 : 10) +
      (context.rawNotification?.id ? 25 : 0) +
      (compact(evidenceTextRaw).length > 500 ? 25 : compact(evidenceTextRaw).length > 100 ? 15 : 0) +
      (evidenceUrls.length ? 15 : 0) +
      (officialDomains.length ? 10 : 0) -
      (blockingIssues.length * 15),
    );

    const verificationScore = clampScore(
      100 -
      (blockingIssues.filter((item) => item.severity === 'critical').length * 35) -
      (blockingIssues.filter((item) => item.severity !== 'critical').length * 18) -
      (warnings.filter((item) => item.severity === 'high').length * 10) -
      (warnings.filter((item) => item.severity !== 'high').length * 5),
    );

    return {
      verificationScore,
      sourceConfidence,
      fieldResults,
      blockingIssues,
      warnings,
      verificationVersion: VERIFICATION_VERSION,
      verifiedAt: new Date().toISOString(),
    };
  }
}

export const verifyFacts = (context) => new FactVerifier().verify(context);

export default FactVerifier;
