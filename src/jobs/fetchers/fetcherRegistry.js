import UpscFetcher from './upscFetcher.js';
import SscFetcher from './sscFetcher.js';
import IbpsFetcher from './ibpsFetcher.js';
import SbiFetcher from './sbiFetcher.js';
import DrdoFetcher from './drdoFetcher.js';
import IsroFetcher from './isroFetcher.js';
import RrbFetcher from './rrbFetcher.js';
import TnpscFetcher from './tnpscFetcher.js';
import { resolveSourceKey } from './sourceConfigs.js';

export const FETCHER_CLASSES = {
  upsc: UpscFetcher,
  ssc: SscFetcher,
  ibps: IbpsFetcher,
  sbi: SbiFetcher,
  drdo: DrdoFetcher,
  isro: IsroFetcher,
  rrb: RrbFetcher,
  tnpsc: TnpscFetcher,
};

export const getFetcherKeyForSource = (source = {}) => resolveSourceKey(source);

export const getFetcherForSource = (source = {}, options = {}) => {
  const key = getFetcherKeyForSource(source);
  const FetcherClass = FETCHER_CLASSES[key];
  return FetcherClass ? new FetcherClass(options) : null;
};

export default getFetcherForSource;
