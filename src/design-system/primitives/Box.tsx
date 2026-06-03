import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface BoxProps {
  className?: string
  children: ReactNode
}

/** Neutral layout primitive — prefer over ad-hoc div wrappers. */
export function Box({ className, children }: BoxProps) {
  return <div className={cn(className)}>{children}</div>
}
