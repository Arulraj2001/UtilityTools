# Ingestion Security Report

Validation date: 2026-06-04

## SSRF and URL Blocking

Tested against `BaseFetcher` with controlled inputs.

| Attempt | Result |
| --- | --- |
| `http://localhost` | Blocked |
| `http://127.0.0.1` | Blocked |
| `http://169.254.169.254` | Blocked |
| `file://` | Blocked |
| `ftp://` | Blocked |
| `https://127.0.0.1` | Blocked |
| `https://169.254.169.254` | Blocked |
| `https://10.0.0.1` | Blocked |
| `https://172.16.0.1` | Blocked |
| `https://192.168.1.1` | Blocked |
| non-allowlisted public host | Blocked |
| redirect to private IP | Blocked |
| oversized response | Blocked |

## Controls Verified

- HTTPS only.
- Per-source domain allowlist.
- Private IP rejection.
- Redirect target re-validation.
- Response size cap.
- Timeout support.
- PDF bodies are not fetched by the HTML fetcher.

## Remaining Security Notes

- Direct DNS resolution checks are not performed. The official allowlist is the primary defense against arbitrary host fetches.
- Admin endpoint success-path auth could not be tested because production admin login failed.

## Verdict

Fetcher security controls passed.
