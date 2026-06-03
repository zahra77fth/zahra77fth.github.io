import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div className={`glass-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg ${className}`}>
      {children}
    </div>
  )
}
