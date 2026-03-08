import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Plane, Vector2, Vector3 } from 'three'
import type { Camera, BufferGeometry, Material, Mesh, Raycaster, WebGLRenderer } from 'three'
import { useGraphStore } from '../../store/useGraphStore.ts'
import type { Vector3Tuple } from './types'

interface UseGraphNodeInteractionsArgs {
  id: string
  position: Vector3Tuple
  collapsing: boolean
  collapseRole?: 'source' | 'target'
  isCardNode: boolean
  isCardExpanded: boolean
  isCardFocused: boolean
  isTextOnlyNode: boolean
  shouldFaceCamera?: boolean
  dragStartThreshold: number
  meshRef: RefObject<Mesh<BufferGeometry, Material | Material[]> | null>
  camera: Camera
  gl: WebGLRenderer
  raycaster: Raycaster
  onTriggerAction: () => void
}

export function useGraphNodeInteractions({
  id,
  position,
  collapsing,
  collapseRole,
  isCardNode,
  isCardExpanded,
  isCardFocused,
  isTextOnlyNode,
  shouldFaceCamera = false,
  dragStartThreshold,
  meshRef,
  camera,
  gl,
  raycaster,
  onTriggerAction,
}: UseGraphNodeInteractionsArgs) {
  const startDragging = useGraphStore((state) => state.startDragging)
  const stopDragging = useGraphStore((state) => state.stopDragging)
  const moveNode = useGraphStore((state) => state.moveNode)

  const dragPlaneRef = useRef(new Plane())
  const dragOffsetRef = useRef(new Vector3())
  const dragIntersectRef = useRef(new Vector3())
  const pointerNdcRef = useRef(new Vector2())
  const didMoveRef = useRef(false)
  const suppressClickRef = useRef(false)
  const didStartDraggingRef = useRef(false)
  const isPointerDownRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const isCardFocusedRef = useRef(isCardFocused)
  isCardFocusedRef.current = isCardFocused
  const activePointerTargetRef = useRef<Element | null>(null)
  const pointerClientRef = useRef({ x: 0, y: 0 })
  const pointerStartRef = useRef({ x: 0, y: 0 })

  const isNearestIntersection = (event: ThreeEvent<PointerEvent | MouseEvent>) =>
    event.intersections[0]?.object === event.object

  useFrame(() => {
    if (!isTextOnlyNode && meshRef.current) {
      if (shouldFaceCamera) {
        meshRef.current.quaternion.copy(camera.quaternion)
      } else {
        meshRef.current.rotation.y += 0.005
      }
    }

    if (!isPointerDownRef.current || !didMoveRef.current) return

    const rect = gl.domElement.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    pointerNdcRef.current.set(
      ((pointerClientRef.current.x - rect.left) / rect.width) * 2 - 1,
      -((pointerClientRef.current.y - rect.top) / rect.height) * 2 + 1,
    )

    raycaster.setFromCamera(pointerNdcRef.current, camera)

    if (raycaster.ray.intersectPlane(dragPlaneRef.current, dragIntersectRef.current)) {
      const target = dragIntersectRef.current.clone().add(dragOffsetRef.current)
      moveNode(id, [target.x, target.y, target.z])
    }
  })

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      if (!isPointerDownRef.current) return
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return

      pointerClientRef.current = { x: event.clientX, y: event.clientY }

      if (!didMoveRef.current) {
        const deltaX = event.clientX - pointerStartRef.current.x
        const deltaY = event.clientY - pointerStartRef.current.y
        const pointerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const threshold = isCardNode ? dragStartThreshold : 5

        if (pointerDistance >= threshold) {
          if (isCardFocusedRef.current) return

          didMoveRef.current = true
          suppressClickRef.current = true

          if (!didStartDraggingRef.current) {
            startDragging(id)
            didStartDraggingRef.current = true
            document.body.style.cursor = 'grabbing'
          }
        }
      }
    }

    const finishDrag = () => {
      if (!isPointerDownRef.current) return

      isPointerDownRef.current = false
      if (activePointerIdRef.current !== null && activePointerTargetRef.current?.hasPointerCapture(activePointerIdRef.current)) {
        activePointerTargetRef.current.releasePointerCapture(activePointerIdRef.current)
      }

      activePointerTargetRef.current = null
      activePointerIdRef.current = null

      if (didStartDraggingRef.current) {
        stopDragging()
        document.body.style.cursor = 'auto'
      }

      didStartDraggingRef.current = false

      if (!didMoveRef.current) {
        suppressClickRef.current = true
        if (!isCardFocusedRef.current) {
          onTriggerAction()
        }
      }
    }

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return
      finishDrag()
    }

    const handleWindowPointerCancel = () => {
      finishDrag()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerCancel)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerCancel)
    }
  }, [dragStartThreshold, id, isCardNode, onTriggerAction, startDragging, stopDragging])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isNearestIntersection(event)) return

    event.stopPropagation()

    if (collapsing && collapseRole !== 'source') return

    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (isCardFocusedRef.current) return

    onTriggerAction()
  }

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!isNearestIntersection(event)) return

    event.stopPropagation()

    if (id === 'main') {
      didMoveRef.current = false
      return
    }

    const target = event.nativeEvent.target as Element
    target.setPointerCapture(event.pointerId)

    activePointerTargetRef.current = target
    didStartDraggingRef.current = false
    isPointerDownRef.current = true
    activePointerIdRef.current = event.pointerId
    didMoveRef.current = false
    document.body.style.cursor = 'pointer'

    pointerStartRef.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    }
    pointerClientRef.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    }

    const nodePosition = new Vector3(position[0], position[1], position[2])
    const normal = event.camera.getWorldDirection(new Vector3()).normalize()
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, nodePosition)

    event.ray.intersectPlane(dragPlaneRef.current, dragIntersectRef.current)
    dragOffsetRef.current.copy(nodePosition).sub(dragIntersectRef.current)
  }

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!isNearestIntersection(event)) return false

    event.stopPropagation()

    if (collapsing && collapseRole !== 'source') return false

    if (isPointerDownRef.current && didStartDraggingRef.current) {
      document.body.style.cursor = 'grabbing'
      return
    }

    if (isCardNode && isCardExpanded) {
      document.body.style.cursor = 'grab'
      return true
    }

    document.body.style.cursor = 'pointer'
    return true
  }

  return {
    handleClick,
    handlePointerDown,
    handlePointerOver,
  }
}
