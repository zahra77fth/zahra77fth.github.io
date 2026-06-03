import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface RotatingRolesProps {
  roles: string[]
  className?: string
}

export function RotatingRoles({ roles, className = '' }: RotatingRolesProps) {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion || roles.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % roles.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [roles.length, reduceMotion])

  if (roles.length === 0) return null

  const role = roles[index] ?? roles[0]

  return (
    <p className={`rotating-roles ${className}`} aria-live="polite">
      <span className="text-muted">Focused on </span>
      <span key={role} className="rotating-roles__word font-display font-semibold text-accent">
        {role}
      </span>
    </p>
  )
}
