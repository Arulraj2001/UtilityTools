import BaseFetcher from './baseFetcher.js';
import { SOURCE_CONFIGS } from './sourceConfigs.js';
import { discoverOfficialNotifications } from './officialNotificationParser.js';

export default class IbpsFetcher extends BaseFetcher {
  constructor(options = {}) {
    const { config = {}, ...fetcherOptions } = options;
    super({ ...SOURCE_CONFIGS.ibps, ...config, ...fetcherOptions });
    this.config = { ...SOURCE_CONFIGS.ibps, ...config };
  }

  async fetch(source) {
    return discoverOfficialNotifications(this, source, this.config);
  }
}
