import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Home } from './shell/Home'
import { Settings } from './shell/Settings'
import { Layout } from './shell/Layout'
import { usePath } from './shell/router'
import { usePwaBootstrap } from './shell/pwa'
import { useReportSync } from './dashboard/sync'
import { useLang } from './shell/i18n'

const Placeholder = lazy(() => import('./shell/Placeholder'))
const DetectorPage = lazy(() => import('./detector/DetectorPage'))
const ReportPage = lazy(() => import('./report/ReportPage'))
const LearnPage = lazy(() => import('./learn/LearnPage'))
const TrendsPage = lazy(() => import('./dashboard/TrendsPage'))
const CallPage = lazy(() => import('./call/CallPage'))

const ROUTES: Record<string, () => React.ReactElement> = {
  '/': () => <Home />,
  '/settings': () => <Settings />,
  '/message': () => <DetectorPage />,
  '/report': () => <ReportPage />,
  '/learn': () => <LearnPage />,
  '/trends': () => <TrendsPage />,
  '/call': () => <CallPage />,
}

export default function App() {
  usePwaBootstrap()
  useReportSync()
  const path = usePath()
  const { t } = useLang()
  const render = ROUTES[path]
  return (
    <ErrorBoundary key={path}>
      <Suspense fallback={<Layout><p>…</p></Layout>}>
        {render ? render() : path === '/' ? <Home /> : <Placeholder title={t('module.soon')} />}
      </Suspense>
    </ErrorBoundary>
  )
}
