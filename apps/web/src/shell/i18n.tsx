import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import en from '../i18n/en.json'
import hi from '../i18n/hi.json'
import cg from '../i18n/cg.json'
import { kvGet, kvSet } from './storage'

export type Lang = 'en' | 'hi' | 'cg'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'hi', label: 'हिन्दी' },
  { code: 'cg', label: 'छत्तीसगढ़ी' },
  { code: 'en', label: 'English' },
]
const DICTS: Record<Lang, Record<string, string>> = { en, hi, cg }
// Fallback order: Chhattisgarhi, then Hindi, then English.
const FALLBACK: Record<Lang, Lang[]> = { cg: ['cg', 'hi', 'en'], hi: ['hi', 'en'], en: ['en'] }

export function translate(lang: Lang, key: string, values?: Record<string, string | number>): string {
  for (const l of FALLBACK[lang]) {
    const s = DICTS[l][key]
    if (s !== undefined && s !== '') {
      return values ? s.replace(/\{(\w+)\}/g, (_, k) => (k in values ? String(values[k]) : `{${k}}`)) : s
    }
  }
  if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`)
  return '' // never show a raw key to the user
}

export function defaultLanguage(nav: string = typeof navigator !== 'undefined' ? navigator.language : 'hi'): Lang {
  const n = nav.toLowerCase()
  if (n.startsWith('hne')) return 'cg'
  if (n.startsWith('hi')) return 'hi'
  if (n.startsWith('en')) return 'en'
  return 'hi'
}

export function getLanguage(): Lang {
  const saved = kvGet<Lang | null>('lang', null)
  return saved && saved in DICTS ? saved : defaultLanguage()
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-IN' : 'hi-IN-u-nu-latn').format(value) // Western digits by default
}
export function formatDate(d: Date | number, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-IN' : 'hi-IN-u-nu-latn', { dateStyle: 'medium' }).format(d)
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, values?: Record<string, string | number>) => string }
const LangContext = createContext<Ctx>({ lang: 'hi', setLang: () => {}, t: (k) => translate('hi', k) })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLanguage)
  const setLang = useCallback((l: Lang) => {
    kvSet('lang', l)
    document.documentElement.lang = l === 'cg' ? 'hne' : l
    setLangState(l)
  }, [])
  const t = useCallback((key: string, values?: Record<string, string | number>) => translate(lang, key, values), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
