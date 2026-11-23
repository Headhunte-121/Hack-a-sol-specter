import { Icon, type IconName } from '../shell/ui'
import { EXTRA_ICON_PATHS, SHARED_ICON_NAMES } from './cardIconNames'

export function CardIcon({ name, size = 44, color = 'currentColor', stroke = 2 }: { name: string; size?: number; color?: string; stroke?: number }) {
  const paths = EXTRA_ICON_PATHS[name]
  if (!paths) return <Icon name={(SHARED_ICON_NAMES.includes(name) ? name : 'shield') as IconName} size={size} color={color} stroke={stroke} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}
