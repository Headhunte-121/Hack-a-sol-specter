import type { ReactNode } from 'react'
import { LANGS, useLang } from './i18n'
import { navigate } from './router'

export function LanguageSwitch() {
  const { lang, setLang, t } = useLang()
  return (
    <div role="group" aria-label={t('common.language')} className="flex gap-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`min-h-11 rounded-lg border-2 px-3 text-sm font-bold ${lang === l.code ? 'border-white bg-white text-teal-800' : 'border-teal-300 text-white'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

export function Layout({ title, children, back = true }: { title?: string; children: ReactNode; back?: boolean }) {
  const { t } = useLang()
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="bg-teal-700 px-4 pb-3 pt-3 text-white" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between gap-2">
          {back ? (
            <button className="min-h-11 rounded-lg border-2 border-teal-300 px-3 font-bold" onClick={() => (history.length > 1 ? history.back() : navigate('/'))}>
              ← {t('common.back')}
            </button>
          ) : (
            <span className="text-lg font-bold">🛡️ {t('app.name')}</span>
          )}
          <LanguageSwitch />
        </div>
        {title && <h1 className="mt-3 text-xl font-bold">{title}</h1>}
      </header>
      <main className="flex-1 space-y-4 p-4">{children}</main>
      <footer className="p-4 text-center text-sm text-slate-600">
        <p>{t('footer.disclaimer')}</p>
        <p className="mt-1">{t('privacy.note')}</p>
        <a className="mt-2 inline-block font-bold text-teal-800 underline" href="#/settings">
          {t('settings.title')}
        </a>
      </footer>
    </div>
  )
}
