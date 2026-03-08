import { useEffect, useLayoutEffect } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import gsap from 'gsap'
import type { BufferGeometry, Group, Material, Mesh } from 'three'
import {
  cardCollapsedHeight,
  cardCollapsedWidth,
} from './constants'
import type { Vector3Tuple } from './types'

interface UseGraphNodeAnimationsArgs {
  depth: number
  position: Vector3Tuple
  spawnFrom: Vector3Tuple
  expanding: boolean
  expandStartAt?: number
  collapsing: boolean
  collapseStartAt?: number
  expanded: boolean
  isCardNode: boolean
  isCardExpanded: boolean
  cardExpandedWidth: number
  cardExpandedHeight: number
  cardDetailsProgress: number
  groupRef: RefObject<Group | null>
  meshRef: RefObject<Mesh<BufferGeometry, Material | Material[]> | null>
  cardHitAreaRef: RefObject<Mesh<BufferGeometry, Material | Material[]> | null>
  cardOutlineRef: RefObject<Group | null>
  hasPlayedSpawnRef: RefObject<boolean>
  setIsWaitingToExpand: Dispatch<SetStateAction<boolean>>
  setIsCardExpanded: Dispatch<SetStateAction<boolean>>
  setCardDetailsProgress: Dispatch<SetStateAction<number>>
}

export function useGraphNodeAnimations({
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
}: UseGraphNodeAnimationsArgs) {
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
  }, [expandStartAt, expanding, setIsWaitingToExpand])

  useLayoutEffect(() => {
    if (!groupRef.current) return
    if (hasPlayedSpawnRef.current) return

    hasPlayedSpawnRef.current = true

    groupRef.current.position.set(position[0], position[1], position[2])
    meshRef.current?.scale.set(0.01, 0.01, 0.01)

    const spawnDistance = Math.hypot(
      position[0] - spawnFrom[0],
      position[1] - spawnFrom[1],
      position[2] - spawnFrom[2],
    )

    if (!meshRef.current) return

    const now = Date.now()
    const waveDelay = Math.max(0, ((expandStartAt ?? now) - now) / 1000)

    gsap.to(meshRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.65,
      ease: 'back.out(1.7)',
      delay: expanding
        ? waveDelay
        : Math.min(depth * 0.04 + spawnDistance * 0.01, 0.25),
    })
  }, [depth, expandStartAt, expanding, groupRef, hasPlayedSpawnRef, meshRef, position, spawnFrom])

  useEffect(() => {
    if (collapsing) {
      setIsCardExpanded(false)
    }
  }, [collapsing, setIsCardExpanded])

  useEffect(() => {
    if (!isCardNode) return
    const detailsProgress = { value: cardDetailsProgress }
    gsap.to(detailsProgress, {
      value: isCardExpanded ? 1 : 0,
      duration: 0.36,
      ease: 'power2.out',
      onUpdate: () => {
        setCardDetailsProgress(detailsProgress.value)
      },
    })

    return () => {
      gsap.killTweensOf(detailsProgress)
    }
  }, [cardDetailsProgress, isCardExpanded, isCardNode, setCardDetailsProgress])

  useEffect(() => {
    if (!isCardNode) return

    const expansionProgress = Math.max(0, Math.min(1, cardDetailsProgress))
    const currentWidth =
      cardCollapsedWidth + (cardExpandedWidth - cardCollapsedWidth) * expansionProgress
    const currentHeight =
      cardCollapsedHeight + (cardExpandedHeight - cardCollapsedHeight) * expansionProgress

    const scaleTargets = [cardHitAreaRef.current, cardOutlineRef.current].filter(Boolean)
    scaleTargets.forEach((target) => {
      ;(target as Mesh | Group).scale.set(currentWidth, currentHeight, 1)
    })
  }, [
    cardDetailsProgress,
    cardExpandedHeight,
    cardExpandedWidth,
    cardHitAreaRef,
    cardOutlineRef,
    isCardNode,
  ])

  useEffect(() => {
    if (!groupRef.current) return

    gsap.killTweensOf(groupRef.current.scale)

    if (collapsing && !expanded) {
      const now = Date.now()
      const delay = Math.max(0, ((collapseStartAt ?? now) - now) / 1000)

      if (isCardNode) {
        // Two-phase squish for card nodes:
        // Phase 1: collapse height (y) — card becomes a thin horizontal strip
        gsap.to(groupRef.current.scale, {
          y: 0.001,
          duration: 0.22,
          delay,
          ease: 'power2.in',
          onComplete: () => {
            if (!groupRef.current) return
            // Phase 2: collapse width (x) — strip shrinks to nothing
            gsap.to(groupRef.current.scale, {
              x: 0.001,
              z: 0.001,
              duration: 0.16,
              ease: 'power2.in',
            })
          },
        })
      } else {
        gsap.to(groupRef.current.scale, {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.36,
          delay,
          ease: 'power2.in',
        })
      }
      return
    }

    gsap.to(groupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.22,
      ease: 'power2.out',
    })
  }, [collapseStartAt, collapsing, expanded, groupRef, isCardNode])
}
