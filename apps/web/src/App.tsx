import { lazy, Suspense } from 'react'
import { ErrorBoundary } from './shell/ErrorBoundary'
import { Home } from './shell/Home'
import { Settings } from './shell/Settings'
import { Layout } from './shell/Layout'
import { usePath } from './shell/router'
import { usePwaBootstrap } from './shell/pwa'
import { useLang } from './shell/i18n'

const Placeholder = lazy(() => import('./shell/Placeholder'))

const ROUTES: Record<string, () => React.ReactElement> = {
  '/': () => <Home />,
  '/settings': () => <Settings />,
}

export default function App() {
  usePwaBootstrap()
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
