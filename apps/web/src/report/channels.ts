// Official channels. Numbers and portals can change: every card shows a last-verified date, and the team must re-check these
// against the official sites before submission (checklist item in docs/).
export const CHANNELS = {
  helpline_1930: { phone: '1930', url: 'https://cybercrime.gov.in' },
  cybercrime: { name: 'cybercrime.gov.in', url: 'https://cybercrime.gov.in' },
  chakshu: { name: 'Chakshu (Sanchar Saathi)', url: 'https://sancharsaathi.gov.in/sfc/' },
} as const

/** Last verified: 22 Nov 2026 through web search results that point to the official pages (sancharsaathi.gov.in/sfc, cybercrime.gov.in,
 *  helpline 1930). NOT yet re-checked by a team member on the live official sites. */
export const LAST_VERIFIED = '2026-11-22'
