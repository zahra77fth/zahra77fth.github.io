import type { ReactNode } from 'react'
import { cn } from '../../design-system'

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('ds-container', className)}>{children}</div>
}
