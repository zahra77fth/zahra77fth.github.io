import { useEffect, useRef, useState } from 'react'
import { usePageVisible } from '../../hooks/usePageVisible'
import { usePerformanceTier } from '../../hooks/usePerformanceTier'
import { useReducedMotion } from 'framer-motion'

/** Local files first, then CDN fallback so video always works out of the box. */
const SOURCES = [
  { src: '/video/ambient.webm', type: 'video/webm' },
  { src: '/video/ambient.mp4', type: 'video/mp4' },
  {
    src: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-lights-99786-large.mp4',
    type: 'video/mp4',
  },
] as const

export function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const reduceMotion = useReducedMotion()
  const pageVisible = usePageVisible()
  const tier = usePerformanceTier()
  const showVideo = !reduceMotion && tier === 'full'

  useEffect(() => {
    const video = videoRef.current
    if (!video || !showVideo) return

    const play = async () => {
      try {
        video.muted = true
        video.playsInline = true
        if (pageVisible) await video.play()
        else video.pause()
      } catch {
        /* autoplay blocked or missing file */
      }
    }

    play()
  }, [showVideo, pageVisible, sourceIndex])

  const onError = () => {
    if (sourceIndex < SOURCES.length - 1) {
      setSourceIndex((i) => i + 1)
      setReady(false)
    }
  }

  if (!showVideo) return null

  const current = SOURCES[sourceIndex]

  return (
    <div className="absolute inset-0 overflow-hidden will-change-transform" aria-hidden>
      <video
        ref={videoRef}
        key={current.src}
        className={`absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-[1.2s] ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setReady(true)}
        onCanPlayThrough={() => setReady(true)}
        onError={onError}
      >
        <source src={current.src} type={current.type} />
      </video>

      <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] dark:bg-background/78" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/25 to-background/88" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent,var(--color-background)_70%)]" />
    </div>
  )
}
