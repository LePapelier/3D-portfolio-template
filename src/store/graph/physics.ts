import type { GraphState, Node } from './types'
import { symmetricEdges } from './config'

const MIN_DT = 0.001
const MAX_DT = 0.033
const REPULSION = 50
const SPRING_STRENGTH = 20
const REST_LENGTH = 3.6
const DAMPING = 0.9
const REPULSION_MAX_DISTANCE = 8
const REPULSION_MAX_DISTANCE_SQ = REPULSION_MAX_DISTANCE * REPULSION_MAX_DISTANCE
const DYNAMIC_REPULSION_MAX_DISTANCE = 6.2
const DYNAMIC_REPULSION_MAX_DISTANCE_SQ =
  DYNAMIC_REPULSION_MAX_DISTANCE * DYNAMIC_REPULSION_MAX_DISTANCE
const DYNAMIC_REPULSION_SCALE = 0.82
const DYNAMIC_SPRING_SCALE = 0.88
const DYNAMIC_GRAPH_NODE_THRESHOLD = 70
const VECTOR_EPSILON = 0.0001
const MIN_DISTANCE_SQ = 0.08
const MIN_SPRING_DISTANCE = 0.001
const BASE_NODE_MASS = 1
const NODE_MASS_SCALE = 3
const SPRING_MASS_ATTENUATION_EXPONENT = 1.25

function isFrozenExpanding(node: Node, nowMs: number) {
  return !!node.expanding && !!node.expandStartAt && nowMs < node.expandStartAt
}

function isSameVector(a: [number, number, number], b: [number, number, number]) {
  return (
    Math.abs(a[0] - b[0]) < VECTOR_EPSILON &&
    Math.abs(a[1] - b[1]) < VECTOR_EPSILON &&
    Math.abs(a[2] - b[2]) < VECTOR_EPSILON
  )
}

function toCellKey(x: number, y: number, z: number) {
  return `${x}|${y}|${z}`
}

function getNodeMass(node: Node) {
  const radius = node.radius ?? 0.5
  return BASE_NODE_MASS + radius * radius * radius * NODE_MASS_SCALE
}

export function tickPhysicsReducer(
  state: GraphState,
  delta: number,
): GraphState | Partial<GraphState> {
  if (state.nodes.length <= 1) {
    return state
  }

  const dt = Math.min(Math.max(delta, MIN_DT), MAX_DT)
  const nowMs = Date.now()
  const draggedNodeId = state.draggedNodeId
  const hasExpandingOrCollapsingNodes = state.nodes.some((node) => node.expanding || node.collapsing)
  const dynamicLoadShedding =
    state.nodes.length >= DYNAMIC_GRAPH_NODE_THRESHOLD &&
    (!!draggedNodeId || hasExpandingOrCollapsingNodes)
  const repulsionDistanceSq = dynamicLoadShedding
    ? DYNAMIC_REPULSION_MAX_DISTANCE_SQ
    : REPULSION_MAX_DISTANCE_SQ
  const repulsionStrengthScale = dynamicLoadShedding ? DYNAMIC_REPULSION_SCALE : 1
  const springStrengthScale = dynamicLoadShedding ? DYNAMIC_SPRING_SCALE : 1

  const nodes = state.nodes.map((node) => ({
    ...node,
    position: [...node.position] as [number, number, number],
    velocity: [...node.velocity] as [number, number, number],
  }))
  const idIndex = new Map(nodes.map((node, index) => [node.id, index]))
  const templateKeyIndex = new Map(
    nodes.map((node, index) => [node.templateKey, index]),
  )

  const forces: Array<[number, number, number]> = nodes.map(() => [0, 0, 0])
  const nodeMassByIndex = nodes.map((node) => getNodeMass(node))
  const invMassByIndex = nodeMassByIndex.map((mass) => 1 / mass)
  const invMassSpringByIndex = nodeMassByIndex.map(
    (mass) => 1 / Math.pow(mass, SPRING_MASS_ATTENUATION_EXPONENT),
  )

  const cellSize = REPULSION_MAX_DISTANCE
  const activeCellByIndex = new Map<number, [number, number, number]>()
  const grid = new Map<string, number[]>()

  for (let index = 0; index < nodes.length; index++) {
    if (isFrozenExpanding(nodes[index], nowMs)) continue

    const node = nodes[index]
    const cellX = Math.floor(node.position[0] / cellSize)
    const cellY = Math.floor(node.position[1] / cellSize)
    const cellZ = Math.floor(node.position[2] / cellSize)
    const key = toCellKey(cellX, cellY, cellZ)
    const bucket = grid.get(key)

    if (bucket) {
      bucket.push(index)
    } else {
      grid.set(key, [index])
    }

    activeCellByIndex.set(index, [cellX, cellY, cellZ])
  }

  for (let i = 0; i < nodes.length; i++) {
    const nodeCell = activeCellByIndex.get(i)
    if (!nodeCell) continue

    const a = nodes[i]
    const [cellX, cellY, cellZ] = nodeCell

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
          const neighborKey = toCellKey(cellX + offsetX, cellY + offsetY, cellZ + offsetZ)
          const bucket = grid.get(neighborKey)
          if (!bucket) continue

          for (let bIndex = 0; bIndex < bucket.length; bIndex++) {
            const j = bucket[bIndex]
            if (j <= i) continue

            const b = nodes[j]
            const dx = b.position[0] - a.position[0]
            const dy = b.position[1] - a.position[1]
            const dz = b.position[2] - a.position[2]
            const distSq = Math.max(dx * dx + dy * dy + dz * dz, MIN_DISTANCE_SQ)
            if (distSq > repulsionDistanceSq) continue

            const dist = Math.sqrt(distSq)
            const invDist = 1 / dist
            const falloff = 1 - distSq / repulsionDistanceSq
            const emitterScaleA = a.radius ?? 1
            const emitterScaleB = b.radius ?? 1

            const strengthOnA =
              (REPULSION * repulsionStrengthScale * emitterScaleB / distSq) *
              falloff *
              falloff
            const strengthOnB =
              (REPULSION * repulsionStrengthScale * emitterScaleA / distSq) *
              falloff *
              falloff

            const fxOnA = dx * invDist * strengthOnA
            const fyOnA = dy * invDist * strengthOnA
            const fzOnA = dz * invDist * strengthOnA

            const fxOnB = dx * invDist * strengthOnB
            const fyOnB = dy * invDist * strengthOnB
            const fzOnB = dz * invDist * strengthOnB

            const invMassI = invMassByIndex[i]
            forces[i][0] -= fxOnA * invMassI
            forces[i][1] -= fyOnA * invMassI
            forces[i][2] -= fzOnA * invMassI

            const invMassJ = invMassByIndex[j]
            forces[j][0] += fxOnB * invMassJ
            forces[j][1] += fyOnB * invMassJ
            forces[j][2] += fzOnB * invMassJ
          }
        }
      }
    }
  }

  nodes.forEach((node, index) => {
    if (isFrozenExpanding(node, nowMs)) return
    if (!node.childrenIds?.length) return

    node.childrenIds.forEach((childId) => {
      const childIndex = idIndex.get(childId)
      if (childIndex == null) return
      if (isFrozenExpanding(nodes[childIndex], nowMs)) return

      const child = nodes[childIndex]
      const dx = child.position[0] - node.position[0]
      const dy = child.position[1] - node.position[1]
      const dz = child.position[2] - node.position[2]
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), MIN_SPRING_DISTANCE)
      const stretch = distance - REST_LENGTH
      const springForce = stretch * SPRING_STRENGTH * springStrengthScale

      const fx = (dx / distance) * springForce
      const fy = (dy / distance) * springForce
      const fz = (dz / distance) * springForce

      const invMassParent = invMassSpringByIndex[index]
      forces[index][0] += fx * invMassParent
      forces[index][1] += fy * invMassParent
      forces[index][2] += fz * invMassParent

      const invMassChild = invMassSpringByIndex[childIndex]
      forces[childIndex][0] -= fx * invMassChild
      forces[childIndex][1] -= fy * invMassChild
      forces[childIndex][2] -= fz * invMassChild
    })
  })

  symmetricEdges.forEach(([fromKey, toKey]) => {
    const fromIndex = templateKeyIndex.get(fromKey)
    const toIndex = templateKeyIndex.get(toKey)
    if (fromIndex == null || toIndex == null) return
    if (fromIndex === toIndex) return

    const fromNode = nodes[fromIndex]
    const toNode = nodes[toIndex]
    if (isFrozenExpanding(fromNode, nowMs) || isFrozenExpanding(toNode, nowMs)) return

    const dx = toNode.position[0] - fromNode.position[0]
    const dy = toNode.position[1] - fromNode.position[1]
    const dz = toNode.position[2] - fromNode.position[2]
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), MIN_SPRING_DISTANCE)
    const stretch = distance - REST_LENGTH
    const springForce = stretch * SPRING_STRENGTH * springStrengthScale

    const fx = (dx / distance) * springForce
    const fy = (dy / distance) * springForce
    const fz = (dz / distance) * springForce

    const invMassFrom = invMassSpringByIndex[fromIndex]
    forces[fromIndex][0] += fx * invMassFrom
    forces[fromIndex][1] += fy * invMassFrom
    forces[fromIndex][2] += fz * invMassFrom

    const invMassTo = invMassSpringByIndex[toIndex]
    forces[toIndex][0] -= fx * invMassTo
    forces[toIndex][1] -= fy * invMassTo
    forces[toIndex][2] -= fz * invMassTo
  })

  let hasStateChanged = false

  const updated = nodes.map((node, index) => {
    let nextNode: Node

    if (isFrozenExpanding(node, nowMs)) {
      nextNode = {
        ...node,
        velocity: [0, 0, 0] as [number, number, number],
        position: [...node.spawnFrom] as [number, number, number],
      }
    } else if (node.collapseRole === 'target') {
      if (node.collapseStartAt && nowMs < node.collapseStartAt) {
        nextNode = {
          ...node,
          velocity: [0, 0, 0] as [number, number, number],
          position: [...node.position] as [number, number, number],
        }
      } else {
        const parentIndex = node.parentId ? idIndex.get(node.parentId) : undefined
        const parentNode = parentIndex != null ? nodes[parentIndex] : undefined
        const target = parentNode?.position ?? node.position
        const retractSpeed = Math.min(1, dt * 10)
        const nextPosition: [number, number, number] = [
          node.position[0] + (target[0] - node.position[0]) * retractSpeed,
          node.position[1] + (target[1] - node.position[1]) * retractSpeed,
          node.position[2] + (target[2] - node.position[2]) * retractSpeed,
        ]

        nextNode = {
          ...node,
          velocity: [0, 0, 0] as [number, number, number],
          position: nextPosition,
        }
      }
    } else {
      const vx = (node.velocity[0] + forces[index][0] * dt) * DAMPING
      const vy = (node.velocity[1] + forces[index][1] * dt) * DAMPING
      const vz = (node.velocity[2] + forces[index][2] * dt) * DAMPING

      const nextVelocity: [number, number, number] = [
        vx,
        vy,
        vz,
      ]

      const nextPosition: [number, number, number] = [
        node.position[0] + nextVelocity[0] * dt,
        node.position[1] + nextVelocity[1] * dt,
        node.position[2] + nextVelocity[2] * dt,
      ]

      nextNode = {
        ...node,
        velocity: nextVelocity,
        position: nextPosition,
      }
    }

    const source = state.nodes[index]
    if (
      !isSameVector(nextNode.position, source.position) ||
      !isSameVector(nextNode.velocity, source.velocity) ||
      nextNode.expanding !== source.expanding ||
      nextNode.expandStartAt !== source.expandStartAt ||
      nextNode.expandTo !== source.expandTo
    ) {
      hasStateChanged = true
    }

    return nextNode
  })

  const updatedById = new Map(updated.map((node) => [node.id, node]))

  if (draggedNodeId) {
    const sourceIndex = idIndex.get(draggedNodeId)
    const sourceNode = sourceIndex != null ? state.nodes[sourceIndex] : undefined
    const draggedNode = updatedById.get(draggedNodeId)
    if (sourceNode && draggedNode) {
      if (!isSameVector(draggedNode.position, sourceNode.position) || !isSameVector(draggedNode.velocity, [0, 0, 0])) {
        hasStateChanged = true
      }
      draggedNode.position = [...sourceNode.position]
      draggedNode.velocity = [0, 0, 0]
    }
  }

  const root = updatedById.get('main')
  if (root && draggedNodeId !== 'main') {
    if (!isSameVector(root.position, [0, 0, 0]) || !isSameVector(root.velocity, [0, 0, 0])) {
      hasStateChanged = true
    }
    root.position = [0, 0, 0]
    root.velocity = [0, 0, 0]
  }

  if (!hasStateChanged) {
    return state
  }

  return { nodes: updated }
}
