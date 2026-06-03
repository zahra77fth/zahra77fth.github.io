import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { dawnOrbit, hashSeed } from './dawnMotion'
import { skyInteraction } from '../skyInteraction'

const STAR_COLORS = [
  new THREE.Color('#9EC5E8'),
  new THREE.Color('#C4B4F0'),
  new THREE.Color('#F0B8D8'),
  new THREE.Color('#F5D8A8'),
]

interface ParticleSpec {
  seed: number
  radius: number
  speed: number
  phase: number
  colorIdx: number
  opacity: number
  size: number
}

const starVertex = /* glsl */ `
attribute float aSize;
attribute float aOpacity;
varying vec3 vColor;
varying float vOpacity;
void main() {
  vColor = color;
  vOpacity = aOpacity;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (280.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

const starFragment = /* glsl */ `
varying vec3 vColor;
varying float vOpacity;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.08, d);
  float glow = exp(-d * 5.5) * 0.45;
  float alpha = (core * 0.55 + glow) * vOpacity;
  gl_FragColor = vec4(vColor, alpha);
}
`

function buildSpecs(count: number, layer: 'star' | 'sparkle'): ParticleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = hashSeed(i * 17.31 + (layer === 'sparkle' ? 500 : 0))
    return {
      seed,
      radius: (layer === 'star' ? 1.8 : 0.9) + seed * (layer === 'star' ? 2.8 : 1.4),
      speed: (layer === 'star' ? 0.06 : 0.1) + seed * (layer === 'star' ? 0.08 : 0.12),
      phase: seed * Math.PI * 2,
      colorIdx: Math.floor(seed * STAR_COLORS.length) % STAR_COLORS.length,
      opacity: layer === 'star' ? 0.4 + seed * 0.3 : 0.45 + seed * 0.25,
      size: layer === 'star' ? 0.06 + seed * 0.05 : 0.025 + seed * 0.022,
    }
  })
}

function ParticleLayer({
  specs,
  iridescent,
}: {
  specs: ParticleSpec[]
  iridescent: boolean
}) {
  const ref = useRef<THREE.Points>(null)
  const count = specs.length

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array(count), 1))
    return geo
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starVertex,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      }),
    [],
  )

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const px = skyInteraction.pointerX * 0.35
    const py = -skyInteraction.pointerY * 0.28

    const pos = geometry.attributes.position as THREE.BufferAttribute
    const col = geometry.attributes.color as THREE.BufferAttribute
    const sizes = geometry.attributes.aSize as THREE.BufferAttribute
    const opacities = geometry.attributes.aOpacity as THREE.BufferAttribute
    const c = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const s = specs[i]!
      const p = dawnOrbit(t, s.seed, s.radius, s.speed, s.phase, { x: px, y: py })
      pos.setXYZ(i, p.x, p.y, p.z)

      const base = STAR_COLORS[s.colorIdx]!
      if (iridescent) {
        const shift = Math.sin(t * 1.4 + s.seed * 20) * 0.5 + 0.5
        c.copy(base).lerp(STAR_COLORS[(s.colorIdx + 1) % STAR_COLORS.length]!, shift * 0.35)
      } else {
        c.copy(base)
      }
      col.setXYZ(i, c.r, c.g, c.b)
      sizes.setX(i, s.size * (iridescent ? 0.85 + Math.sin(t * 2 + s.phase) * 0.15 : 1))
      opacities.setX(
        i,
        s.opacity * (iridescent ? 0.85 + Math.sin(t * 1.8 + s.phase) * 0.15 : 0.9 + Math.sin(t + s.phase) * 0.1),
      )
    }

    pos.needsUpdate = true
    col.needsUpdate = true
    sizes.needsUpdate = true
    opacities.needsUpdate = true
  })

  return <points ref={ref} geometry={geometry} material={material} />
}

interface DawnFieldProps {
  starCount: number
  sparkleCount: number
}

/** Pastel orbiting stars + iridescent glass sparkles. */
export function DawnField({ starCount, sparkleCount }: DawnFieldProps) {
  const stars = useMemo(() => buildSpecs(starCount, 'star'), [starCount])
  const sparkles = useMemo(() => buildSpecs(sparkleCount, 'sparkle'), [sparkleCount])

  return (
    <>
      <ParticleLayer specs={stars} iridescent={false} />
      <ParticleLayer specs={sparkles} iridescent />
    </>
  )
}
