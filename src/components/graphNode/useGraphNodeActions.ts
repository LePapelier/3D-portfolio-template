import { useCallback } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import gsap from 'gsap'
import type { BufferGeometry, Camera, Material, Mesh } from 'three'

interface UseGraphNodeActionsArgs {
  id: string
  href?: string
  isCardNode: boolean
  collapsing: boolean
  camera: Camera
  canvasElement?: HTMLElement
  meshRef: RefObject<Mesh<BufferGeometry, Material | Material[]> | null>
  expandNode: (id: string) => void
  setIsCardExpanded: Dispatch<SetStateAction<boolean>>
}

export function useGraphNodeActions({
  id,
  href,
  isCardNode,
  collapsing,
  camera,
  canvasElement,
  meshRef,
  expandNode,
  setIsCardExpanded,
}: UseGraphNodeActionsArgs) {
  const openHref = useCallback(() => {
    if (href === 'barrel_roll') {
      if (canvasElement) {
        gsap.killTweensOf(canvasElement)
        gsap.set(canvasElement, { transformOrigin: '50% 50%' })
        gsap.fromTo(
          canvasElement,
          { rotate: 0 },
          {
            rotate: 360,
            duration: 1.2,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.set(canvasElement, { clearProps: 'transform' })
            },
          },
        )
      } else {
        gsap.to(camera.rotation, {
          z: camera.rotation.z + 2 * Math.PI,
          duration: 1.2,
          ease: 'power2.inOut',
        })
      }
      return
    }

    window.open(href, '_blank', 'noopener,noreferrer')
  }, [camera, canvasElement, href])

  const triggerNodeAction = useCallback(() => {
    if (collapsing) {
      expandNode(id)
      return
    }

    if (isCardNode) {
      setIsCardExpanded((current) => !current)
      return
    }

    if (href) {
      openHref()
      return
    }

    if (meshRef.current) {
      gsap.fromTo(
        meshRef.current.scale,
        { x: 1, y: 1, z: 1 },
        {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut',
        },
      )
    }

    expandNode(id)
  }, [collapsing, expandNode, href, id, isCardNode, meshRef, openHref, setIsCardExpanded])

  return {
    triggerNodeAction,
  }
}
