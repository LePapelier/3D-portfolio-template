import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { BufferGeometry, Points, PointsMaterial } from 'three'
import { particlePalette } from '../styles/palette'

const PARTICLE_COUNT = 350
const SPREAD = 34

function ParticleBackground() {
  const pointsRef = useRef<Points<BufferGeometry, PointsMaterial> | null>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * SPREAD
      arr[i * 3 + 1] = (Math.random() - 0.5) * SPREAD
      arr[i * 3 + 2] = (Math.random() - 0.5) * SPREAD
    }
    return arr
  }, [])

  const colors = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [r, g, b] = particlePalette[Math.floor(Math.random() * particlePalette.length)]
      arr[i * 3 + 0] = r
      arr[i * 3 + 1] = g
      arr[i * 3 + 2] = b
    }
    return arr
  }, [])

  useFrame(() => {
    if (pointsRef.current) pointsRef.current.rotation.y += 0.001
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.05} sizeAttenuation depthWrite={false} transparent opacity={0.95} />
    </points>
  )
}

export default memo(ParticleBackground)
