import { motion, type HTMLMotionProps } from 'framer-motion'
import { fadeUp, viewportOnce } from '../../lib/motion'

export function MotionDiv({ children, className = '', ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
