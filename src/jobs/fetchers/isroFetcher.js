import BaseFetcher from './baseFetcher.js';
import { SOURCE_CONFIGS } from './sourceConfigs.js';
import { discoverOfficialNotifications } from './officialNotificationParser.js';

export default class IsroFetcher extends BaseFetcher {
  constructor(options = {}) {
    const { config = {}, ...fetcherOptions } = options;
    super({ ...SOURCE_CONFIGS.isro, ...config, ...fetcherOptions });
    this.config = { ...SOURCE_CONFIGS.isro, ...config };
  }

  async fetch(source) {
    return discoverOfficialNotifications(this, source, this.config);
  }
}
