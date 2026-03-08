import {
  collapseDurationMs,
  expandWaveStepMs,
  getNodeLabel,
  getPortfolioStructure,
  getNodeVisualType,
} from './config'
import type { GraphState, Node } from './types'

type GraphSet = (updater: (state: GraphState) => GraphState | Partial<GraphState>) => void

const BASE_EXPAND_RADIUS = 2.8
const DEPTH_EXPAND_RADIUS_STEP = 1.1
const CHILD_DEPTH_STEP = 1
const SPAWN_JITTER = 0.24
const SPAWN_JITTER_Z_FACTOR = 0.7
const Z_RANDOM_SPREAD = 1.2
const EXPAND_STATE_DURATION_MS = 520

function shuffleWaveSlots(size: number) {
  const waveSlots = Array.from({ length: size }, (_, slot) => slot)

  for (let index = waveSlots.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const tmp = waveSlots[index]
    waveSlots[index] = waveSlots[randomIndex]
    waveSlots[randomIndex] = tmp
  }

  return waveSlots
}

function createSpawnOrigin(position: [number, number, number]): [number, number, number] {
  return [
    position[0] + (Math.random() - 0.5) * SPAWN_JITTER,
    position[1] + (Math.random() - 0.5) * SPAWN_JITTER,
    position[2] + (Math.random() - 0.5) * SPAWN_JITTER * SPAWN_JITTER_Z_FACTOR,
  ]
}

function collectSubtreeIds(nodesById: Map<string, Node>, rootNodeId: string) {
  const ids = new Set<string>()

  const visit = (nodeId: string) => {
    const node = nodesById.get(nodeId)
    if (!node?.childrenIds?.length) return

    node.childrenIds.forEach((childId) => {
      if (ids.has(childId)) return
      ids.add(childId)
      visit(childId)
    })
  }

  visit(rootNodeId)
  return ids
}

function isRootCollapsing(nodes: Node[], rootId: string) {
  return !!nodes.find((node) => node.id === rootId)?.collapsing
}

export function expandNodeReducer(
  state: GraphState,
  id: string,
  set: GraphSet,
): GraphState | Partial<GraphState> {
  const parent = state.nodes.find((node) => node.id === id)
  if (!parent) {
    return state
  }

  if (parent.collapsing && parent.collapseRole === 'source') {
    const nodesById = new Map(state.nodes.map((node) => [node.id, node]))
    const parentChildIds = parent.childrenIds ?? []
    const directChildIds = new Set(parentChildIds)
    const developedDirectChildIds = new Set(
      parentChildIds.filter((childId) => {
        const childNode = nodesById.get(childId)
        return !!childNode?.childrenIds?.length
      }),
    )

    developedDirectChildIds.forEach((childId) => {
      setTimeout(() => {
        set((current) => {
          const child = current.nodes.find((node) => node.id === childId)
          if (!child || !child.expanded || child.collapsing) {
            return { nodes: current.nodes }
          }

          return expandNodeReducer(current, childId, set)
        })
      }, 0)
    })

    return {
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              collapseReverseRequested: true,
            }
          : directChildIds.has(node.id)
            ? {
                ...node,
                collapsing: false,
                collapseRole: undefined,
                collapseReverseRequested: undefined,
                collapseStartAt: undefined,
              }
            : node,
      ),
    }
  }

  if (parent.expanded) {
    const byId = new Map(state.nodes.map((node) => [node.id, node]))
    const collapseStartedAt = Date.now()

    const scheduleNodeCollapse = (nodeId: string, startAtMs: number): number => {
      const node = byId.get(nodeId)
      const childIds = node?.childrenIds ?? []
      if (childIds.length === 0) return 0

      let maxChildrenDuration = 0

      childIds.forEach((childId) => {
        const childNode = byId.get(childId)
        if (!childNode) return

        const isDevelopedBranch = !!(childNode.expanded && childNode.childrenIds?.length)

        const nestedDuration =
          isDevelopedBranch
            ? scheduleNodeCollapse(childId, startAtMs)
            : 0

        const childCollapseStartAt = startAtMs + nestedDuration
        const childDeleteAt = childCollapseStartAt + collapseDurationMs
        const childDeleteDelay = Math.max(0, childDeleteAt - collapseStartedAt)

        setTimeout(() => {
          set((current) => {
            if (!isRootCollapsing(current.nodes, id)) {
              return { nodes: current.nodes }
            }

            const rootNow = current.nodes.find((currentNode) => currentNode.id === id)
            if (rootNow?.collapseReverseRequested) {
              return { nodes: current.nodes }
            }

            return {
              nodes: current.nodes.map((currentNode) =>
                currentNode.id === childId
                  ? {
                      ...currentNode,
                      expanded: false,
                      collapsing: true,
                      collapseRole: 'target',
                      collapseStartAt: childCollapseStartAt,
                    }
                  : currentNode,
              ),
            }
          })
        }, Math.max(0, childCollapseStartAt - collapseStartedAt))

        setTimeout(() => {
          set((current) => {
            if (!isRootCollapsing(current.nodes, id)) {
              return { nodes: current.nodes }
            }

            const rootNow = current.nodes.find((currentNode) => currentNode.id === id)
            if (rootNow?.collapseReverseRequested) {
              return { nodes: current.nodes }
            }

            const currentById = new Map(current.nodes.map((currentNode) => [currentNode.id, currentNode]))
            const descendantIds = collectSubtreeIds(currentById, childId)
            const subtreeIds = new Set(descendantIds)
            subtreeIds.add(childId)

            return {
              nodes: current.nodes
                .filter((currentNode) => !subtreeIds.has(currentNode.id))
                .map((currentNode) =>
                  currentNode.id === nodeId
                    ? {
                        ...currentNode,
                        childrenIds: currentNode.childrenIds?.filter((candidateId) => candidateId !== childId),
                      }
                    : currentNode,
                ),
            }
          })
        }, childDeleteDelay)

        maxChildrenDuration = Math.max(
          maxChildrenDuration,
          nestedDuration + collapseDurationMs,
        )
      })

      return maxChildrenDuration
    }

    const rootChildrenDuration = scheduleNodeCollapse(id, collapseStartedAt)

    setTimeout(() => {
      set((current) => {
        if (!isRootCollapsing(current.nodes, id)) {
          return { nodes: current.nodes }
        }

        const rootNow = current.nodes.find((node) => node.id === id)
        if (rootNow?.collapseReverseRequested) {
          return {
            nodes: current.nodes.map((node) =>
              node.id === id
                ? {
                    ...node,
                    collapsing: false,
                    collapseRole: undefined,
                    collapseReverseRequested: undefined,
                    collapseStartAt: undefined,
                  }
                : node,
            ),
          }
        }

        return {
          nodes: current.nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  expanded: false,
                  childrenIds: undefined,
                  collapsing: false,
                  collapseRole: undefined,
                  collapseReverseRequested: undefined,
                  collapseStartAt: undefined,
                }
              : node,
          ),
        }
      })
    }, rootChildrenDuration)

    return {
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              collapsing: true,
              collapseRole: 'source',
              collapseReverseRequested: undefined,
              collapseStartAt: undefined,
            }
          : node,
      ),
    }
  }

  const childDefinitions = getPortfolioStructure(state.language)[parent.templateKey] ?? []
  if (childDefinitions.length === 0) {
    return state
  }

  const childCount = childDefinitions.length
  const radius = BASE_EXPAND_RADIUS + parent.depth * DEPTH_EXPAND_RADIUS_STEP
  const baseAngle = Math.random() * Math.PI * 2
  const expandStartedAt = Date.now()

  const waveSlots = shuffleWaveSlots(childCount)

  const children: Node[] = childDefinitions.map((childDef, index) => {
    const angle = baseAngle + (index / childCount) * Math.PI * 2
    const x = parent.position[0] + Math.cos(angle) * radius
    const y = parent.position[1] + Math.sin(angle) * radius
    const z = parent.position[2] + (Math.random() - 0.5) * Z_RANDOM_SPREAD
    const expandStartAt = expandStartedAt + waveSlots[index] * expandWaveStepMs
    const spawnOrigin = createSpawnOrigin(parent.position)

    return {
      id: `${id}-${childDef.key}`,
      templateKey: childDef.key,
      visualType: getNodeVisualType(childDef.key),
      href: childDef.href,
      expanding: true,
      expandTo: [x, y, z],
      expandStartAt,
      collapsing: false,
      collapseRole: undefined,
      collapseReverseRequested: undefined,
      collapseStartAt: undefined,
      label: getNodeLabel(childDef.key, state.language),
      position: spawnOrigin,
      velocity: [0, 0, 0],
      spawnFrom: spawnOrigin,
      parentId: parent.id,
      depth: parent.depth + CHILD_DEPTH_STEP,
      expanded: false,
    }
  })

  children.forEach((child) => {
    const expandStartAt = child.expandStartAt ?? expandStartedAt
    const clearAt = expandStartAt + EXPAND_STATE_DURATION_MS
    const delay = Math.max(0, clearAt - expandStartedAt)

    setTimeout(() => {
      set((current) => {
        const hasChild = current.nodes.some((node) => node.id === child.id)
        if (!hasChild) {
          return { nodes: current.nodes }
        }

        return {
          nodes: current.nodes.map((node) =>
            node.id === child.id && node.expanding
              ? {
                  ...node,
                  expanding: false,
                  expandTo: undefined,
                  expandStartAt: undefined,
                }
              : node,
          ),
        }
      })
    }, delay)
  })

  const updatedNodes = state.nodes.map((node) =>
    node.id === id
      ? {
          ...node,
          expanded: true,
          childrenIds: children.map((child) => child.id),
          collapseReverseRequested: undefined,
        }
      : node
  )

  return {
    nodes: [...updatedNodes, ...children],
  }
}
