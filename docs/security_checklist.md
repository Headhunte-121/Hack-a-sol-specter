# Security and privacy checklist

| Check | How | Result |
|---|---|---|
| No message text or audio leaves the phone in the message detector | The detector only loads its own model files; sending a report goes through a fixed-field builder (unit test). Watched the API log while checking messages: no request from the detector. | Pass (repeat on a phone with the Network tab open) |
| A raw read against the public database interface fails | `services/api/tests`: `GET /reports`, `/reports/1` and similar return 404/405; no route returns raw columns | Pass (automated) |
| Markup in a message is shown as text and executes nothing | Text is rendered as React text nodes; `detect.test.ts` keeps `<script>` intact as text | Pass (automated); repeat in the browser |
| Secret scan | Pattern scan of all tracked files (keys, tokens, private keys): none found. A dedicated scanner (gitleaks) has not been run | Pass with caveat |
| Dependency audit | `npm audit --omit=dev`: 0 vulnerabilities. `npm audit`: 4 moderate, all in build tooling (`vite-plugin-pwa` > `workbox-build` > `glob` > `minimatch`); no fix without a breaking upgrade. Python packages not audited (`pip-audit` not installed) | Production clean; dev tooling noted |
| Consent defaults to off and switching it off stops all report traffic | `dashboard.test.ts`: with consent off nothing is queued and `fetch` is never called; the sync step discards a queue if consent is off | Pass (automated) |
| The clear-data button removes what it claims | Removes local settings, queue and caches (`shell/Settings.tsx`) | Open: verify by hand |
| Reports hold no free text, identifiers or precise time | Fixed four fields plus the hour; server rejects unknown fields; verified one end-to-end report row | Pass |
| Small cells are hidden | API test with minimum 5; seeded data hides tiny districts | Pass (automated) |
| Rate limiting and token rotation | Token hashed with a daily salt, per-hour limit; tests cover both | Pass (automated) |
| Audio deleted after transcription, also on failure | `services/asr/tests`: temp directory empty after success and after a crash | Pass (automated) |
| Content security policy and frame protection | `apps/web/public/_headers` (Netlify) and `apps/web/vercel.json`: self-only scripts, no inline scripts, `frame-ancestors 'none'` | Open: confirm headers on the deployed host |
| Tampered offline files | Files are served from the app origin over HTTPS and versioned by the service worker; no hash check at load | Not implemented |
| Abuse of the transcription service | 5 MB and 3 minute limits, one job at a time, per-client hourly limit, 120 s timeout | Pass (automated) |

## Not covered

A formal security audit. The free hosting tiers may not allow every header or log control; note any control that cannot be applied. Voice recordings are personal data even when acted: keep them out of the public repository unless every speaker agrees.
