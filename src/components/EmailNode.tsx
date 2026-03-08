import { useLoader } from '@react-three/fiber'
import { memo } from 'react'
import { SRGBColorSpace, TextureLoader } from 'three'

interface EmailNodeProps {
  privateSvgPath: string
  letterSvgPath: string
}

const EmailNode = memo((props: EmailNodeProps) => {
  const {
    privateSvgPath,
    letterSvgPath,
  } = props
  const texture = useLoader(TextureLoader, privateSvgPath)
  const letterTexture = useLoader(TextureLoader, letterSvgPath)
  texture.colorSpace = SRGBColorSpace
  letterTexture.colorSpace = SRGBColorSpace
  const svgOffsetX = 0.2
  const svgOffsetY = 0
  const letterOffsetX = -1.8
  const letterSize = 0.5

  const defaultEmailAspectRatio = 2.6 / 0.34
  const emailAspectRatio =
    texture.image && 'width' in texture.image && 'height' in texture.image && texture.image.height
      ? texture.image.width / texture.image.height
      : defaultEmailAspectRatio
  const emailHeight = 0.5
  const emailWidth = emailHeight * emailAspectRatio

  return (
    <>
      <mesh position={[svgOffsetX, svgOffsetY, 0.001]}>
        <planeGeometry args={[emailWidth, emailHeight]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.01}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[letterOffsetX, svgOffsetY, 0.002]}>
        <planeGeometry args={[letterSize, letterSize]} />
        <meshBasicMaterial
          map={letterTexture}
          transparent
          alphaTest={0.01}
          toneMapped={false}
        />
      </mesh>
    </>
  )
})

export default EmailNode
