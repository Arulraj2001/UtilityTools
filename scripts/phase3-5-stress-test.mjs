import ReviewEngine from '../src/jobs/review/reviewEngine.js';
import { buildModerationItem, recordModerationAction, sortModerationQueue } from '../src/jobs/review/moderationQueue.js';

const scenarios = [10, 50, 100, 250];
const engine = new ReviewEngine();

const now = Date.now();

const makeContext = (index) => {
  const org = index % 5 === 0 ? 'Union Public Service Commission' : 'Staff Selection Commission';
  const domain = index % 5 === 0 ? 'upsc.gov.in' : 'ssc.gov.in';
  const exam = index % 5 === 0 ? 'UPSC Civil Services' : 'SSC CGL';
  const blockedUrl = index % 17 === 0;
  const duplicateRisk = index % 23 === 0 ? 85 : index % 11 === 0 ? 45 : 5;
  const date = '2026-07-31';
  const dateEvidence = '31/07/2026';
  const salary = index % 19 === 0 ? 'Rs 99,999 per month' : 'Not specified';

  return {
    draft: {
      id: `draft-${index}`,
      queue_item_id: `queue-${index}`,
      quality_scores: {
        extractionScore: 92,
        seo: 88,
        completenessScore: 90,
        duplicateRisk,
        freshness: 85,
        issues: index % 13 === 0 ? ['Manual review suggested for source details.'] : [],
      },
      generated_data: {
        title: `${exam} 2026 Recruitment`,
        organization: org,
        official_website: `https://${domain}`,
        notification_pdf: `https://${domain}/notice-${index}.pdf`,
        apply_link: blockedUrl ? 'https://not-official.example/apply' : `https://${domain}/apply-${index}`,
        important_dates: [{ event: 'Last date', date }],
        vacancies: '120',
        salary,
        qualification: 'Graduate degree',
        job_location: 'India',
        application_mode: 'Online',
        category: index % 5 === 0 ? 'UPSC' : 'SSC',
        tags: index % 5 === 0 ? ['upsc'] : ['ssc', 'cgl'],
      },
    },
    queueItem: {
      id: `queue-${index}`,
      title: `${exam} 2026 Recruitment`,
      organization: org,
      source_url: `https://${domain}`,
      raw_input: `${exam} 2026. Graduate degree. Apply online at https://${domain}/apply-${index}. Last date ${dateEvidence}. Total 120 vacancies. India.`,
      duplicate_check: { risk_score: duplicateRisk },
    },
    rawNotification: {
      id: `raw-${index}`,
      queue_item_id: `queue-${index}`,
      title: `${exam} 2026 Recruitment`,
      organization: org,
      notification_url: `https://${domain}`,
      pdf_url: `https://${domain}/notice-${index}.pdf`,
      raw_text: `${exam} 2026 notification. Graduate degree. Apply online at https://${domain}/apply-${index}. Last date ${dateEvidence}. Total 120 vacancies. India.`,
    },
    source: {
      id: `source-${index}`,
      name: org,
      url: `https://${domain}`,
      tier: 1,
      category: 'government',
    },
    duplicateLogs: duplicateRisk >= 80 ? [{
      check_type: 'url',
      similarity: duplicateRisk,
      is_duplicate: true,
      details: { matched_url: `https://${domain}/notice-${index}.pdf` },
    }] : [],
  };
};

const mockSupabase = {
  writes: 0,
  from(table) {
    return {
      insert(rows) {
        mockSupabase.writes += rows.length;
        return {
          select() {
            return Promise.resolve({
              data: rows.map((row, index) => ({ id: `${table}-${mockSupabase.writes}-${index}`, ...row })),
              error: null,
            });
          },
        };
      },
    };
  },
};

const runScenario = async (size) => {
  const started = performance.now();
  const reviews = [];
  let simulatedDbWrites = 0;

  for (let index = 0; index < size; index += 1) {
    const context = makeContext(index);
    const review = engine.review(context);
    reviews.push(review);
    buildModerationItem({ draft: context.draft, review });
    await recordModerationAction(mockSupabase, {
      draftId: context.draft.id,
      action: 'run_review',
      beforeState: null,
      afterState: { decisionBand: review.decisionBand },
    });
    simulatedDbWrites += 4;
  }

  const queue = sortModerationQueue(reviews.map((review, index) => buildModerationItem({
    draft: { id: `draft-${index}`, quality_scores: { duplicateRisk: review.duplicateRisk } },
    review,
  })));

  const elapsedMs = performance.now() - started;
  return {
    size,
    elapsedMs: Math.round(elapsedMs),
    avgReviewMs: Number((elapsedMs / size).toFixed(2)),
    simulatedDbWrites,
    moderationActions: size,
    decisionBands: reviews.reduce((counts, review) => {
      counts[review.decisionBand] = (counts[review.decisionBand] || 0) + 1;
      return counts;
    }, {}),
    topQueueDecisionBand: queue[0]?.decisionBand || null,
  };
};

const results = [];
for (const size of scenarios) {
  results.push(await runScenario(size));
}

console.log('PHASE3_5_STRESS_RESULT', JSON.stringify({
  generatedAt: new Date(now).toISOString(),
  results,
}, null, 2));
