import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

const gapMap = {
  xs: 'ds-stack--xs',
  sm: 'ds-stack--sm',
  md: 'ds-stack--md',
  lg: 'ds-stack--lg',
  xl: 'ds-stack--xl',
} as const

type StackGap = keyof typeof gapMap

interface StackProps {
  gap?: StackGap
  className?: string
  children: ReactNode
}

export function Stack({ gap = 'md', className, children }: StackProps) {
  return <div className={cn('ds-stack', gapMap[gap], className)}>{children}</div>
}
