import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../design-system'

interface SplitHeadlineProps {
  text: string
  className?: string
  as?: 'h1' | 'h2' | 'p' | 'span'
  delay?: number
}

export function SplitHeadline({ text, className, as: Tag = 'span', delay = 0 }: SplitHeadlineProps) {
  const reduceMotion = useReducedMotion()
  const words = text.split(' ')

  if (reduceMotion) {
    return <Tag className={className}>{text}</Tag>
  }

  return (
    <Tag className={cn('split-headline', className)} aria-label={text}>
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} className="split-headline__word inline-flex">
          {word.split('').map((char, ci) => (
            <motion.span
              key={`${wi}-${ci}-${char}`}
              className="split-headline__char inline-block"
              initial={{ opacity: 0, y: '1.1em', rotateX: -80 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: delay + wi * 0.08 + ci * 0.025,
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: '50% 100%' }}
            >
              {char}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span className="inline-block w-[0.3em]" aria-hidden />}
        </span>
      ))}
    </Tag>
  )
}
