/**
 * Debug utilities for Jobs table.
 * Used for inspecting constraints, duplicates, and data issues.
 * Production-safe logging utilities.
 */

import { supabase } from './supabaseClient';

/**
 * Inspect all constraints on the jobs table.
 * Helps identify unique constraints and other database rules.
 * @returns {Promise<Array>}
 */
export const inspectJobsTableConstraints = async () => {
  try {
    const { data, error } = await supabase.rpc('get_table_constraints', {
      table_name: 'jobs',
    });

    if (error) {
      console.error('❌ Error fetching constraints:', error);
      return [];
    }

    console.group('📋 Jobs Table Constraints');
    console.table(data || []);
    console.groupEnd();

    return data || [];
  } catch (err) {
    console.error('Unexpected error in inspectJobsTableConstraints:', err);
    return [];
  }
};

/**
 * Find duplicate slugs in the jobs table.
 * Useful for diagnosing 409 Conflict issues.
 * @returns {Promise<Array>}
 */
export const findDuplicateSlugs = async () => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('slug, id, title, created_at')
      .order('slug');

    if (error) {
      console.error('❌ Error fetching slugs:', error);
      return [];
    }

    const slugMap = {};
    const duplicates = [];

    data?.forEach((job) => {
      if (slugMap[job.slug]) {
        if (!duplicates.find((d) => d.slug === job.slug)) {
          duplicates.push({
            slug: job.slug,
            count: 2,
            jobs: [slugMap[job.slug], job],
          });
        } else {
          const dup = duplicates.find((d) => d.slug === job.slug);
          dup.count += 1;
          dup.jobs.push(job);
        }
      } else {
        slugMap[job.slug] = job;
      }
    });

    if (duplicates.length > 0) {
      console.group('⚠️ Duplicate Slugs Found');
      console.table(duplicates);
      console.groupEnd();
    } else {
      console.log('✅ No duplicate slugs found');
    }

    return duplicates;
  } catch (err) {
    console.error('Unexpected error in findDuplicateSlugs:', err);
    return [];
  }
};

/**
 * Find duplicate canonical URLs in the jobs table.
 * @returns {Promise<Array>}
 */
export const findDuplicateCanonicalUrls = async () => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('canonical_url, id, title, created_at')
      .not('canonical_url', 'is', null)
      .order('canonical_url');

    if (error) {
      console.error('❌ Error fetching canonical URLs:', error);
      return [];
    }

    const urlMap = {};
    const duplicates = [];

    data?.forEach((job) => {
      if (job.canonical_url) {
        if (urlMap[job.canonical_url]) {
          if (!duplicates.find((d) => d.url === job.canonical_url)) {
            duplicates.push({
              url: job.canonical_url,
              count: 2,
              jobs: [urlMap[job.canonical_url], job],
            });
          } else {
            const dup = duplicates.find((d) => d.url === job.canonical_url);
            dup.count += 1;
            dup.jobs.push(job);
          }
        } else {
          urlMap[job.canonical_url] = job;
        }
      }
    });

    if (duplicates.length > 0) {
      console.group('⚠️ Duplicate Canonical URLs Found');
      console.table(duplicates);
      console.groupEnd();
    } else {
      console.log('✅ No duplicate canonical URLs found');
    }

    return duplicates;
  } catch (err) {
    console.error('Unexpected error in findDuplicateCanonicalUrls:', err);
    return [];
  }
};

/**
 * Check for any jobs with invalid JSON in JSONB fields.
 * @returns {Promise<Array>}
 */
export const validateJobsJsonbFields = async () => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, tags, eligibility, selection_process, important_dates');

    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return [];
    }

    const issues = [];

    data?.forEach((job) => {
      const fields = ['tags', 'eligibility', 'selection_process', 'important_dates'];
      fields.forEach((field) => {
        if (job[field]) {
          try {
            if (typeof job[field] === 'string') {
              JSON.parse(job[field]);
            } else {
              JSON.stringify(job[field]);
            }
          } catch (err) {
            issues.push({
              jobId: job.id,
              jobTitle: job.title,
              field,
              error: err.message,
              value: String(job[field]).substring(0, 100),
            });
          }
        }
      });
    });

    if (issues.length > 0) {
      console.group('⚠️ Invalid JSONB Fields Found');
      console.table(issues);
      console.groupEnd();
    } else {
      console.log('✅ All JSONB fields are valid');
    }

    return issues;
  } catch (err) {
    console.error('Unexpected error in validateJobsJsonbFields:', err);
    return [];
  }
};

/**
 * Run a complete jobs table diagnosis.
 * Checks for duplicates, invalid JSON, and constraint issues.
 * @returns {Promise<Object>}
 */
export const runJobsTableDiagnosis = async () => {
  console.group('🔍 Starting Jobs Table Diagnosis');
  
  const results = {
    duplicateSlugs: await findDuplicateSlugs(),
    duplicateUrls: await findDuplicateCanonicalUrls(),
    invalidJsonb: await validateJobsJsonbFields(),
  };

  console.log('📊 Diagnosis Complete', results);
  console.groupEnd();

  return results;
};

/**
 * Log job creation payload for debugging.
 * Used when diagnosis is needed during creation attempts.
 * @param {Record<string, any>} payload
 * @param {string} [phase]
 */
export const logJobPayloadForDebug = (payload, phase = 'pre-submission') => {
  console.group(`📦 Job Payload Debug [${phase}]`);
  console.log('Full payload:', payload);
  console.log('Slug:', payload.slug);
  console.log('Canonical URL:', payload.canonical_url);
  console.log('Status:', payload.status);
  console.log('Tags:', payload.tags);
  console.log('Eligibility:', payload.eligibility);
  console.log('Selection Process:', payload.selection_process);
  console.log('Important Dates:', payload.important_dates);
  console.groupEnd();
};

/**
 * Safe method to export debug info to user.
 * Returns structured debug object without exposing sensitive data.
 * @returns {Promise<Object>}
 */
export const getJobsDebugInfo = async () => {
  const diagnosis = await runJobsTableDiagnosis();
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    diagnosis,
    note: 'Share this with support if experiencing 409 Conflict errors',
  };
};

// Export as console command for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.__jobsDebug = {
    inspectConstraints: inspectJobsTableConstraints,
    findDuplicateSlugs,
    findDuplicateUrls: findDuplicateCanonicalUrls,
    validateJsonb: validateJobsJsonbFields,
    runDiagnosis: runJobsTableDiagnosis,
    logPayload: logJobPayloadForDebug,
    getDebugInfo: getJobsDebugInfo,
  };
  console.log('💡 Jobs debug tools available at window.__jobsDebug');
}
