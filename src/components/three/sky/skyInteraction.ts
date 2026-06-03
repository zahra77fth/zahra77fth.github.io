/** Smoothed pointer (-1…1) and scroll (0…1) for light-mode sky parallax — updated in SkyInteractionRig. */
export const skyInteraction = {
  pointerX: 0,
  pointerY: 0,
  scroll: 0,
  /** Kite-only scroll 0–1 (ramps from Projects downward) */
  kiteScroll: 0,
  /** Smoothed scroll velocity (px per frame, signed) */
  scrollVelocity: 0,
  /** Normalized scroll offset for layered depth (roughly -0.5…0.5 over page) */
  scrollShift: 0,
}
