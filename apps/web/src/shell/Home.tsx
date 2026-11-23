import { useEffect, useState } from 'react'
import { HomeMobile } from '../ui/mobile/HomeMobile'
import { useIsDesktop } from '../ui/shared/useViewport'
import { HomeWeb } from '../ui/web/HomeWeb'
import { Layout } from './Layout'
import { useOnlineStatus } from './online'
import { applyUpdate, usePwaState } from './pwa'
import { subscribeQueue } from './queue'

export function Home() {
  const isDesktop = useIsDesktop()
  const online = useOnlineStatus()
  const pwa = usePwaState()
  const [pending, setPending] = useState(0)
  const [updateBlocked, setUpdateBlocked] = useState(false)

  useEffect(() => subscribeQueue(setPending), [])

  const viewProps = {
    online,
    pending,
    pwa,
    updateBlocked,
    onApplyUpdate: async () => setUpdateBlocked(!(await applyUpdate())),
  }

  return (
    <Layout back={false}>
      {isDesktop ? <HomeWeb {...viewProps} /> : <HomeMobile {...viewProps} />}
    </Layout>
  )
}