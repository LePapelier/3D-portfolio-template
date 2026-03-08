import { create } from 'zustand'
import { defaultLanguage, getMainNodeLabel, getNodeLabel, initialNodes } from './graph/config'
import { expandNodeReducer } from './graph/expandNode'
import { tickPhysicsReducer } from './graph/physics'
import type { GraphState, Language, Node } from './graph/types'

export type { GraphState, Node }

const LANGUAGE_STORAGE_KEY = 'portfolio-language'

function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'fr'
}

function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return defaultLanguage

  const candidates = [navigator.language, ...(navigator.languages ?? [])]
  const normalized = candidates
    .filter((candidate): candidate is string => !!candidate)
    .map((candidate) => candidate.toLowerCase())

  return normalized.some((candidate) => candidate.startsWith('fr')) ? 'fr' : 'en'
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return defaultLanguage

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (!storedLanguage) return getBrowserLanguage()

  return isLanguage(storedLanguage) ? storedLanguage : getBrowserLanguage()
}

export const useGraphStore = create<GraphState>((set) => ({
  language: getInitialLanguage(),
  draggedNodeId: null,
  hoveredNodeId: null,
  focusedCardNodeId: null,
  nodes: initialNodes,
  expandNode: (id) =>
    set((state) => expandNodeReducer(state, id, set)),
  setLanguage: (language: Language) =>
    set((state) => {
      if (state.language === language) return state

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
      }

      return {
        language,
        nodes: state.nodes.map((node) => {
          if (node.id === 'main') {
            return {
              ...node,
              label: getMainNodeLabel(language),
            }
          }

          return {
            ...node,
            label: getNodeLabel(node.templateKey, language),
          }
        }),
      }
    }),
  setHoveredNode: (id) =>
    set({
      hoveredNodeId: id,
    }),
  setFocusedCardNodeId: (id) =>
    set({
      focusedCardNodeId: id,
    }),
  startDragging: (id) =>
    set((state) => {
      const node = state.nodes.find((candidate) => candidate.id === id)
      if (!node || node.id === 'main') return state

      return {
        draggedNodeId: id,
      }
    }),
  stopDragging: () =>
    set({
      draggedNodeId: null,
    }),
  moveNode: (id, position) =>
    set((state) => {
      const index = state.nodes.findIndex((node) => node.id === id)
      if (index === -1) return state

      const current = state.nodes[index]
      if (current.id === 'main') return state

      const isSamePosition =
        current.position[0] === position[0] &&
        current.position[1] === position[1] &&
        current.position[2] === position[2]

      if (isSamePosition && current.velocity[0] === 0 && current.velocity[1] === 0 && current.velocity[2] === 0) {
        return state
      }

      const nodes = [...state.nodes]
      nodes[index] = {
        ...current,
        position,
        velocity: [0, 0, 0],
      }

      return { nodes }
    }),
  tickPhysics: (delta) =>
    set((state) => tickPhysicsReducer(state, delta)),
}))
