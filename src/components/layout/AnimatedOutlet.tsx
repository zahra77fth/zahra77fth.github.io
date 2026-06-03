import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { pageTransition } from '../../lib/motion'

export function AnimatedOutlet() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : 'initial'}
        animate={reduceMotion ? undefined : 'animate'}
        exit={reduceMotion ? undefined : 'exit'}
        variants={pageTransition}
        className="min-h-[50vh]"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
