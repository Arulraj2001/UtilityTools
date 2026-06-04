import BaseFetcher from './baseFetcher.js';
import { SOURCE_CONFIGS } from './sourceConfigs.js';
import { discoverOfficialNotifications } from './officialNotificationParser.js';

export default class TnpscFetcher extends BaseFetcher {
  constructor(options = {}) {
    const { config = {}, ...fetcherOptions } = options;
    super({ ...SOURCE_CONFIGS.tnpsc, ...config, ...fetcherOptions });
    this.config = { ...SOURCE_CONFIGS.tnpsc, ...config };
  }

  async fetch(source) {
    return discoverOfficialNotifications(this, source, this.config);
  }
}
