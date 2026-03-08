import type { Language, Node, PortfolioChild } from './types'
import { mainNodeLabel, nodeLabels } from '../../../portfolio/nodes/labels'
import { graphStructure, symmetricEdges as portfolioSymmetricEdges } from '../../../portfolio/nodes/structure'

export const defaultLanguage: Language = 'en'

export const mainNodeLabelByLanguage: Record<Language, string> = mainNodeLabel

export const nodeLabelsByLanguage: Record<Language, Record<string, string>> = nodeLabels

function makeChild(key: string, language: Language, href?: string): PortfolioChild {
  return {
    key,
    label: getNodeLabel(key, language),
    href,
  }
}

export function getNodeLabel(templateKey: string, language: Language): string {
  return (
    nodeLabelsByLanguage[language][templateKey] ??
    nodeLabelsByLanguage.en[templateKey] ??
    templateKey
  )
}

export function getMainNodeLabel(language: Language): string {
  return mainNodeLabelByLanguage[language] ?? mainNodeLabelByLanguage.en
}

export function getPortfolioStructure(language: Language): Record<string, PortfolioChild[]> {
  return Object.fromEntries(
    Object.entries(graphStructure).map(([parent, children]) => [
      parent,
      children.map((child) => makeChild(child.key, language, child.href)),
    ]),
  )
}

export const portfolioStructure: Record<string, PortfolioChild[]> = getPortfolioStructure(defaultLanguage)

export const collapseDurationMs = 300
export const expandWaveStepMs = 140

export const symmetricEdges: [string, string][] = portfolioSymmetricEdges

export function getNodeVisualType(templateKey: string): Node['visualType'] {
  const hasChildren = (getPortfolioStructure(defaultLanguage)[templateKey]?.length ?? 0) > 0
  return hasChildren ? 'sphere' : 'text'
}

export const initialNodes: Node[] = [
  {
    id: 'main',
    templateKey: 'root',
    visualType: getNodeVisualType('root'),
    expanding: false,
    expandTo: undefined,
    expandStartAt: undefined,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    spawnFrom: [0, 0, 0],
    depth: 0,
    label: getMainNodeLabel(defaultLanguage),
    expanded: false,
  },
]
