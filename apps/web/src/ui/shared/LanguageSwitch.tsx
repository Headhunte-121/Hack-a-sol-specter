import { Check, ChevronDown, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
          className={`btn min-h-10.5! px-2! text-[14px]! ${lang === l.code ? 'btn-primary' : 'btn-secondary'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Proportional language dropdown pill for Mobile & Web headers. */
export function LangPill({ inverted = false }: { inverted?: boolean }) {
  const { lang, setLang, t } = useLang()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full font-semibold transition-all active:scale-95 ${
          inverted
            ? 'h-8 bg-white/15 px-2.5 text-[12px] text-white ring-1 ring-white/25 backdrop-blur-xs hover:bg-white/25'
            : 'h-8.5 border border-slate-200/90 bg-white px-3 text-[12.5px] text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Globe
          className="size-3.5 shrink-0 text-slate-500"
          style={inverted ? { color: '#fff' } : undefined}
          strokeWidth={2}
        />
        <span>{current.label}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 opacity-75 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('common.language')}
          className="absolute right-0 z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-800 shadow-xl shadow-slate-900/15"
        >
          {LANGS.map((item) => {
            const active = item.code === lang
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLang(item.code)
                  setOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1B3B73]/10 font-bold text-[#1B3B73]'
                    : 'font-medium text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {active && <Check className="size-4 text-[#1B3B73]" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}