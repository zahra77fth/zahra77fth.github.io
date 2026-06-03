import type { Transition, Variants } from 'framer-motion'

export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 28 }

export const springSoft: Transition = { type: 'spring', stiffness: 200, damping: 26 }

export const easeSmooth: Transition = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1],
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32, filter: 'blur(10px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: easeSmooth },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: easeSmooth },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88, rotate: -2 },
  visible: { opacity: 1, scale: 1, rotate: 0, transition: springSoft },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: easeSmooth },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: easeSmooth },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
}

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
}

export const viewportOnce = { once: true, amount: 0.1 as const }

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: easeSmooth },
  exit: { opacity: 0, y: -12, transition: { duration: 0.28 } },
}

export const tapScale = { scale: 0.97 }
export const hoverLift = { y: -6, transition: springSnappy }
