import { memo, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Billboard, Line, Text } from '@react-three/drei'
import { DoubleSide, Vector3 } from 'three'
import type { BufferGeometry, Camera, Group, Material, MeshBasicMaterial, Mesh } from 'three'
import gsap from 'gsap'
import { useGraphStore } from '../store/useGraphStore.ts'
import CardNode from './CardNode'
import EmailNode from './EmailNode'
import GithubNode from './GithubNode'
import { getCardNodeContent } from './graphNode/content'
import {
  cardBaseExpandedWidth,
  cardCenterY,
  cardCharWidthFactor,
  cardCollapsedCtaColor,
  cardCollapsedCtaFontSize,
  cardCollapsedHeight,
  cardCollapsedTitleGap,
  cardCollapsedWidth,
  cardDragStartThreshold,
  cardExpandedTitleGap,
  cardHorizontalPadding,
  cardSummaryDetailsGap,
  cardTextBottomPadding,
  cardTextTopPadding,
  emailLetterSvgPath,
  emailPrivateSvgPath,
  getCardCollapsedCtaText,
  getEffectiveCardMaxWidth,
  getGithubCtaText,
  getResearchCtaText,
  githubLabelSvgPath,
  researchCtaFontSize,
  secondaryCtaColor,
  secondaryCtaFontSize,
  secondaryCtaY,
} from './graphNode/constants'
import type { GraphNodeProps } from './graphNode/types'
import { useGraphNodeActions } from './graphNode/useGraphNodeActions'
import { useGraphNodeAnimations } from './graphNode/useGraphNodeAnimations'
import { useGraphNodeInteractions } from './graphNode/useGraphNodeInteractions'
import { areGraphNodePropsEqual, clamp, formatLabelWithIcon, getLabelIcon } from './graphNode/utils'

const HOVER_SYNC_DURATION_S = 0.16
const MAIN_NODE_IDLE_WOBBLE_DELAY_MS = 5000
const LABEL_ABBREVIATION_GROUP_SIZE = 3
const LABEL_ABBREVIATION_MIN_VISIBLE_FRACTION = 0.12
const LABEL_ABBREVIATION_SUFFIX = '[...]'
const labelUpVector = new Vector3()
const CARD_TEXT_LINE_HEIGHT_FACTOR = 1.28

// CardFocusButton constants
const FOCUS_BTN_X_OFFSET = 0.26   // x gap between card right border and button centre
const FOCUS_BTN_ICON_HALF = 0.15  // half-size of the icon visual (used for y-alignment too)
const FOCUS_BTN_HIT_HALF = 0.23   // hit-area half-side
const FOCUS_BTN_COLOR_IDLE = '#5bb8f5'
const FOCUS_BTN_COLOR_ACTIVE = '#ff2222'
const FOCUS_BTN_COLOR_IDLE_HOVER = '#7ed4ff'
const FOCUS_BTN_COLOR_ACTIVE_HOVER = '#ff5555'
const FOCUS_BTN_HOVER_SCALE = 1.22
const FOCUS_BTN_HOVER_DURATION = 0.16

/**
 * A small interactive button rendered in the Billboard next to a card node.
 * – Idle state   : four corner-bracket "frame" icon  → "focus on this card"
 * – Focused state: chevron (<) icon              → "exit focus / zoom out"
 *
 * x, y are in Billboard-local space (same coordinate system as CardNode).
 */
function CardFocusButton({
  x,
  y,
  isFocused,
  onToggle,
}: {
  x: number
  y: number
  isFocused: boolean
  onToggle: () => void
}) {
  const S = FOCUS_BTN_ICON_HALF
  const ARM = S * 0.5
  const [isHovered, setIsHovered] = useState(false)
  const iconGroupRef = useRef<Group | null>(null)

  const color = isFocused
    ? (isHovered ? FOCUS_BTN_COLOR_ACTIVE_HOVER : FOCUS_BTN_COLOR_ACTIVE)
    : (isHovered ? FOCUS_BTN_COLOR_IDLE_HOVER : FOCUS_BTN_COLOR_IDLE)

  useEffect(() => {
    if (!iconGroupRef.current) return
    const scale = iconGroupRef.current.scale
    gsap.killTweensOf(scale)
    const s = isHovered ? FOCUS_BTN_HOVER_SCALE : 1
    gsap.to(scale, {
      x: s,
      y: s,
      z: s,
      duration: FOCUS_BTN_HOVER_DURATION,
      ease: 'power2.out',
    })
    return () => { gsap.killTweensOf(scale) }
  }, [isHovered])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onToggle()
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
    setIsHovered(true)
  }

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    document.body.style.cursor = 'auto'
    setIsHovered(false)
  }

  return (
    <group position={[x, y, 0.02]}>
      {/* Transparent hit area */}
      <mesh
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[FOCUS_BTN_HIT_HALF * 2, FOCUS_BTN_HIT_HALF * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={iconGroupRef}>
      {!isFocused ? (
        /* Four corner L-brackets — "frame / focus on this card" */
        <>
          <Line raycast={() => null} points={[[-S, ARM, 0], [-S, S, 0], [-ARM, S, 0]]} color={color} lineWidth={1.5} />
          <Line raycast={() => null} points={[[ ARM, S, 0], [ S, S, 0], [ S,  ARM, 0]]} color={color} lineWidth={1.5} />
          <Line raycast={() => null} points={[[-S, -ARM, 0], [-S, -S, 0], [-ARM, -S, 0]]} color={color} lineWidth={1.5} />
          <Line raycast={() => null} points={[[ ARM, -S, 0], [ S, -S, 0], [ S, -ARM, 0]]} color={color} lineWidth={1.5} />
        </>
      ) : (
        /* Chevron (<) — "exit focus / zoom out" */
        <>
          <Line raycast={() => null} points={[[S * 0.6, S * 0.9, 0], [-S * 0.6, 0, 0], [S * 0.6, -S * 0.9, 0]]} color={color} lineWidth={3} />
        </>
      )}
      </group>
    </group>
  )
}

function getCameraRelativeLabelOffset(camera: Camera, radius: number) {
  const labelLift = Math.max(0.54, radius * 1.42)
  return labelUpVector.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize().multiplyScalar(labelLift)
}

function getAbbreviatedLabel(fullLabel: string, distanceOrderIndex: number, totalNodeCount: number) {
  if (distanceOrderIndex < LABEL_ABBREVIATION_GROUP_SIZE) return fullLabel

  const fullLength = fullLabel.length
  const suffixLength = LABEL_ABBREVIATION_SUFFIX.length
  if (fullLength <= suffixLength + 1) return fullLabel

  const groupCount = Math.max(1, Math.ceil(totalNodeCount / LABEL_ABBREVIATION_GROUP_SIZE))
  const groupIndex = Math.floor(distanceOrderIndex / LABEL_ABBREVIATION_GROUP_SIZE)
  const progress = clamp(
    groupIndex / groupCount,
    0,
    1,
  )
  const visibleFraction = 1 - progress * (1 - LABEL_ABBREVIATION_MIN_VISIBLE_FRACTION)
  const prefixLength = Math.max(1, Math.floor(fullLength * visibleFraction))
  if (prefixLength >= fullLength) return fullLabel

  const abbreviated = `${fullLabel.slice(0, prefixLength)}${LABEL_ABBREVIATION_SUFFIX}`
  return abbreviated.length <= fullLength ? abbreviated : fullLabel
}

function GraphNode({
  id,
  templateKey,
  label,
  getDistanceOrderIndex,
  totalNodeCount,
  visualType,
  accentColor,
  href,
  expanding,
  expandStartAt,
  collapsing,
  collapseRole,
  collapseStartAt,
  expanded,
  position,
  spawnFrom,
  depth,
  radius,
}: GraphNodeProps) {
  const language = useGraphStore((state) => state.language)
  const cardContent = getCardNodeContent(templateKey, language)
  const isCardNode = !!cardContent && templateKey !== 'mail'
  const cardInstitutionText = cardContent?.institutionText ?? ''
  const cardSummaryText = cardContent?.summaryText ?? ''
  const cardDetailsText = cardContent?.detailsText ?? ''

  const cardDetailsCleanText = cardDetailsText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  const longestCardTextLength = Math.max(cardSummaryText.length, cardDetailsCleanText.length)

  const groupRef = useRef<Group | null>(null)
  const hoverScaleGroupRef = useRef<Group | null>(null)
  const idlePulseGroupRef = useRef<Group | null>(null)
  const labelAnchorRef = useRef<Group | null>(null)
  const meshRef = useRef<Mesh<BufferGeometry, Material | Material[]> | null>(null)
  const cardHitAreaRef = useRef<Mesh<BufferGeometry, Material | Material[]> | null>(null)
  const cardOutlineRef = useRef<Group | null>(null)
  const cardFocusOverlayRef = useRef<Mesh<BufferGeometry, Material | Material[]> | null>(null)
  const hasPlayedSpawnRef = useRef(false)
  const idleWobbleTweenRef = useRef<gsap.core.Tween | null>(null)
  const idleWobbleResetRef = useRef<gsap.core.Tween | null>(null)
  const mainExpandedRef = useRef(expanded)

  const [isWaitingToExpand, setIsWaitingToExpand] = useState(
    () => !!expanding && !!expandStartAt && Date.now() < expandStartAt,
  )
  const [isIdleWobbling, setIsIdleWobbling] = useState(false)
  const [isCardExpanded, setIsCardExpanded] = useState(false)
  const [cardDetailsProgress, setCardDetailsProgress] = useState(0)
  const [measuredSummaryBlockHeight, setMeasuredSummaryBlockHeight] = useState(0)
  const [measuredDetailsBlockHeight, setMeasuredDetailsBlockHeight] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [displayLabel, setDisplayLabel] = useState(label)
  const displayLabelRef = useRef(label)

  const { camera, gl, raycaster, size } = useThree()
  const expandNode = useGraphStore((state) => state.expandNode)
  const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId)
  const setHoveredNode = useGraphStore((state) => state.setHoveredNode)
  const focusedCardNodeId = useGraphStore((state) => state.focusedCardNodeId)
  const setFocusedCardNodeId = useGraphStore((state) => state.setFocusedCardNodeId)

  // In phone landscape mode (short viewport) allow wider cards so text wraps less and
  // the card stays shorter – fitting within the reduced viewport height.
  const effectiveCardMaxWidth = getEffectiveCardMaxWidth(size.width, size.height)
  const cardExpandedWidth = Math.min(
    cardBaseExpandedWidth + longestCardTextLength * cardCharWidthFactor,
    effectiveCardMaxWidth,
  )

  const isGithubLabel = label.toLowerCase().includes('github')
  const isMainNode = id === 'main'
  const isEmailLabel = templateKey === 'mail'
  const isPortfolioEasterEggNode = templateKey === 'project-1' && !!href
  const isExternalLinkNode = !!href && !isEmailLabel && !isGithubLabel && !isPortfolioEasterEggNode
  const isOpenCtaNode = isPortfolioEasterEggNode || isExternalLinkNode
  const isTextOnlyNode = visualType === 'text'
  const isLocationNode = templateKey === 'about-location'
  const isResearchSearchNode =
    isTextOnlyNode &&
    !isCardNode &&
    !isEmailLabel &&
    !isGithubLabel &&
    !href &&
    !isLocationNode
  const researchSearchQuery = label
  const researchSearchHref = isResearchSearchNode
    ? `https://www.google.com/search?q=${encodeURIComponent(researchSearchQuery)}`
    : undefined
  const resolvedHref = href ?? researchSearchHref
  const isExpandedSphereNode = !isTextOnlyNode && expanded
  const sphereRadius = radius ?? 0.3
  const ringOuterRadius = sphereRadius
  const ringInnerRadius = Math.max(sphereRadius * 0.58, 0.03)
  const hasSecondaryCta = isEmailLabel || isGithubLabel || isOpenCtaNode || isResearchSearchNode
  const labelIcon = isMainNode ? '' : getLabelIcon(label, templateKey)
  const isNodeHighlighted = hoveredNodeId === id
  const collapsedCtaText = getCardCollapsedCtaText(language)
  const githubCtaText = getGithubCtaText(language)
  const researchCtaText = getResearchCtaText()

  useEffect(() => {
    setDisplayLabel(label)
    displayLabelRef.current = label
  }, [label])

  useEffect(() => {
    if (!isCardExpanded) {
      setMeasuredDetailsBlockHeight(0)
    }
  }, [isCardExpanded])

  // Animate the semi-transparent overlay that appears on a focused card
  const isThisCardFocused = isCardNode && focusedCardNodeId === id

  // Clear focus when the card collapses back to its closed state
  useEffect(() => {
    if (!isCardExpanded && isThisCardFocused) {
      setFocusedCardNodeId(null)
    }
  }, [isCardExpanded, isThisCardFocused, setFocusedCardNodeId])

  useEffect(() => {
    const overlay = cardFocusOverlayRef.current
    if (!overlay) return
    const mat = overlay.material as MeshBasicMaterial
    gsap.to(mat, {
      opacity: isThisCardFocused ? 0.82 : 0,
      duration: 0.35,
      ease: 'power2.out',
    })
  }, [isThisCardFocused])

  // Clear hover state when this card becomes focused so the scale/highlight effects reset
  useEffect(() => {
    if (!isThisCardFocused) return
    setIsHovered(false)
    if (useGraphStore.getState().hoveredNodeId === id) {
      setHoveredNode(null)
    }
  }, [isThisCardFocused, id, setHoveredNode])

  const cardExpansionProgress = clamp(cardDetailsProgress, 0, 1)
  const cardSummaryFontSize = 0.11 + (0.17 - 0.11) * cardExpansionProgress
  const cardDetailsFontSize = 0.095 + (0.14 - 0.095) * cardExpansionProgress
  const summaryDetailsGap = measuredDetailsBlockHeight > 0 ? cardSummaryDetailsGap : 0
  const summaryLineHeight = cardSummaryFontSize * CARD_TEXT_LINE_HEIGHT_FACTOR
  const summaryBlockHeight = Math.max(summaryLineHeight, measuredSummaryBlockHeight)
  const detailsBlockHeight = measuredDetailsBlockHeight
  const cardExpandedHeight =
    cardTextTopPadding +
    summaryBlockHeight +
    summaryDetailsGap +
    detailsBlockHeight +
    cardTextBottomPadding

  const cardHitAreaWidth =
    cardCollapsedWidth + (cardExpandedWidth - cardCollapsedWidth) * cardExpansionProgress
  const cardHitAreaHeight =
    cardCollapsedHeight + (cardExpandedHeight - cardCollapsedHeight) * cardExpansionProgress
  const cardContentMaxWidth = cardHitAreaWidth - cardHorizontalPadding * 2
  const cardContentStartX = -cardHitAreaWidth / 2 + cardHorizontalPadding
  const collapsedTitleOffsetY = cardCenterY + cardCollapsedTitleGap
  const expandedTitleOffsetY = cardCenterY + cardExpandedHeight / 2 + cardExpandedTitleGap
  const cardTitleOffsetY =
    collapsedTitleOffsetY + (expandedTitleOffsetY - collapsedTitleOffsetY) * cardExpansionProgress

  const textHitAreaWidth = isGithubLabel
    ? 3.8
    : isOpenCtaNode
      ? 4
    : Math.max(1.2, Math.min(3.2, label.length * 0.18))
  const textHitAreaHeight = isGithubLabel
    ? 1.2
    : isOpenCtaNode
      ? 1.2
    : hasSecondaryCta
      ? 0.86
      : 0.55
  const emailHitAreaWidth = 2.9
  const emailHitAreaHeight = 0.62

  useFrame(() => {
    if (!labelAnchorRef.current) return

    const distanceOrderIndex = getDistanceOrderIndex(id)
    const nextDisplayLabel = getAbbreviatedLabel(label, distanceOrderIndex, totalNodeCount)
    if (nextDisplayLabel !== displayLabelRef.current) {
      displayLabelRef.current = nextDisplayLabel
      setDisplayLabel(nextDisplayLabel)
    }

    if (isTextOnlyNode) {
      labelAnchorRef.current.position.set(0, 0, 0)
      return
    }

    const cameraRelativeOffset = getCameraRelativeLabelOffset(camera, sphereRadius)
    labelAnchorRef.current.position.set(
      cameraRelativeOffset.x,
      cameraRelativeOffset.y,
      cameraRelativeOffset.z,
    )
  })

  const { triggerNodeAction } = useGraphNodeActions({
    id,
    href: resolvedHref,
    isCardNode,
    collapsing,
    camera,
    canvasElement: gl.domElement,
    meshRef,
    expandNode,
    setIsCardExpanded,
  })

  const {
    handleClick,
    handlePointerDown,
    handlePointerOver,
  } = useGraphNodeInteractions({
    id,
    position,
    collapsing,
    collapseRole,
    isCardNode,
    isCardExpanded,
    isCardFocused: isThisCardFocused,
    isTextOnlyNode,
    shouldFaceCamera: !isTextOnlyNode,
    dragStartThreshold: cardDragStartThreshold,
    meshRef,
    camera,
    gl,
    raycaster,
    onTriggerAction: triggerNodeAction,
  })

  useGraphNodeAnimations({
    depth,
    position,
    spawnFrom,
    expanding,
    expandStartAt,
    collapsing,
    collapseStartAt,
    expanded,
    isCardNode,
    isCardExpanded,
    cardExpandedWidth,
    cardExpandedHeight,
    cardDetailsProgress,
    groupRef,
    meshRef,
    cardHitAreaRef,
    cardOutlineRef,
    hasPlayedSpawnRef,
    setIsWaitingToExpand,
    setIsCardExpanded,
    setCardDetailsProgress,
  })

  const hoverScaleTarget = !isWaitingToExpand && (isHovered || isNodeHighlighted) ? 1.11 : 1

  useEffect(() => {
    mainExpandedRef.current = expanded

    if (expanded) {
      setIsIdleWobbling(false)
    }
  }, [expanded])

  useEffect(() => {
    if (!isMainNode) return

    const timeoutId = window.setTimeout(() => {
      if (mainExpandedRef.current) return

      setIsIdleWobbling(true)
    }, MAIN_NODE_IDLE_WOBBLE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isMainNode])

  useEffect(() => {
    if (!isMainNode || !idlePulseGroupRef.current) return

    idleWobbleTweenRef.current?.kill()
    idleWobbleTweenRef.current = null
    idleWobbleResetRef.current?.kill()
    idleWobbleResetRef.current = null

    if (!isIdleWobbling || expanded) {
      idleWobbleResetRef.current = gsap.to(idlePulseGroupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.22,
        ease: 'power2.out',
      })

      if (expanded) {
        setIsIdleWobbling(false)
      }
      return
    }

    idleWobbleTweenRef.current = gsap.to(idlePulseGroupRef.current.scale, {
      x: 1.16,
      y: 1.16,
      z: 1.16,
      duration: 0.52,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    })

    return () => {
      idleWobbleTweenRef.current?.kill()
      idleWobbleTweenRef.current = null
      idleWobbleResetRef.current?.kill()
      idleWobbleResetRef.current = null
    }
  }, [expanded, isIdleWobbling, isMainNode])

  useEffect(() => {
    if (!hoverScaleGroupRef.current) return

    gsap.to(hoverScaleGroupRef.current.scale, {
      x: hoverScaleTarget,
      y: hoverScaleTarget,
      z: hoverScaleTarget,
      duration: HOVER_SYNC_DURATION_S,
      ease: 'power2.out',
    })
  }, [hoverScaleTarget])

  useEffect(() => {
    if (!meshRef.current) return

    const targetEmissiveIntensity = isExpandedSphereNode
      ? isNodeHighlighted
        ? 2.2
        : 1.8
      : isNodeHighlighted
        ? 1.9
        : 1.5

    const materials = Array.isArray(meshRef.current.material)
      ? meshRef.current.material
      : [meshRef.current.material]

    materials.forEach((material) => {
      if (!('emissiveIntensity' in material)) return

      gsap.to(material, {
        emissiveIntensity: targetEmissiveIntensity,
        duration: HOVER_SYNC_DURATION_S,
        ease: 'power2.out',
      })
    })
  }, [isExpandedSphereNode, isNodeHighlighted])

  const handleNodePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (isThisCardFocused) return

    const handled = handlePointerOver(event)
    if (!handled) return

    setIsHovered(true)
    setHoveredNode(id)
  }

  const handleNodePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    setIsHovered(false)
    if (hoveredNodeId === id) {
      setHoveredNode(null)
    }
  }

  return (
    <group ref={groupRef} position={position}>
      <group ref={hoverScaleGroupRef}>
      <group ref={idlePulseGroupRef}>
      {!isTextOnlyNode && !isWaitingToExpand && (
        isExpandedSphereNode ? (
          <>
            <mesh
              onPointerDown={handlePointerDown}
              onPointerOver={handleNodePointerOver}
              onPointerOut={handleNodePointerOut}
              onClick={handleClick}
            >
              <sphereGeometry args={[sphereRadius, 24, 24]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <mesh
              ref={meshRef}
              onPointerDown={handlePointerDown}
              onPointerOver={handleNodePointerOver}
              onPointerOut={handleNodePointerOut}
              onClick={handleClick}
            >
              <ringGeometry args={[ringInnerRadius, ringOuterRadius, 52]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={1.8}
                metalness={0.45}
                roughness={0.25}
                side={DoubleSide}
                fog
              />
            </mesh>
          </>
        ) : (
          <mesh
            ref={meshRef}
            onPointerDown={handlePointerDown}
            onPointerOver={handleNodePointerOver}
            onPointerOut={handleNodePointerOut}
            onClick={handleClick}
          >
            <circleGeometry args={[sphereRadius, 52]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={1.5}
              metalness={0.5}
              roughness={0.2}
              side={DoubleSide}
              fog
            />
          </mesh>
        )
      )}

      {isTextOnlyNode && !isCardNode && !isWaitingToExpand && (
        <mesh
          ref={meshRef}
          onPointerDown={handlePointerDown}
          onPointerOver={handleNodePointerOver}
          onPointerOut={handleNodePointerOut}
          onClick={resolvedHref ? handleClick : undefined}
        >
          <planeGeometry args={[textHitAreaWidth, textHitAreaHeight]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {!isWaitingToExpand && (
        <group ref={labelAnchorRef}>
        <Billboard position={[0, 0, 0]}>
          {isCardNode ? (
            <>
              <mesh
                ref={(value) => {
                  meshRef.current = value
                  cardHitAreaRef.current = value
                }}
                position={[0, cardCenterY, 0.01]}
                onPointerDown={handlePointerDown}
                onPointerOver={handleNodePointerOver}
                onPointerOut={handleNodePointerOut}
                onClick={handleClick}
              >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              <CardNode
                label={displayLabel}
                labelIcon={labelIcon}
                isCardExpanded={isCardExpanded}
                cardTitleOffsetY={cardTitleOffsetY}
                cardContentStartX={cardContentStartX}
                cardContentMaxWidth={cardContentMaxWidth}
                cardSummaryFontSize={cardSummaryFontSize}
                cardDetailsFontSize={cardDetailsFontSize}
                cardHitAreaHeight={cardHitAreaHeight}
                summaryBlockHeight={summaryBlockHeight}
                summaryDetailsGap={summaryDetailsGap}
                institutionText={cardInstitutionText}
                summaryText={cardSummaryText}
                detailsText={cardDetailsText}
                cardDetailsProgress={cardDetailsProgress}
                collapsedCtaText={collapsedCtaText}
                collapsedCtaFontSize={cardCollapsedCtaFontSize}
                collapsedCtaColor={cardCollapsedCtaColor}
                cardCenterY={cardCenterY}
                collapsedWidth={cardCollapsedWidth}
                collapsedHeight={cardCollapsedHeight}
                onSummaryBlockHeightChange={setMeasuredSummaryBlockHeight}
                onDetailsBlockHeightChange={setMeasuredDetailsBlockHeight}
                outlineRef={(value) => {
                  cardOutlineRef.current = value
                }}
              />

              {/* Semi-transparent overlay that becomes visible when the card is focused */}
              <group position={[0, cardCenterY, -0.012]} scale={[cardHitAreaWidth, cardHitAreaHeight, 1]}>
                <mesh
                  ref={cardFocusOverlayRef}
                  raycast={() => null}
                >
                  <planeGeometry args={[1, 1]} />
                  <meshBasicMaterial transparent opacity={0} color="#252830" depthWrite={false} />
                </mesh>
              </group>

              {/* Focus / exit button – only visible when card is expanded */}
              {isCardExpanded && (
                <CardFocusButton
                  x={cardHitAreaWidth / 2 + FOCUS_BTN_X_OFFSET}
                  y={cardCenterY}
                  isFocused={isThisCardFocused}
                  onToggle={() => setFocusedCardNodeId(isThisCardFocused ? null : id)}
                />
              )}
            </>
          ) : isGithubLabel ? (
            <>
              <mesh
                position={[0, 0, 0.02]}
                onPointerDown={handlePointerDown}
                onPointerOver={handleNodePointerOver}
                onPointerOut={handleNodePointerOut}
                onClick={href ? handleClick : undefined}
              >
                <planeGeometry args={[textHitAreaWidth, textHitAreaHeight]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <GithubNode
                labelSvgPath={githubLabelSvgPath}
                labelOffsetX={0.3}
                labelOffsetY={0.05}
                secondaryCtaY={secondaryCtaY}
                secondaryCtaFontSize={secondaryCtaFontSize}
                secondaryCtaColor={secondaryCtaColor}
                ctaText={githubCtaText}
                collapsing={collapsing}
              />
            </>
          ) : isOpenCtaNode ? (
            <>
              <mesh
                position={[0, 0, 0.02]}
                onPointerDown={handlePointerDown}
                onPointerOver={handleNodePointerOver}
                onPointerOut={handleNodePointerOut}
                onClick={resolvedHref ? handleClick : undefined}
              >
                <planeGeometry args={[textHitAreaWidth, textHitAreaHeight]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <Text
                position={[0, 0, 0]}
                fontSize={0.34}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {formatLabelWithIcon(labelIcon, displayLabel)}
              </Text>
              <Text
                position={[0, secondaryCtaY, 0]}
                fontSize={secondaryCtaFontSize}
                color={secondaryCtaColor}
                anchorX="center"
                anchorY="middle"
              >
                {githubCtaText}
              </Text>
            </>
          ) : isEmailLabel ? (
            <>
              <mesh
                position={[0, -0.08, 0.02]}
                onPointerDown={handlePointerDown}
                onPointerOver={handleNodePointerOver}
                onPointerOut={handleNodePointerOut}
                onClick={handleClick}
              >
                <planeGeometry args={[emailHitAreaWidth, emailHitAreaHeight]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <EmailNode
                privateSvgPath={emailPrivateSvgPath}
                letterSvgPath={emailLetterSvgPath}
              />
            </>
          ) : (
            <>
              <Text
                position={[0, 0, 0]}
                fontSize={0.34}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {formatLabelWithIcon(labelIcon, displayLabel)}
              </Text>
              {isResearchSearchNode && (
                <Text
                  position={[0, secondaryCtaY, 0]}
                  fontSize={researchCtaFontSize}
                  color={secondaryCtaColor}
                  anchorX="center"
                  anchorY="middle"
                >
                  {researchCtaText}
                </Text>
              )}
            </>
          )}
        </Billboard>
        </group>
      )}
      </group>
      </group>
    </group>
  )
}

export default memo(GraphNode, areGraphNodePropsEqual)
