import { Text } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { memo } from 'react'
import { SRGBColorSpace, TextureLoader } from 'three'

interface GithubNodeProps {
  labelSvgPath: string
  labelOffsetX?: number
  labelOffsetY?: number
  secondaryCtaY: number
  secondaryCtaFontSize: number
  secondaryCtaColor: string
  ctaText: string
  collapsing: boolean
}

const GithubNode = memo((props: GithubNodeProps) => {
  const {
    labelSvgPath,
    labelOffsetX = 0,
    labelOffsetY = 0,
    secondaryCtaY,
    secondaryCtaFontSize,
    secondaryCtaColor,
    ctaText,
    collapsing,
  } = props
  const texture = useLoader(TextureLoader, labelSvgPath)
  texture.colorSpace = SRGBColorSpace

  return (
    <>
      {!collapsing && (
        <mesh position={[labelOffsetX, labelOffsetY, 0.001]}>
          <planeGeometry args={[3.2, 0.56]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.01}
            toneMapped={false}
          />
        </mesh>
      )}
      <Text
        position={[0, secondaryCtaY, 0]}
        fontSize={secondaryCtaFontSize}
        color={secondaryCtaColor}
        anchorX="center"
        anchorY="middle"
      >
        {ctaText}
      </Text>
    </>
  )
})

export default GithubNode
