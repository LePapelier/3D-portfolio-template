import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Line } from '@react-three/drei'
import { ArrowHelper, Color, Vector3 } from 'three'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'

const MIN_SEGMENT_EPSILON = 0.0001
const HOVER_SYNC_DURATION_S = 0.16
const EDGE_HIGHLIGHT_OPACITY_BOOST = 0.45
const ARROW_HEAD_LENGTH = 0.2
const ARROW_HEAD_WIDTH = 0.1
const INTER_CATEGORY_GRADIENT_STEPS = 10

interface Props {
  start: [number, number, number]
  end: [number, number, number]
  expanding: boolean
  expandStartAt?: number
  lineWidth?: number
  targetOpacity?: number
  type: 'parent-child' | 'symmetric'
  color?: string
  gradientFromColor?: string
  gradientToColor?: string
  highlighted?: boolean
  fromRadius?: number
  toRadius?: number
}

function NodeLine({
  start,
  end,
  expanding,
  expandStartAt,
  lineWidth = 2,
  targetOpacity = 0.6,
  type,
  color,
  gradientFromColor,
  gradientToColor,
  highlighted = false,
  fromRadius = 0.5,
  toRadius = 0.5,
}: Props) {
  const lineRef = useRef<any>(null)
  const arrowRef = useRef<ArrowHelper | null>(null)
  const tempDirectionRef = useRef(new Vector3())
  const tempPositionRef = useRef(new Vector3())
  const hasPlayedExpandRef = useRef(false)
  const [isWaitingToExpand, setIsWaitingToExpand] = useState(() => !!expanding && !!expandStartAt && Date.now() < expandStartAt)

  useEffect(() => {
    if (!expanding || !expandStartAt) {
      setIsWaitingToExpand(false)
      return
    }
    
    const remainingMs = expandStartAt - Date.now()
    if (remainingMs <= 0) {
      setIsWaitingToExpand(false)
      return
    }

    setIsWaitingToExpand(true)
    const timeoutId = window.setTimeout(() => {
      setIsWaitingToExpand(false)
    }, remainingMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [expandStartAt, expanding])

  useEffect(() => {
    if (!expanding) {
      hasPlayedExpandRef.current = true
      return
    }

    if (isWaitingToExpand) return

    hasPlayedExpandRef.current = true
  }, [expanding, isWaitingToExpand])

  useLayoutEffect(() => {
    const material = lineRef.current?.material
    const arrow = arrowRef.current
    const arrowLineMaterial = arrow?.line?.material
    const arrowConeMaterial = arrow?.cone?.material

    if (!material && !arrowLineMaterial && !arrowConeMaterial) return

    const lineMaterials = Array.isArray(material) ? material : material ? [material] : []
    const allMaterials = [
      ...lineMaterials,
      arrowLineMaterial,
      arrowConeMaterial,
    ].filter(Boolean) as Array<{ opacity?: number; transparent?: boolean; fog?: boolean }>

    allMaterials.forEach((mat) => {
      gsap.killTweensOf(mat)
      if ('transparent' in mat) {
        mat.transparent = true
      }
      if ('fog' in mat) {
        mat.fog = true
      }
    })

    if (isWaitingToExpand) {
      allMaterials.forEach((mat) => {
        if ('opacity' in mat) {
          mat.opacity = 0
        }
      })
      return
    }

    const now = Date.now()

    const resolvedTargetOpacity = highlighted
      ? Math.min(1, targetOpacity + EDGE_HIGHLIGHT_OPACITY_BOOST)
      : targetOpacity

    if (!expanding || hasPlayedExpandRef.current) {
      allMaterials.forEach((mat) => {
        gsap.to(mat, {
          opacity: resolvedTargetOpacity,
          duration: HOVER_SYNC_DURATION_S,
          ease: 'power2.out',
        })
      })
      return
    }

    const expandDelay = Math.max(0, ((expandStartAt ?? now) - now) / 1000)
    hasPlayedExpandRef.current = true

    allMaterials.forEach((mat) => {
      gsap.fromTo(
        mat,
        { opacity: 0 },
        {
          opacity: resolvedTargetOpacity,
          delay: expandDelay,
          duration: 0.42,
          ease: 'power2.out',
        }
      )
    })
  }, [expandStartAt, expanding, highlighted, isWaitingToExpand, targetOpacity])

  // Définir le style selon le type
  const resolvedColor = color ?? (type === 'parent-child' ? '#9ca3af' : '#ff6600')
  const hasGradient =
    typeof gradientFromColor === 'string' &&
    typeof gradientToColor === 'string' &&
    gradientFromColor !== gradientToColor
  const arrowBaseColor = hasGradient ? gradientToColor : resolvedColor
  const arrowColor = Number.parseInt(arrowBaseColor.replace('#', ''), 16)
  const width = lineWidth
  const { scene } = useThree()

  const {
    direction,
    arrowStart,
    arrowEnd,
    arrowShaftEnd,
    arrowLength,
    arrowHeadLength,
  } = useMemo(() => {
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const dz = end[2] - start[2]
    const segmentLength = Math.hypot(dx, dy, dz)

    const directionTuple: [number, number, number] =
      segmentLength > MIN_SEGMENT_EPSILON
        ? [dx / segmentLength, dy / segmentLength, dz / segmentLength]
        : [1, 0, 0]

    const maxInset = Math.max(0, segmentLength * 0.5 - MIN_SEGMENT_EPSILON)
    const safeFromInset = Math.min(fromRadius, maxInset)
    const safeToInset = Math.min(toRadius, maxInset)

    const nextArrowStart: [number, number, number] = [
      start[0] + directionTuple[0] * safeFromInset,
      start[1] + directionTuple[1] * safeFromInset,
      start[2] + directionTuple[2] * safeFromInset,
    ]
    const nextArrowEnd: [number, number, number] = [
      end[0] - directionTuple[0] * safeToInset,
      end[1] - directionTuple[1] * safeToInset,
      end[2] - directionTuple[2] * safeToInset,
    ]

    const nextArrowLength = Math.hypot(
      nextArrowEnd[0] - nextArrowStart[0],
      nextArrowEnd[1] - nextArrowStart[1],
      nextArrowEnd[2] - nextArrowStart[2],
    )
    const nextArrowHeadLength = Math.min(ARROW_HEAD_LENGTH, nextArrowLength * 0.45)
    const nextArrowShaftEnd: [number, number, number] = [
      nextArrowEnd[0] - directionTuple[0] * nextArrowHeadLength,
      nextArrowEnd[1] - directionTuple[1] * nextArrowHeadLength,
      nextArrowEnd[2] - directionTuple[2] * nextArrowHeadLength,
    ]

    return {
      direction: directionTuple,
      arrowStart: nextArrowStart,
      arrowEnd: nextArrowEnd,
      arrowShaftEnd: nextArrowShaftEnd,
      arrowLength: nextArrowLength,
      arrowHeadLength: nextArrowHeadLength,
    }
  }, [end, fromRadius, start, toRadius])

  useEffect(() => {
    if (type !== 'parent-child') {
      if (arrowRef.current) {
        scene.remove(arrowRef.current)
        arrowRef.current = null
      }
      return
    }

    if (arrowRef.current) return

    const arrow = new ArrowHelper(
      new Vector3(1, 0, 0),
      new Vector3(0, 0, 0),
      1,
      arrowColor,
      ARROW_HEAD_LENGTH,
      ARROW_HEAD_WIDTH,
    )
    arrow.line.visible = false

    const arrowLineMaterial = arrow.line.material as { transparent?: boolean; opacity?: number }
    const arrowConeMaterial = arrow.cone.material as { transparent?: boolean; opacity?: number }
    arrowLineMaterial.transparent = true
    arrowConeMaterial.transparent = true

    arrowRef.current = arrow
    scene.add(arrow)

    return () => {
      if (arrowRef.current) {
        scene.remove(arrowRef.current)
        arrowRef.current = null
      }
    }
  }, [arrowColor, scene, type])

  useEffect(() => {
    const arrow = arrowRef.current
    if (!arrow || type !== 'parent-child') return

    if (arrowLength <= MIN_SEGMENT_EPSILON) {
      arrow.visible = false
      return
    }

    arrow.visible = true
    tempPositionRef.current.set(arrowStart[0], arrowStart[1], arrowStart[2])
    tempDirectionRef.current.set(direction[0], direction[1], direction[2])

    arrow.position.copy(tempPositionRef.current)
    arrow.setDirection(tempDirectionRef.current)
    arrow.setLength(arrowLength, arrowHeadLength, ARROW_HEAD_WIDTH)
    arrow.setColor(new Color(arrowColor))
  }, [arrowColor, arrowHeadLength, arrowLength, arrowStart, direction, type])

  const linePoints = useMemo<[number, number, number][]>(() => {
    if (type === 'parent-child') {
      return [arrowStart, arrowShaftEnd]
    }

    if (type === 'symmetric') {
      return [arrowStart, arrowEnd]
    }

    return [start, end]
  }, [arrowEnd, arrowShaftEnd, arrowStart, end, start, type])

  const gradientPoints = useMemo<[number, number, number][]>(() => {
    if (!hasGradient) return linePoints
    const [fromPoint, toPoint] = linePoints
    return createGradientPoints(fromPoint, toPoint, INTER_CATEGORY_GRADIENT_STEPS)
  }, [hasGradient, linePoints])

  const vertexColors = useMemo<[number, number, number][] | undefined>(() => {
    if (!hasGradient || !gradientFromColor || !gradientToColor) return undefined
    return createGradientVertexColors(
      gradientFromColor,
      gradientToColor,
      gradientPoints.length,
    )
  }, [gradientFromColor, gradientToColor, gradientPoints.length, hasGradient])

  return (
    <Line
      ref={lineRef}
      points={gradientPoints}
      color={hasGradient ? '#ffffff' : resolvedColor}
      vertexColors={vertexColors}
      lineWidth={width}
      dashed={false}
      transparent
      visible={!isWaitingToExpand}
    />
  )
}

function isSameVector3(a: [number, number, number], b: [number, number, number]) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

function arePropsEqual(previous: Props, next: Props) {
  return (
    previous.expanding === next.expanding &&
    previous.expandStartAt === next.expandStartAt &&
    previous.lineWidth === next.lineWidth &&
    previous.targetOpacity === next.targetOpacity &&
    previous.type === next.type &&
    previous.color === next.color &&
    previous.gradientFromColor === next.gradientFromColor &&
    previous.gradientToColor === next.gradientToColor &&
    previous.highlighted === next.highlighted &&
    previous.fromRadius === next.fromRadius &&
    previous.toRadius === next.toRadius &&
    isSameVector3(previous.start, next.start) &&
    isSameVector3(previous.end, next.end)
  )
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function createGradientPoints(
  start: [number, number, number],
  end: [number, number, number],
  steps: number,
): [number, number, number][] {
  const points: [number, number, number][] = []

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const x = start[0] + (end[0] - start[0]) * t
    const y = start[1] + (end[1] - start[1]) * t
    const z = start[2] + (end[2] - start[2]) * t
    points.push([x, y, z])
  }

  return points
}

function createGradientVertexColors(
  fromColor: string,
  toColor: string,
  count: number,
): [number, number, number][] {
  const source = new Color(fromColor)
  const target = new Color(toColor)
  const vertexColors: [number, number, number][] = []

  for (let index = 0; index < count; index += 1) {
    const linearT = count <= 1 ? 1 : index / (count - 1)
    const easedT = easeInOutCubic(linearT)
    const blended = source.clone().lerp(target, easedT)
    vertexColors.push([blended.r, blended.g, blended.b])
  }

  return vertexColors
}

export default memo(NodeLine, arePropsEqual)
  