import { lazy, Suspense, useEffect } from 'react'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Home } from './shell/Home'
import { Settings } from './shell/Settings'
import { Layout } from './shell/Layout'
import { navigate, usePath } from './shell/router'
import { usePwaBootstrap } from './shell/pwa'
import { useReportSync } from './dashboard/sync'
import { captureWebShareTarget, stashSharedText, subscribeNativeShare } from './native/sms'

const DetectorPage = lazy(() => import('./detector/DetectorPage'))
const ReportPage = lazy(() => import('./report/ReportPage'))
const ComplaintPage = lazy(() => import('./report/ComplaintPage'))
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
  '/report/complaint': () => <ComplaintPage />,
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
    captureWebShareTarget()
    let stop: (() => void) | null = null
    void subscribeNativeShare((text) => {
      stashSharedText(text)
      navigate('/message')
      window.dispatchEvent(new CustomEvent('suraksha:shared'))
    }).then((fn) => { stop = fn })
    return () => { stop?.() }
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
