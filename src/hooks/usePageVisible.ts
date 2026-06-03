import { useEffect, useState } from 'react'

export function usePageVisible() {
  const [visible, setVisible] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'visible',
  )

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
