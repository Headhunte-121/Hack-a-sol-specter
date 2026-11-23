import { LANGS, useLang } from '../../shell/i18n'

/** Full three-way language choice (used in Settings). */
export function LanguageSwitch() {
  const { lang, setLang, t } = useLang()
  return (
    <div role="group" aria-label={t('common.language')} className="grid grid-cols-3 gap-2">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`btn min-h-14! text-[18px]! ${lang === l.code ? 'btn-primary' : 'btn-secondary'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Compact language pill for Mobile & Web headers (also exported from Layout.tsx). */
export function LangPill({ inverted = false }: { inverted?: boolean }) {
  const { lang, setLang, t } = useLang()
  const idx = LANGS.findIndex((l) => l.code === lang)
  const current = LANGS[idx >= 0 ? idx : 0]
  const next = LANGS[(idx + 1) % LANGS.length]

  return (
    <button
      type="button"
      onClick={() => setLang(next.code)}
      aria-label={t('common.language')}
      title={`${current.label} → ${next.label}`}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors ${
        inverted
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      <span>{current.label}</span>
    </button>
  )
}