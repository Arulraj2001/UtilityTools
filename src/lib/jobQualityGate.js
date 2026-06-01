export const JOB_QUALITY_THRESHOLDS = {
  seoMin: 50,
  spamMax: 30,
  duplicateMax: 60,
}

export const validateJobQualityGate = (scores = {}, thresholds = JOB_QUALITY_THRESHOLDS) => {
  const failures = []
  const seo = Number(scores.seo ?? 0)
  const spamRisk = Number(scores.spamRisk ?? 0)
  const duplicateRisk = Number(scores.duplicateRisk ?? 0)

  if (seo < thresholds.seoMin) {
    failures.push(`SEO score ${seo} is below ${thresholds.seoMin}.`)
  }

  if (spamRisk > thresholds.spamMax) {
    failures.push(`Spam score ${spamRisk} is above ${thresholds.spamMax}.`)
  }

  if (duplicateRisk > thresholds.duplicateMax) {
    failures.push(`Duplicate score ${duplicateRisk} is above ${thresholds.duplicateMax}.`)
  }

  return {
    ok: failures.length === 0,
    failures,
    thresholds,
  }
}
