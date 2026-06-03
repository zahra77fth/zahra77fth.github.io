/** Shared dome arc path for clouds and birds sweeping across the sky. */
export function carouselPosition(
  u: number,
  travel: number,
  halfTravel: number,
  arcHeight: number,
  laneBaseY: number,
) {
  const progress = (u % 1) * travel
  const x = progress - halfTravel
  const arc = Math.sin((progress / travel) * Math.PI) * arcHeight
  return { x, y: laneBaseY + arc, progress }
}

/** Carousel phase 0–1 — constant speed, not tied to page scroll. */
export function carouselU(
  startOffset: number,
  time: number,
  scrollSpeed: number,
  direction: 1 | -1,
  flockOffset = 0,
) {
  return (
    ((startOffset + flockOffset + time * scrollSpeed * direction) % 1 + 1) % 1
  )
}
