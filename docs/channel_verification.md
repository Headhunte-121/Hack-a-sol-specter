# Official channel verification

The app tells people to call, open or report through three official channels. Numbers and portals can change, so a team member checks them on the **official sites** and records the result here. The in-app "Last checked" date (`LAST_VERIFIED` in `apps/web/src/report/channels.ts`) must only be updated after this table is filled in.

## What the app currently says

| Channel | In the app | Source file |
|---|---|---|
| National Cyber Crime Helpline | phone number `1930` | `apps/web/src/report/channels.ts` (`CHANNELS.helpline_1930`) |
| Cybercrime reporting portal | `https://cybercrime.gov.in` | `CHANNELS.cybercrime` |
| Chakshu (Sanchar Saathi) | `https://sancharsaathi.gov.in/sfc/` | `CHANNELS.chakshu` |

Current `LAST_VERIFIED` value: **2026-11-22**. That date came from web-search results that point to the official pages; **a team member has not yet checked the live official sites.**

## Record of checks

Fill in one row per check. Open the official site yourself (type the address, do not follow a link from a message), compare it with the app, and keep a screenshot that shows the address bar and the date.

| Item | What to check | Result (matches / differs, with what you saw) | Checked by | Date | Screenshot |
|---|---|---|---|---|---|
| Helpline 1930 | The number is still 1930; how the official site describes what it is for | | | | |
| cybercrime.gov.in | The address opens the national portal; the wording we use ("report cyber crime") matches the portal | | | | |
| Chakshu on Sanchar Saathi | The address opens the Chakshu page; what the official page says it is for (suspected fraud calls and messages) | | | | |
| Time limits | Whether any official page states a reporting time window. **Do not put a time window in the app unless an official page states it** | | | | |

## How to update the app after a check

1. If a number or address differs, change it in `apps/web/src/report/channels.ts` and in the strings that mention it (`apps/web/scripts/strings_report.py`), then run `npm run check:content`.
2. Set `LAST_VERIFIED` to the date of the check (format `YYYY-MM-DD`).
3. Commit the filled-in table together with the change.
4. Repeat the check on submission day and update the date again.

The app says on screen that it does not file complaints and cannot recover money; that statement stays whatever the check finds.
