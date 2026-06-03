/** 60° tilt — disc viewed from above at an angle. */
export const GALAXY_TILT = (60 * Math.PI) / 180

/** Scroll-driven dive: 0 = overview, 1 = deep inside the disc. */
export function getGalaxyDive(scroll: number) {
  const t = Math.min(1, Math.max(0, scroll))
  return {
    cameraZ: 8 - t * 5.5,
    cameraY: -t * 1.1,
    fov: 60 + t * 14,
    groupZ: t * 4.5,
    scale: 1 + t * 0.45,
    fogNear: 16 - t * 6,
    fogFar: 45 + t * 18,
  }
}
