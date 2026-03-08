import { Billboard, OrbitControls, Stars, Text } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Fog, Group, PerspectiveCamera, TextureLoader, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import GraphNode from '../components/GraphNode.tsx'
import NodeLine from '../components/NodeLine'
import ParticleBackground from '../components/ParticleBackground'
import {
  emailLetterSvgPath,
  emailPrivateSvgPath,
  getEffectiveCardMaxWidth,
  getEffectiveCardMaxVisualHalfSpan,
  githubLabelSvgPath,
  isPhoneLandscapeViewport,
} from '../components/graphNode/constants'
import { useGraphStore } from '../store/useGraphStore.ts'
import { getPortfolioStructure, symmetricEdges } from '../store/graph/config'
import { baseGraphColorPool, fogSettings, palette } from '../styles/palette'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

interface EdgeDescriptor {
  key: string
  startNodeId: string
  endNodeId: string
  start: [number, number, number]
  end: [number, number, number]
  expanding: boolean
  expandStartAt?: number
  type: 'parent-child' | 'symmetric'
  color: string
  gradientFromColor?: string
  gradientToColor?: string
}

const MAX_SUB_STEPS = 1
const MAX_PAN_TARGET_RADIUS = 7
const MAIN_NODE_IDLE_WOBBLE_DELAY_MS = 5000
const MAIN_NODE_IDLE_TEXT_DELAY_MS = 10000
const START_HINT_WOBBLE_SCALE = 1.16
const START_HINT_WOBBLE_DURATION_S = 0.52
const RANDOM_NODE_COLOR_POOL = Array.from(new Set(baseGraphColorPool))
const DYNAMIC_VELOCITY_THRESHOLD = 0.24
const LABEL_ABBREVIATION_MIN_NODES = 10
const START_HINT_OFFSET = 1
const START_HINT_FONT_SIZE = 0.34
const START_HINT_COLOR = '#D5DCE8'
const FOCUS_FOG_NEAR_FACTOR = 1.05  // fog starts 5% beyond the focused card distance
const FOCUS_FOG_FAR_FACTOR = 1.5    // fully fogged at 1.5× the focused card distance
const FOCUS_FOG_TRANSITION_SPEED = 4 // 1/speed ≈ transition duration in seconds
// Fraction of viewport (width or height) reserved for the focused card (leaves ~10% margin on each side)
const FOCUS_VIEWPORT_FILL = 0.9
// In phone landscape, use a tighter fill for near-edge-to-edge card display
const PHONE_LANDSCAPE_FOCUS_FILL = 0.97
const DEFAULT_MIN_FOCUS_DIST = 4.5
const PHONE_LANDSCAPE_MIN_FOCUS_DIST = 2.0
const startHintOffsetVector = new Vector3()
useLoader.preload(TextureLoader, githubLabelSvgPath)
useLoader.preload(TextureLoader, emailPrivateSvgPath)
useLoader.preload(TextureLoader, emailLetterSvgPath)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function shuffleColors(colors: string[]): string[] {
  const next = [...colors]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = next[index]
    next[index] = next[randomIndex]
    next[randomIndex] = temp
  }

  return next
}

function precomputeNodeColorsById(
  portfolioStructureByTemplate: Record<string, { key: string; label: string; href?: string }[]>,
): Map<string, string> {
  const colorsById = new Map<string, string>()
  const availableColors = shuffleColors(RANDOM_NODE_COLOR_POOL)
  let nextColorIndex = 0
  const rootNodeId = 'main'
  const rootTemplateKey = 'root'

  colorsById.set(rootNodeId, palette.textPrimary)

  const getNextUniqueColor = () => {
    const color = availableColors[nextColorIndex]
    if (!color) {
      throw new Error('Not enough colors in baseGraphColorPool to keep unique single-use node colors.')
    }

    nextColorIndex += 1
    return color
  }

  const visit = (parentId: string, parentTemplateKey: string, parentColor: string) => {
    const children = portfolioStructureByTemplate[parentTemplateKey] ?? []

    children.forEach((child) => {
      const childId = `${parentId}-${child.key}`
      const isExpandable = (portfolioStructureByTemplate[child.key]?.length ?? 0) > 0
      const childColor = isExpandable ? getNextUniqueColor() : parentColor

      colorsById.set(childId, childColor)
      visit(childId, child.key, childColor)
    })
  }

  visit(rootNodeId, rootTemplateKey, palette.textPrimary)
  return colorsById
}

function precomputeSubtreeHeightByTemplateKey(
  portfolioStructureByTemplate: Record<string, { key: string; label: string; href?: string }[]>,
): Map<string, number> {
  const heightByTemplateKey = new Map<string, number>()
  const visiting = new Set<string>()

  const getHeight = (templateKey: string): number => {
    const cached = heightByTemplateKey.get(templateKey)
    if (typeof cached === 'number') return cached
    if (visiting.has(templateKey)) return 0

    visiting.add(templateKey)
    const children = portfolioStructureByTemplate[templateKey] ?? []
    const maxChildHeight = children.reduce((maxHeight, child) => {
      return Math.max(maxHeight, getHeight(child.key))
    }, 0)
    const ownHeight = children.length > 0 ? 1 + maxChildHeight : 0

    visiting.delete(templateKey)
    heightByTemplateKey.set(templateKey, ownHeight)
    return ownHeight
  }

  getHeight('root')
  return heightByTemplateKey
}

export default function Experience() {
  const nodes = useGraphStore((s) => s.nodes)
  const language = useGraphStore((s) => s.language)
  const portfolioStructureByTemplate = useMemo(() => getPortfolioStructure(language), [language])
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId)
  const tickPhysics = useGraphStore((s) => s.tickPhysics)
  const isDraggingNode = useGraphStore((s) => s.draggedNodeId !== null)
  const focusedCardNodeId = useGraphStore((s) => s.focusedCardNodeId)
  const setFocusedCardNodeId = useGraphStore((s) => s.setFocusedCardNodeId)
  const { camera, size } = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const physicsAccumulatorRef = useRef(0)
  const nodeDistanceOrderIndexByIdRef = useRef<Map<string, number>>(new Map())
  const startHintGroupRef = useRef<Group | null>(null)
  const nodeColorByIdRef = useRef<Map<string, string> | null>(null)
  const mainExpandedRef = useRef(false)
  const savedCameraRef = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const focusFogProgressRef = useRef(0)
  const focusDistanceRef = useRef(4.5)
  // Tracks focused node's last known position so the camera can follow its movement
  const focusedNodeLastPosRef = useRef<Vector3 | null>(null)
  // True while the initial GSAP focus animation is running (avoid conflicting updates)
  const isFocusAnimatingRef = useRef(false)
  // Reusable vector for the focused node position tracking (avoids per-frame allocation)
  const focusedNodeCurrentPosRef = useRef(new Vector3())
  const [showStartHint, setShowStartHint] = useState(false)
  const [showStartHintText, setShowStartHintText] = useState(false)
  const nodeCount = nodes.length
  const isDenseGraphMode = nodeCount > 50
  const isMediumGraphMode = nodeCount > 90
  const isLargeGraphMode = nodeCount > 130
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const firstNodeByTemplateKey = useMemo(() => {
    const byTemplateKey = new Map<string, (typeof nodes)[number]>()

    nodes.forEach((node) => {
      if (!byTemplateKey.has(node.templateKey)) {
        byTemplateKey.set(node.templateKey, node)
      }
    })

    return byTemplateKey
  }, [nodes])
  const subtreeHeightByTemplateKey = useMemo(
    () => precomputeSubtreeHeightByTemplateKey(portfolioStructureByTemplate),
    [portfolioStructureByTemplate],
  )
  const radiusByNodeId = useMemo(() => {
    const minRadius = 0.1
    const radiusStepPerDepthDelta = 0.10
    const maxRadius = 0.92
    const radii = new Map<string, number>()

    nodes.forEach((node) => {
      const subtreeHeight = subtreeHeightByTemplateKey.get(node.templateKey) ?? 0
      const radius = Math.min(maxRadius, minRadius + subtreeHeight * radiusStepPerDepthDelta)
      radii.set(node.id, radius)
    })

    return radii
  }, [nodes, subtreeHeightByTemplateKey])
  const rootNode = useMemo(() => nodes.find((node) => node.id === 'main') ?? null, [nodes])
  if (nodeColorByIdRef.current === null) {
    nodeColorByIdRef.current = precomputeNodeColorsById(portfolioStructureByTemplate)
  }
  const nodeColorById = nodeColorByIdRef.current
  const getNodeColor = (nodeId: string) => nodeColorById.get(nodeId) ?? palette.nodePrimary
  const startHintText =
    language === 'fr'
      ? 'Clique sur la sphère pour commencer...'
      : 'Click the sphere to start exploring...'
  const getDistanceOrderIndex = (nodeId: string) => {
    if (nodes.length < LABEL_ABBREVIATION_MIN_NODES) return 0
    return nodeDistanceOrderIndexByIdRef.current.get(nodeId) ?? 0
  }
  const edges = useMemo(() => {
    const descriptors: EdgeDescriptor[] = [];

    nodes.forEach((node) => {
      node.childrenIds?.forEach((childId) => {
        const child = nodeById.get(childId)
        if (!child) return

        const fromEdgeColor = getNodeColor(node.id)
        const toEdgeColor = getNodeColor(child.id)
        const isInterNodeColor = fromEdgeColor !== toEdgeColor

        descriptors.push({
          key: `${node.id}-${child.id}`,
          startNodeId: node.id,
          endNodeId: child.id,
          start: node.position,
          end: child.position,
          expanding: !!child.expanding,
          expandStartAt: child.expandStartAt,
          type: 'parent-child',
          color: fromEdgeColor,
          gradientFromColor: isInterNodeColor ? fromEdgeColor : undefined,
          gradientToColor: isInterNodeColor ? toEdgeColor : undefined,
        })
      })
    })

    symmetricEdges.forEach(([fromKey, toKey]) => {
      const fromNode = firstNodeByTemplateKey.get(fromKey)
      const toNode = firstNodeByTemplateKey.get(toKey)
      if (fromNode && toNode) {
        const fromEdgeColor = getNodeColor(fromNode.id)
        const toEdgeColor = getNodeColor(toNode.id)
        const isInterNodeColor = fromEdgeColor !== toEdgeColor

        descriptors.push({
          key: `${fromNode.id}-${toNode.id}-symmetric`,
          startNodeId: fromNode.id,
          endNodeId: toNode.id,
          start: fromNode.position,
          end: toNode.position,
          expanding: !!fromNode.expanding || !!toNode.expanding,
          expandStartAt: fromNode.expandStartAt,
          type: 'symmetric',
          color: fromEdgeColor,
          gradientFromColor: isInterNodeColor ? fromEdgeColor : undefined,
          gradientToColor: isInterNodeColor ? toEdgeColor : undefined,
        })
      }
    })

    return descriptors
  }, [firstNodeByTemplateKey, nodeById, nodeColorById, nodes])

  const isDynamicGraph = useMemo(
    () =>
      isDraggingNode ||
      nodes.some((node) => {
        if (node.expanding || node.collapsing) return true
        const [vx, vy, vz] = node.velocity
        return (
          Math.abs(vx) > DYNAMIC_VELOCITY_THRESHOLD ||
          Math.abs(vy) > DYNAMIC_VELOCITY_THRESHOLD ||
          Math.abs(vz) > DYNAMIC_VELOCITY_THRESHOLD
        )
      }),
    [isDraggingNode, nodes],
  )

  const visibleEdges = useMemo(() => {
    if (!isDenseGraphMode) return edges

    const baseStep = isLargeGraphMode ? 4 : isMediumGraphMode ? 3 : 2
    const step = isDynamicGraph ? baseStep + 1 : baseStep
    return edges.filter((_, index) => index % step === 0)
  }, [edges, isDenseGraphMode, isDynamicGraph, isLargeGraphMode, isMediumGraphMode])

  const physicsStep = useMemo(() => {
    if (isDynamicGraph) {
      if (nodes.length > 120) return 1 / 24
      if (nodes.length > 70) return 1 / 28
      return 1 / 32
    }

    if (nodes.length > 120) return 1 / 30
    if (nodes.length > 70) return 1 / 35
    return 1 / 40
  }, [isDynamicGraph, nodes.length])

  useEffect(() => {
    mainExpandedRef.current = !!rootNode?.expanded

    if (mainExpandedRef.current) {
      setShowStartHint(false)
      setShowStartHintText(false)
    }
  }, [rootNode?.expanded])

  useEffect(() => {
    const wobbleIdleTimeout = window.setTimeout(() => {
      if (mainExpandedRef.current) return
      setShowStartHint(true)
    }, MAIN_NODE_IDLE_WOBBLE_DELAY_MS)

    const textIdleTimeout = window.setTimeout(() => {
      if (mainExpandedRef.current) return
      setShowStartHintText(true)
    }, MAIN_NODE_IDLE_TEXT_DELAY_MS)

    return () => {
      window.clearTimeout(wobbleIdleTimeout)
      window.clearTimeout(textIdleTimeout)
    }
  }, [])

  useEffect(() => {
    const hintGroup = startHintGroupRef.current
    if (!hintGroup) return

    gsap.killTweensOf(hintGroup.scale)

    if (!showStartHint) {
      gsap.to(hintGroup.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.22,
        ease: 'power2.out',
      })
      return
    }

    gsap.to(hintGroup.scale, {
      x: START_HINT_WOBBLE_SCALE,
      y: START_HINT_WOBBLE_SCALE,
      z: START_HINT_WOBBLE_SCALE,
      duration: START_HINT_WOBBLE_DURATION_S,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })

    return () => {
      gsap.killTweensOf(hintGroup.scale)
    }
  }, [showStartHint])

  // Clear focus automatically when the focused node starts collapsing or disappears
  useEffect(() => {
    if (!focusedCardNodeId) return
    const node = nodes.find((n) => n.id === focusedCardNodeId)
    if (!node || node.collapsing) {
      setFocusedCardNodeId(null)
    }
  }, [nodes, focusedCardNodeId, setFocusedCardNodeId])

  // Camera focus / unfocus with smooth GSAP animation
  const FOCUS_DURATION = 1.0
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    // Compute adaptive focus distance so the card fits the current viewport
    const aspect = size.width / size.height
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 75
    const vertHalfFovRad = (fov * Math.PI / 180) / 2
    // Use the same landscape-aware max-width as GraphNode
    const effectiveCardMaxWidth = getEffectiveCardMaxWidth(size.width, size.height)
    // Phone landscape: use tighter fill and lower minimum distance for near-edge-to-edge card display
    const isPhoneLandscape = isPhoneLandscapeViewport(size.width, size.height)
    const focusFill = isPhoneLandscape ? PHONE_LANDSCAPE_FOCUS_FILL : FOCUS_VIEWPORT_FILL
    const minFocusDist = isPhoneLandscape ? PHONE_LANDSCAPE_MIN_FOCUS_DIST : DEFAULT_MIN_FOCUS_DIST
    // totalWidth: card body + focus-button clearance + small buffer
    const totalWidth = effectiveCardMaxWidth + 1.0
    const minDistForWidth = totalWidth / (2 * Math.tan(vertHalfFovRad) * aspect * focusFill)
    // Height constraint: the card is vertically asymmetric (title/institution above the node origin).
    // cardMaxVisualHalfSpan = 2 × maxTopExtent so the formula min = span/(2·tan·fill) = topExtent/(tan·fill)
    // correctly ensures the top edge (farthest from the target) stays within the viewport.
    const effectiveHalfSpan = getEffectiveCardMaxVisualHalfSpan(size.width, size.height)
    const minDistForHeight = effectiveHalfSpan / (2 * Math.tan(vertHalfFovRad) * focusFill)
    const FOCUS_DISTANCE = Math.max(minDistForWidth, minDistForHeight, minFocusDist)
    focusDistanceRef.current = FOCUS_DISTANCE

    gsap.killTweensOf(camera.position)
    gsap.killTweensOf(controls.target)

    if (focusedCardNodeId === null) {
      // Stop following any previously focused node
      focusedNodeLastPosRef.current = null
      isFocusAnimatingRef.current = false

      // Restore the saved camera state
      const saved = savedCameraRef.current
      if (!saved) return

      gsap.to(camera.position, {
        x: saved.position.x,
        y: saved.position.y,
        z: saved.position.z,
        duration: FOCUS_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
        onComplete: () => {
          savedCameraRef.current = null
        },
      })
      gsap.to(controls.target, {
        x: saved.target.x,
        y: saved.target.y,
        z: saved.target.z,
        duration: FOCUS_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
      return
    }

    const node = useGraphStore.getState().nodes.find((n) => n.id === focusedCardNodeId)
    if (!node) return

    // Save state only for the very first focus (not when switching between focused cards)
    if (!savedCameraRef.current) {
      savedCameraRef.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      }
    }

    // Reset node tracking – will be seeded once the animation completes
    focusedNodeLastPosRef.current = null
    isFocusAnimatingRef.current = true

    // Maintain current viewing angle, only change distance and target
    const nodePos = new Vector3(node.position[0], node.position[1], node.position[2])
    const camDir = camera.position.clone().sub(nodePos)
    if (camDir.length() < 0.001) camDir.set(0, 0, 1)
    const newCamPos = nodePos.clone().add(camDir.normalize().multiplyScalar(FOCUS_DISTANCE))

    gsap.to(camera.position, {
      x: newCamPos.x,
      y: newCamPos.y,
      z: newCamPos.z,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => controls.update(),
      onComplete: () => {
        isFocusAnimatingRef.current = false
        // Seed node position tracking so we can follow the card if it drifts
        const latestNode = useGraphStore.getState().nodes.find((n) => n.id === focusedCardNodeId)
        if (latestNode) {
          focusedNodeLastPosRef.current = new Vector3(
            latestNode.position[0],
            latestNode.position[1],
            latestNode.position[2],
          )
        }
      },
    })
    gsap.to(controls.target, {
      x: nodePos.x,
      y: nodePos.y,
      z: nodePos.z,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => controls.update(),
    })
  }, [focusedCardNodeId, camera, size])

  useFrame(({ camera, scene }, delta) => {
    const boundedDelta = Math.min(delta, 0.1)
    physicsAccumulatorRef.current += boundedDelta

    let subSteps = 0
    while (physicsAccumulatorRef.current >= physicsStep && subSteps < MAX_SUB_STEPS) {
      tickPhysics(physicsStep)
      physicsAccumulatorRef.current -= physicsStep
      subSteps += 1
    }

    // After physics: keep camera locked on the focused card if it has drifted
    const controls = controlsRef.current
    if (focusedCardNodeId && !isFocusAnimatingRef.current && controls) {
      const focusedNode = useGraphStore.getState().nodes.find((n) => n.id === focusedCardNodeId)
      if (focusedNode) {
        const currentPos = focusedNodeCurrentPosRef.current.set(
          focusedNode.position[0],
          focusedNode.position[1],
          focusedNode.position[2],
        )
        const lastPos = focusedNodeLastPosRef.current
        if (lastPos) {
          const dx = currentPos.x - lastPos.x
          const dy = currentPos.y - lastPos.y
          const dz = currentPos.z - lastPos.z
          const movedSq = dx * dx + dy * dy + dz * dz
          if (movedSq > 1e-8) {
            camera.position.x += dx
            camera.position.y += dy
            camera.position.z += dz
            controls.target.x += dx
            controls.target.y += dy
            controls.target.z += dz
            controls.update()
          }
          lastPos.copy(currentPos)
        } else {
          // Seed the tracking ref on the first post-animation frame
          focusedNodeLastPosRef.current = currentPos.clone()
        }
      }
    }

    const distanceFromCenter = camera.position.length()
    const dynamicNear = clamp(
      distanceFromCenter * fogSettings.nearRatio,
      fogSettings.minNear,
      fogSettings.maxNear,
    )
    const dynamicFar = clamp(
      distanceFromCenter * fogSettings.farRatio,
      fogSettings.minFar,
      fogSettings.maxFar,
    )

    const sceneFog = scene.fog as Fog | null
    if (sceneFog) {
      // Smoothly transition fog density when a card is focused
      const focusTarget = focusedCardNodeId ? 1 : 0
      focusFogProgressRef.current = clamp(
        focusFogProgressRef.current + (focusTarget - focusFogProgressRef.current) * boundedDelta * FOCUS_FOG_TRANSITION_SPEED,
        0,
        1,
      )
      const p = focusFogProgressRef.current
      const focusFogNear = focusDistanceRef.current * FOCUS_FOG_NEAR_FACTOR
      const focusFogFar = focusDistanceRef.current * FOCUS_FOG_FAR_FACTOR
      sceneFog.near = dynamicNear * (1 - p) + focusFogNear * p
      sceneFog.far = Math.max(dynamicFar * (1 - p) + focusFogFar * p, sceneFog.near + 1)
    }

    if (controls) {
      const targetLength = controls.target.length()

      if (targetLength > MAX_PAN_TARGET_RADIUS) {
        controls.target.multiplyScalar(MAX_PAN_TARGET_RADIUS / targetLength)
        controls.update()
      }
    }

    const hintGroup = startHintGroupRef.current
    if (hintGroup && rootNode) {
      const offset = startHintOffsetVector
        .set(0, -1, 0)
        .applyQuaternion(camera.quaternion)
        .normalize()
        .multiplyScalar(START_HINT_OFFSET)

      hintGroup.position.set(
        rootNode.position[0] + offset.x,
        rootNode.position[1] + offset.y,
        rootNode.position[2] + offset.z,
      )
    }

    if (nodes.length < LABEL_ABBREVIATION_MIN_NODES) {
      if (nodeDistanceOrderIndexByIdRef.current.size > 0) {
        nodeDistanceOrderIndexByIdRef.current = new Map()
      }
      return
    }

    const ranked = nodes
      .map((node) => {
        const dx = camera.position.x - node.position[0]
        const dy = camera.position.y - node.position[1]
        const dz = camera.position.z - node.position[2]
        return {
          id: node.id,
          distanceSq: dx * dx + dy * dy + dz * dz,
        }
      })
      .sort((a, b) => a.distanceSq - b.distanceSq)

    const nextRankById = new Map<string, number>()
    ranked.forEach((entry, index) => {
      nextRankById.set(entry.id, index)
    })
    nodeDistanceOrderIndexByIdRef.current = nextRankById
  }, 1)

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, fogSettings.near, fogSettings.far]} />
      <ambientLight color={palette.lightAmbient} intensity={0.3} />
      <pointLight color={palette.lightPoint} position={[10, 10, 10]} intensity={5} />

      {!(isDynamicGraph && isDenseGraphMode) && <ParticleBackground />}

      {nodes.map((n) => {
        const radius = radiusByNodeId.get(n.id) ?? 0.5
        const accentColor = getNodeColor(n.id)
        
        return (
          <GraphNode
            key={n.id}
            id={n.id}
            templateKey={n.templateKey}
            label={n.label}
            getDistanceOrderIndex={getDistanceOrderIndex}
            totalNodeCount={nodes.length}
            visualType={n.visualType}
            accentColor={accentColor}
            href={n.href}
            expanding={!!n.expanding}
            expandStartAt={n.expandStartAt}
            collapsing={!!n.collapsing}
            collapseRole={n.collapseRole}
            collapseStartAt={n.collapseStartAt}
            expanded={!!n.expanded}
            position={n.position}
            spawnFrom={n.spawnFrom}
            depth={n.depth}
            radius={radius}
          />
        )
      })}

      {visibleEdges.map((edge) => {
        const fromNode = nodeById.get(edge.startNodeId)
        const toNode = nodeById.get(edge.endNodeId)
        const isEdgeHighlighted =
          hoveredNodeId !== null &&
          (edge.startNodeId === hoveredNodeId || edge.endNodeId === hoveredNodeId)
        const fromRadius = fromNode ? (radiusByNodeId.get(fromNode.id) ?? 0.5) : 0.5
        const toRadius = toNode ? (radiusByNodeId.get(toNode.id) ?? 0.5) : 0.5
        return (
          <NodeLine
            key={edge.key}
            start={edge.start}
            end={edge.end}
            expanding={edge.expanding}
            expandStartAt={edge.expandStartAt}
            lineWidth={isLargeGraphMode ? 1 : 2}
            targetOpacity={isLargeGraphMode ? 0.45 : isMediumGraphMode ? 0.5 : 0.6}
            type={edge.type}
            color={edge.color}
            gradientFromColor={edge.gradientFromColor}
            gradientToColor={edge.gradientToColor}
            highlighted={isEdgeHighlighted}
            fromRadius={fromRadius}
            toRadius={toRadius}
          />
        )
      })}

      {!isDenseGraphMode && (
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.08} luminanceSmoothing={0.94} />
        </EffectComposer>
      )}

      <Stars
        radius={70}
        depth={25}
        count={isDynamicGraph ? (isLargeGraphMode ? 120 : isMediumGraphMode ? 160 : 200) : (isLargeGraphMode ? 180 : isMediumGraphMode ? 200 : 240)}
        factor={1.2}
        saturation={1}
        speed={0.1}
      />

      {showStartHint && rootNode && (
        <group ref={startHintGroupRef} position={rootNode.position}>
          {showStartHintText && (
            <Billboard>
              <Text
                position={[0, 0, 0]}
                fontSize={START_HINT_FONT_SIZE}
                color={START_HINT_COLOR}
                anchorX="center"
                anchorY="top"
                textAlign="center"
                maxWidth={7}
              >
                {startHintText}
              </Text>
            </Billboard>
          )}
        </group>
      )}

      <OrbitControls
        ref={controlsRef}
        enabled={!isDraggingNode}
        enablePan={focusedCardNodeId === null}
        enableZoom={focusedCardNodeId === null}
        minDistance={3}
        maxDistance={18}
      />
    </>
  )
}
