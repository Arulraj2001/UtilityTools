# Fetcher Status

Audit date: 2026-06-04

## Implemented Fetchers

| Source | File | Status |
| --- | --- | --- |
| UPSC | `src/jobs/fetchers/upscFetcher.js` | Implemented |
| SSC | `src/jobs/fetchers/sscFetcher.js` | Implemented |
| IBPS | `src/jobs/fetchers/ibpsFetcher.js` | Implemented |
| SBI Careers | `src/jobs/fetchers/sbiFetcher.js` | Implemented |
| DRDO | `src/jobs/fetchers/drdoFetcher.js` | Implemented |
| ISRO | `src/jobs/fetchers/isroFetcher.js` | Implemented |
| RRB | `src/jobs/fetchers/rrbFetcher.js` | Implemented |
| TNPSC | `src/jobs/fetchers/tnpscFetcher.js` | Implemented |

## Live Smoke Results

No-write smoke command run from this machine:

`node -e "...getFetcherForSource(...).fetch(...)..."`

| Source | Live result |
| --- | --- |
| UPSC | Reached official pages and emitted 1 normalized candidate. |
| SSC | Reached official pages, emitted 0 candidates in the constrained smoke. |
| IBPS | Failed TLS verification from Node: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. TLS validation was not weakened. |
| SBI Careers | Reached official redirected domain and emitted 1 normalized candidate. |
| DRDO | Reached official/RAC pages and emitted 1 normalized candidate. |
| ISRO | Reached official careers page and emitted 1 normalized candidate. |
| RRB | Reached official pages and emitted 1 normalized candidate. |
| TNPSC | Reached official pages and emitted 1 normalized candidate. |

## Fetcher Controls

- All adapters extend `BaseFetcher`.
- Fetches are HTTPS only.
- Each source has an official-domain allowlist in `sourceConfigs.js`.
- Redirect targets must also pass the allowlist.
- Rate limiting is per fetcher instance.
- Retries are limited and retry only transient HTTP failures.
- HTML is sanitized before storage.
- Oversized responses are rejected.
- PDF URLs are captured, but PDF bodies are not fetched in Phase 1.

## Normalized Output

Every adapter returns:

```json
{
  "title": "",
  "organization": "",
  "source": "",
  "notification_url": "",
  "pdf_url": "",
  "published_date": "",
  "last_date": "",
  "raw_content": "",
  "raw_html": ""
}
```

## Notes

- SSC can legitimately return 0 candidates in a narrow smoke if the active notice page does not expose matching recruitment links in the first candidate window.
- IBPS is blocked by certificate-chain validation in this Node environment. The system records this as a fetch failure instead of bypassing TLS.
- Source-specific parsing can be made stricter in Phase 2 after observing production logs.
