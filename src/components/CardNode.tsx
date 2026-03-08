import { Text, Line } from '@react-three/drei'
import { memo, useEffect, useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'
import { formatLabelWithIcon } from './graphNode/utils'
import { cardLinkColor, cardLinkHitPadding, cardTextTopPadding } from './graphNode/constants'

interface CardNodeProps {
  label: string
  labelIcon: string
  isCardExpanded: boolean
  cardTitleOffsetY: number
  cardContentStartX: number
  cardContentMaxWidth: number
  cardSummaryFontSize: number
  cardDetailsFontSize: number
  cardHitAreaHeight: number
  summaryBlockHeight: number
  summaryDetailsGap: number
  institutionText: string
  summaryText: string
  detailsText: string
  cardDetailsProgress: number
  collapsedCtaText: string
  collapsedCtaFontSize: number
  collapsedCtaColor: string
  cardCenterY: number
  collapsedWidth: number
  collapsedHeight: number
  outlineRef?: (value: Group | null) => void
  onSummaryBlockHeightChange?: (value: number) => void
  onDetailsBlockHeightChange?: (value: number) => void
}

type Hand = 'left' | 'right'

const HOME_BY_HAND: Record<Hand, [number, number]> = {
  left: [3.25, 1],
  right: [6.75, 1],
}

const BASE_KEY_DELAY_MS = 8
const DISTANCE_DELAY_FACTOR_MS = 6
const PRESS_OVERHEAD_MS = 5
const MIN_VISIBLE_STEP_MS = 6
const SPACE_DELAY_MS = 7
const UNKNOWN_CHAR_DELAY_MS = 10
const KEYBOARD_MID_X = 5
const keyboardRows = [
  { keys: '`1234567890-=', y: 0, xOffset: 0 },
  { keys: 'qwertyuiop[]\\', y: 1, xOffset: 0.35 },
  { keys: "asdfghjkl;'", y: 2, xOffset: 0.55 },
  { keys: 'zxcvbnm,./', y: 3, xOffset: 0.95 },
]

const KEY_POSITION_BY_CHAR = (() => {
  const map = new Map<string, [number, number]>()

  keyboardRows.forEach((row) => {
    Array.from(row.keys).forEach((key, index) => {
      map.set(key, [row.xOffset + index, row.y])
      map.set(key.toUpperCase(), [row.xOffset + index, row.y])
    })
  })

  return map
})()

function distance(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function pickHand(char: string, keyPos?: [number, number]): Hand {
  if (keyPos) return keyPos[0] <= KEYBOARD_MID_X ? 'left' : 'right'
  if (char === ' ') return 'left'
  return 'right'
}

function buildRevealSchedule(text: string) {
  if (!text.length) return []

  const handReadyAt: Record<Hand, number> = { left: 0, right: 0 }
  const handCursor: Record<Hand, [number, number]> = {
    left: HOME_BY_HAND.left,
    right: HOME_BY_HAND.right,
  }

  let previousRevealAt = 0
  const revealAt: number[] = []

  Array.from(text).forEach((char, index) => {
    const keyPos = KEY_POSITION_BY_CHAR.get(char)
    const hand = pickHand(char, keyPos)

    let movementDelay = UNKNOWN_CHAR_DELAY_MS
    if (char === ' ') {
      movementDelay = SPACE_DELAY_MS
    } else if (keyPos) {
      const travel = distance(handCursor[hand], keyPos)
      movementDelay = BASE_KEY_DELAY_MS + travel * DISTANCE_DELAY_FACTOR_MS
    }

    const readyAt = handReadyAt[hand] + movementDelay
    const revealTime = Math.max(previousRevealAt + MIN_VISIBLE_STEP_MS, readyAt)

    revealAt[index] = revealTime
    previousRevealAt = revealTime
    handReadyAt[hand] = revealTime + PRESS_OVERHEAD_MS

    if (keyPos) {
      handCursor[hand] = keyPos
    }
  })

  return revealAt
}

function useTypewriterText(text: string, active: boolean) {
  const [displayedText, setDisplayedText] = useState('')
  const revealSchedule = useMemo(() => buildRevealSchedule(text), [text])

  useEffect(() => {
    if (!active) {
      setDisplayedText('')
      return
    }

    if (!text.length) {
      setDisplayedText('')
      return
    }

    setDisplayedText('')
    const graphemes = Array.from(text)
    const startAt = performance.now()
    let frameId = 0

    const tick = () => {
      const elapsed = performance.now() - startAt
      let visibleCount = 0

      while (visibleCount < revealSchedule.length && revealSchedule[visibleCount] <= elapsed) {
        visibleCount += 1
      }

      setDisplayedText(graphemes.slice(0, visibleCount).join(''))

      if (visibleCount < graphemes.length) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [active, revealSchedule, text])

  return displayedText
}

interface TextRenderInfoLike {
  textRenderInfo?: {
    blockBounds?: number[]
    caretPositions?: Float32Array
  }
}

function getRenderedBlockHeight(mesh: TextRenderInfoLike | null | undefined) {
  const bounds = mesh?.textRenderInfo?.blockBounds
  if (!Array.isArray(bounds) || bounds.length < 4) return 0

  const minY = Number(bounds[1])
  const maxY = Number(bounds[3])
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return 0

  return Math.max(0, maxY - minY)
}

// Inline link parsed from [text](url) markup in detailsText
interface InlineLink {
  text: string
  url: string
  startIndex: number
  endIndex: number // exclusive
}

interface ParsedDetailsText {
  cleanText: string
  links: InlineLink[]
}

function parseDetailsText(rawText: string): ParsedDetailsText {
  const links: InlineLink[] = []
  let offset = 0

  for (const match of rawText.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const [fullMatch, linkText, url] = match
    if (match.index == null || linkText == null || url == null) continue
    const startInClean = match.index - offset
    links.push({
      text: linkText,
      url,
      startIndex: startInClean,
      endIndex: startInClean + linkText.length,
    })
    offset += fullMatch.length - linkText.length
  }

  const cleanText = rawText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
  return { cleanText, links }
}

// Bounds of an inline link computed from troika caretPositions
interface LinkBounds {
  x: number
  y: number
  width: number
}

interface InlineLinkOverlayProps {
  link: InlineLink
  bounds: LinkBounds
  isCardExpanded: boolean
  cardDetailsProgress: number
  fontSize: number
}

/**
 * Renders a blue text overlay and invisible hit area for an inline link within the
 * details text block. Positioned using glyph bounds derived from troika caretPositions.
 * Hover underline and click-to-open are only active when the card is fully expanded.
 */
const InlineLinkOverlay = memo(({ link, bounds, isCardExpanded, cardDetailsProgress, fontSize }: InlineLinkOverlayProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const hitWidth = bounds.width + cardLinkHitPadding
  const hitHeight = fontSize * 1.6
  const underlineY = -fontSize * 0.55

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isCardExpanded) return
    event.stopPropagation()
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handlePointerOver = (_event: ThreeEvent<PointerEvent>) => {
    if (!isCardExpanded) return
    document.body.style.cursor = 'pointer'
    setIsHovered(true)
  }

  const handlePointerOut = (_event: ThreeEvent<PointerEvent>) => {
    document.body.style.cursor = 'auto'
    setIsHovered(false)
  }

  return (
    <group position={[bounds.x, bounds.y, 0.008]}>
      {isCardExpanded && (
        <mesh
          position={[bounds.width / 2, 0, 0]}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[hitWidth, hitHeight]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Text
        raycast={() => null}
        position={[0, 0, 0]}
        anchorX="left"
        anchorY="middle"
        fontSize={fontSize}
        color={cardLinkColor}
        fillOpacity={cardDetailsProgress}
      >
        {link.text}
      </Text>
      <Line
        raycast={() => null}
        points={[[0, underlineY, 0], [bounds.width, underlineY, 0]]}
        color={cardLinkColor}
        lineWidth={0.8}
        transparent
        opacity={isHovered && isCardExpanded ? cardDetailsProgress : 0}
      />
    </group>
  )
})
InlineLinkOverlay.displayName = 'InlineLinkOverlay'

const CardNode = memo((props: CardNodeProps) => {
  const {
    label,
    labelIcon,
    isCardExpanded,
    cardTitleOffsetY,
    cardContentStartX,
    cardContentMaxWidth,
    cardSummaryFontSize,
    cardDetailsFontSize,
    cardHitAreaHeight,
    summaryBlockHeight,
    summaryDetailsGap,
    institutionText,
    summaryText,
    detailsText,
    cardDetailsProgress,
    collapsedCtaText,
    collapsedCtaFontSize,
    collapsedCtaColor,
    cardCenterY,
    collapsedWidth,
    collapsedHeight,
    outlineRef,
    onSummaryBlockHeightChange,
    onDetailsBlockHeightChange,
  } = props

  const parsedDetails = useMemo(() => parseDetailsText(detailsText), [detailsText])
  const { cleanText, links: parsedLinks } = parsedDetails

  const [linkBounds, setLinkBounds] = useState<Array<LinkBounds | null>>(
    () => parsedLinks.map(() => null),
  )

  useEffect(() => {
    setLinkBounds(parsedLinks.map(() => null))
  }, [parsedLinks])
  const typedDetailsText = useTypewriterText(cleanText, isCardExpanded)
  const summaryY = cardHitAreaHeight / 2 - cardTextTopPadding
  const detailsY = summaryY - summaryBlockHeight - summaryDetailsGap

  useEffect(() => {
    onDetailsBlockHeightChange?.(0)
  }, [onDetailsBlockHeightChange])

  // Animated X offset for the details text block (matches the <Text> position animation)
  const detailsTextOffsetX = cardContentStartX + (1 - cardDetailsProgress) * -0.12

  return (
    <>
      <Text
        raycast={() => null}
        position={[0, cardTitleOffsetY, 0]}
        fontSize={0.34}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {formatLabelWithIcon(labelIcon, label)}
      </Text>

      {!!institutionText && (
        <Text
          raycast={() => null}
          position={[0, cardTitleOffsetY + 0.28, 0]}
          fontSize={0.14}
          color="#aeb8c7"
          anchorX="center"
          anchorY="middle"
          fillOpacity={cardDetailsProgress}
        >
          {institutionText}
        </Text>
      )}

      <group position={[0, cardCenterY, 0]} scale={[1, 1, 1]}>
        <group
          ref={outlineRef}
          position={[0, 0, -0.004]}
          scale={[collapsedWidth, collapsedHeight, 1]}
        >
          <Line
            raycast={() => null}
            points={[
              [-0.5, -0.5, 0],
              [0.5, -0.5, 0],
              [0.5, 0.5, 0],
              [-0.5, 0.5, 0],
              [-0.5, -0.5, 0],
            ]}
            color="#ffffff"
            lineWidth={1.2}
            transparent
            opacity={cardDetailsProgress * 0.82}
          />
        </group>

        <Text
          raycast={() => null}
          position={[cardContentStartX, summaryY, 0.004]}
          anchorX="left"
          anchorY="top"
          fontSize={cardSummaryFontSize}
          color="#cfd8e3"
          maxWidth={cardContentMaxWidth}
          fillOpacity={cardDetailsProgress}
          onSync={(mesh) => {
            onSummaryBlockHeightChange?.(getRenderedBlockHeight(mesh))
          }}
        >
          {summaryText}
        </Text>

        {/* Details text group: shared origin for text and inline link overlays */}
        <group position={[detailsTextOffsetX, detailsY, 0.004]}>
          <Text
            raycast={() => null}
            position={[0, 0, 0]}
            anchorX="left"
            anchorY="top"
            fontSize={cardDetailsFontSize}
            color="#dbe2ea"
            maxWidth={cardContentMaxWidth}
            fillOpacity={cardDetailsProgress}
            onSync={(mesh) => {
              const h = getRenderedBlockHeight(mesh)
              onDetailsBlockHeightChange?.(h)

              if (parsedLinks.length === 0) return
              const caretPositions = (mesh as TextRenderInfoLike)?.textRenderInfo?.caretPositions

              // Text is empty (card collapsed/not yet typed) — reset bounds so they
              // recompute correctly on the next expand
              if (!caretPositions || caretPositions.length === 0) {
                setLinkBounds(prev => prev.every(b => b === null) ? prev : parsedLinks.map(() => null))
                return
              }

              setLinkBounds(prev => {
                let changed = false
                const next = prev.map((existing, idx) => {
                  if (existing !== null) return existing
                  const link = parsedLinks[idx]
                  if (caretPositions.length < link.endIndex * 4) return null
                  changed = true
                  const startX = caretPositions[link.startIndex * 4]
                  const endX = caretPositions[(link.endIndex - 1) * 4 + 1]
                  const bottomY = caretPositions[link.startIndex * 4 + 2]
                  const topY = caretPositions[link.startIndex * 4 + 3]
                  return { x: startX, y: (bottomY + topY) / 2, width: endX - startX }
                })
                return changed ? next : prev
              })
            }}
          >
            {typedDetailsText}
          </Text>

          {parsedLinks.map((link, idx) => {
            const bounds = linkBounds[idx]
            if (!bounds) return null
            return (
              <InlineLinkOverlay
                key={link.url}
                link={link}
                bounds={bounds}
                isCardExpanded={isCardExpanded}
                cardDetailsProgress={cardDetailsProgress}
                fontSize={cardDetailsFontSize}
              />
            )
          })}
        </group>

        <Text
          raycast={() => null}
          position={[0, 0, 0.004]}
          anchorX="center"
          anchorY="middle"
          fontSize={collapsedCtaFontSize}
          color={collapsedCtaColor}
          fillOpacity={1 - cardDetailsProgress}
        >
          {collapsedCtaText}
        </Text>
      </group>
    </>
  )
})

export default CardNode
