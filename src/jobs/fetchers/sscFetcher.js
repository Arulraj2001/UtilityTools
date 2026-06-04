import BaseFetcher from './baseFetcher.js';
import { SOURCE_CONFIGS } from './sourceConfigs.js';
import { discoverOfficialNotifications } from './officialNotificationParser.js';
import { normalizeNotification } from '../normalizeNotification.js';

const SSC_CALENDAR_API = 'https://ssc.gov.in/api/general-website/portal/records?page=1&limit=20&contentType=ssc-calendar&key=createdAt&order=DESC&isPaginationRequired=false&isAttachment=true&language=english&attributes=id,headline,examId,contentType,startDate,endDate,language,createdAt';
const SSC_CALENDAR_PAGE = 'https://ssc.gov.in/ssc-calender';

export default class SscFetcher extends BaseFetcher {
  constructor(options = {}) {
    const { config = {}, ...fetcherOptions } = options;
    super({ ...SOURCE_CONFIGS.ssc, ...config, ...fetcherOptions });
    this.config = { ...SOURCE_CONFIGS.ssc, ...config };
  }

  async fetch(source) {
    try {
      const htmlNotifications = await discoverOfficialNotifications(this, source, this.config);
      if (htmlNotifications.length > 0) return htmlNotifications;
    } catch (error) {
      this.recordError(error, { phase: 'sscHtmlDiscovery' });
    }

    return this.fetchCalendarFallback(source);
  }

  async fetchCalendarFallback(source) {
    const page = await this.fetchPage(SSC_CALENDAR_API, {
      headers: { Accept: 'application/json' },
    });
    const payload = JSON.parse(page.text);
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const maxNotifications = this.config.maxNotifications || 15;

    return rows
      .filter((row) => row?.headline)
      .slice(0, maxNotifications)
      .map((row) => normalizeNotification({
        title: row.headline,
        organization: this.config.organization,
        notification_url: SSC_CALENDAR_PAGE,
        pdf_url: '',
        published_date: row.createdAt ? String(row.createdAt).slice(0, 10) : '',
        last_date: row.endDate || '',
        raw_content: [
          row.headline,
          row.startDate ? `Start date: ${row.startDate}` : '',
          row.endDate ? `End date: ${row.endDate}` : '',
          row.examId ? `Exam ID: ${row.examId}` : '',
          'Source: SSC official calendar API',
        ].filter(Boolean).join('\n'),
        raw_html: '',
        context: row.headline,
      }, { ...source, organization: this.config.organization }));
  }
}
