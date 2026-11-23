import type { ReactNode } from 'react'
import { MobileLayout } from '../ui/mobile/MobileLayout'
import { useIsDesktop } from '../ui/shared/useViewport'
import { WebLayout } from '../ui/web/WebLayout'

export { LangPill, LanguageSwitch } from '../ui/shared/LanguageSwitch'

export interface LayoutProps {
  children: ReactNode
  back?: boolean
  onBack?: () => void
  title?: string
  lead?: string
  backTo?: string
}

export function Layout({ children, back = true, onBack, title, lead, backTo }: LayoutProps) {
  const isDesktop = useIsDesktop()
  const props: LayoutProps = { children, back, onBack, title, lead, backTo }

  return isDesktop ? <WebLayout {...props} /> : <MobileLayout {...props} />
}