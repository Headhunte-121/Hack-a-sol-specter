import { lazy, Suspense, useEffect } from 'react'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Home } from './shell/Home'
import { Settings } from './shell/Settings'
import { Layout } from './shell/Layout'
import { navigate, usePath } from './shell/router'
import { usePwaBootstrap } from './shell/pwa'
import { useReportSync } from './dashboard/sync'

const DetectorPage = lazy(() => import('./detector/DetectorPage'))
const ReportPage = lazy(() => import('./report/ReportPage'))
const LearnPage = lazy(() => import('./learn/LearnPage'))
const TrendsPage = lazy(() => import('./dashboard/TrendsPage'))
const CallPage = lazy(() => import('./call/CallPage'))
const QrPage = lazy(() => import('./qr/QrPage'))
const DuringCallPage = lazy(() => import('./duringcall/DuringCallPage'))

const ROUTES: Record<string, () => React.ReactElement> = {
  '/': () => <Home />,
  '/settings': () => <Settings />,
  '/message': () => <DetectorPage />,
  '/report': () => <ReportPage />,
  '/learn': () => <LearnPage />,
  '/trends': () => <TrendsPage />,
  '/call': () => <CallPage />,
  '/qr': () => <QrPage />,
  '/during-call': () => <DuringCallPage />,
}

export default function App() {
  usePwaBootstrap()
  useReportSync()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const sharedText = searchParams.get('text') || searchParams.get('url') || searchParams.get('title')
    if (sharedText || window.location.pathname.startsWith('/share-target')) {
      const textToPass = [searchParams.get('text'), searchParams.get('url')].filter(Boolean).join(' ') || searchParams.get('title') || ''
      const senderToPass = searchParams.get('sender') || ''
      window.history.replaceState(null, '', window.location.pathname.startsWith('/share-target') ? '/' : window.location.pathname)
      const q = new URLSearchParams()
      if (textToPass) q.set('text', textToPass)
      if (senderToPass) q.set('sender', senderToPass)
      navigate(`/message?${q.toString()}`)
    }
  }, [])

  const path = usePath()
  const render = ROUTES[path]
  return (
    <ErrorBoundary key={path}>
      <Suspense fallback={<Layout><p>…</p></Layout>}>
        {render ? render() : <Home />}
      </Suspense>
    </ErrorBoundary>
  )
}
