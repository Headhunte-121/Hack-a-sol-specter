import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  MessageSquareText,
  Phone,
  PhoneCall,
  QrCode,
  Search,
  Settings,
  ShieldAlert,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../../shell/i18n'
import { getUiLabels } from './uiLabels'

interface SearchItem {
  id: string
  href: string
  title: string
  sub?: string
  icon: LucideIcon
  tone: string
  keywords: string[]
}

export function HeroSearch() {
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const items = useMemo<SearchItem[]>(
    () => [
      {
        id: 'message',
        href: '#/message',
        title: t('tile.message'),
        sub: t('tile.message.sub'),
        icon: MessageSquareText,
        tone: 'bg-blue-50 text-blue-700',
        keywords: ['message', 'sms', 'whatsapp', 'link', 'url', 'otp', 'kyc', 'scam', 'phishing', 'संदेश', 'संदेसा', 'लिंक'],
      },
      {
        id: 'call',
        href: '#/call',
        title: t('tile.call'),
        sub: t('tile.call.sub'),
        icon: PhoneCall,
        tone: 'bg-indigo-50 text-indigo-700',
        keywords: ['call', 'voice', 'audio', 'recording', 'phone', 'cbi', 'police', 'arrest', 'कॉल', 'फोन'],
      },
      {
        id: 'qr',
        href: '#/qr',
        title: t('tile.qr'),
        sub: 'UPI & payment QR scanner',
        icon: QrCode,
        tone: 'bg-purple-50 text-purple-700',
        keywords: ['qr', 'upi', 'pay', 'payment', 'scan', 'camera', 'code', 'क्यूआर'],
      },
      {
        id: 'during-call',
        href: '#/during-call',
        title: ui.sosSidebarLabel,
        sub: t('home.duringcall.sub'),
        icon: AlertTriangle,
        tone: 'bg-red-50 text-red-600',
        keywords: ['sos', 'emergency', 'help', 'panic', 'scaring', 'threat', 'digital arrest', 'आपातकाल', 'मदद'],
      },
      {
        id: 'report',
        href: '#/report',
        title: t('tile.report'),
        sub: t('tile.report.sub'),
        icon: ShieldAlert,
        tone: 'bg-amber-50 text-amber-700',
        keywords: ['report', 'scammed', 'complain', 'complaint', 'fraud', 'money', 'cybercrime', 'शिकायत', 'ठगी'],
      },
      {
        id: 'learn',
        href: '#/learn',
        title: t('tile.learn'),
        sub: t('tile.learn.sub'),
        icon: BookOpen,
        tone: 'bg-emerald-50 text-emerald-700',
        keywords: ['learn', 'quiz', 'lesson', 'lessons', 'guide', 'tips', 'pin', 'सीखें', 'सीखव', 'क्विज'],
      },
      {
        id: 'trends',
        href: '#/trends',
        title: t('tile.trends'),
        sub: 'District & channel scam stats',
        icon: TrendingUp,
        tone: 'bg-teal-50 text-teal-700',
        keywords: ['trends', 'stats', 'district', 'alerts', 'chart', 'raipur', 'chhattisgarh', 'रुझान'],
      },
      {
        id: 'settings',
        href: '#/settings',
        title: t('settings.title'),
        sub: 'Language, Demo mode & privacy',
        icon: Settings,
        tone: 'bg-slate-100 text-slate-700',
        keywords: ['settings', 'privacy', 'language', 'hindi', 'english', 'chhattisgarhi', 'demo', 'delete', 'सेटिंग'],
      },
      {
        id: '1930',
        href: 'tel:1930',
        title: `${ui.helplineLabel} (1930)`,
        sub: t('home.call1930.sub'),
        icon: Phone,
        tone: 'bg-blue-50 text-[#1B3B73]',
        keywords: ['1930', 'helpline', 'cyber', 'bank', 'fraud', 'call', 'हेल्पलाइन'],
      },
    ],
    [t, ui],
  )

  const trimmed = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!trimmed) return items.slice(0, 5)
    return items.filter((item) => {
      const haystack = `${item.title} ${item.sub ?? ''} ${item.keywords.join(' ')}`.toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [items, trimmed])

  useEffect(() => {
    setActiveIdx(0)
  }, [trimmed])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const goTo = (href: string) => {
    setOpen(false)
    setQuery('')
    if (href.startsWith('tel:')) {
      window.location.href = href
    } else {
      window.location.hash = href
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      ;(e.target as HTMLInputElement).blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx((prev) => (results.length ? (prev + 1) % results.length : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0) {
        goTo(results[Math.min(activeIdx, results.length - 1)].href)
      } else if (trimmed) {
        goTo('#/message')
      }
    }
  }

  return (
    <div ref={wrapperRef} className="relative z-20">
      <div className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3.5 text-slate-900 shadow-md shadow-blue-950/20 ring-1 ring-slate-200/80 transition-shadow focus-within:ring-2 focus-within:ring-sky-300">
        <Search className="size-4 shrink-0 text-[#1B3B73]" strokeWidth={2.3} />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          placeholder={ui.searchPlaceholder}
          aria-label={ui.searchPlaceholder}
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
          className="h-full w-full min-w-0 bg-transparent text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(true)
            }}
            aria-label="Clear search"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-900 shadow-xl shadow-slate-900/20"
        >
          {!trimmed && (
            <div className="px-2.5 pt-1 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              {ui.searchQuickHeading}
            </div>
          )}

          {results.length > 0 ? (
            results.map((item, idx) => {
              const IconComp = item.icon
              const highlighted = idx === activeIdx
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => goTo(item.href)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    highlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                      <IconComp className="size-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-slate-900">{item.title}</div>
                      {item.sub && <div className="truncate text-[11.5px] text-slate-500">{item.sub}</div>}
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-slate-400" />
                </button>
              )
            })
          ) : (
            <div className="space-y-1.5 p-2 text-center">
              <p className="text-[12.5px] font-medium text-slate-500">{ui.searchNoMatch}</p>
              <button
                type="button"
                onClick={() => goTo('#/message')}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[12.5px] font-bold text-[#1B3B73] hover:bg-blue-100"
              >
                <MessageSquareText className="size-3.5" />
                <span>{ui.searchCheckFallback}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}