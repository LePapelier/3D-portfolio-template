export type Vector3Tuple = [number, number, number]

export interface GraphNodeProps {
  id: string
  templateKey: string
  label: string
  getDistanceOrderIndex: (id: string) => number
  totalNodeCount: number
  visualType: 'sphere' | 'text'
  accentColor: string
  href?: string
  expanding: boolean
  expandStartAt?: number
  collapsing: boolean
  collapseRole?: 'source' | 'target'
  collapseStartAt?: number
  expanded: boolean
  position: Vector3Tuple
  spawnFrom: Vector3Tuple
  depth: number
  radius?: number
}

export interface CardNodeContent {
  institutionText?: string
  summaryText: string
  detailsText: string
}
