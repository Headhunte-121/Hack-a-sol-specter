// Line icons for the lesson cards: the same style as the app icons (24 x 24, stroke 2, round caps) in two accent colours,
// no photos of people. Names not drawn here come from the shared icon set in shell/ui.tsx. Pure data, so tests and content checks can use it.
export const EXTRA_ICON_PATHS: Record<string, string[]> = {
  card: ['M3 6h18v12H3z', 'M3 10h18', 'M6 15h4'],
  rupee: ['M7 5h10', 'M7 9h10', 'M8 5c4 0 6 1.5 6 4s-2 4-6 4h-1l7 6'],
  key: ['M9 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z', 'M12 11h9', 'M18 11v3', 'M21 11v2'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  people: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6', 'M16 5.3a3 3 0 0 1 0 5.4', 'M17 14.3c2.3.7 4 2.8 4 5.7'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  bank: ['M3 10l9-6 9 6z', 'M5 10v8M9 10v8M15 10v8M19 10v8', 'M3 20h18'],
  sim: ['M7 3h7l4 4v14H7z', 'M10 12h5v6h-5z'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  download: ['M12 4v11', 'M7 11l5 5 5-5', 'M5 20h14'],
  wallet: ['M3 7h16v12H3z', 'M3 7V5h13', 'M15 13h4'],
  gift: ['M4 10h16v10H4z', 'M3 7h18v3H3z', 'M12 7v13', 'M12 7c-3 0-4-3-2-3s2 3 2 3zm0 0c3 0 4-3 2-3s-2 3-2 3z'],
  briefcase: ['M3 8h18v12H3z', 'M9 8V5h6v3', 'M3 13h18'],
  trend: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  box: ['M3 8l9-5 9 5v9l-9 5-9-5z', 'M3 8l9 5 9-5', 'M12 13v9'],
  video: ['M3 6h12v12H3z', 'M15 10l6-3v10l-6-3'],
  screen: ['M3 5h18v12H3z', 'M8 21h8M12 17v4'],
  play: ['M7 4l13 8-13 8z'],
  pause: ['M7 4h4v16H7z', 'M13 4h4v16h-4z'],
}
export const SHARED_ICON_NAMES: string[] = ['shield', 'warn', 'phone', 'message', 'lock', 'check', 'search', 'octagon', 'clipboard', 'folder', 'globe', 'speaker', 'qr', 'book']

/** The icon names a lesson card may use. The content validator test checks every card against this list. */
export const CARD_ICON_NAMES: string[] = [...Object.keys(EXTRA_ICON_PATHS), ...SHARED_ICON_NAMES]

