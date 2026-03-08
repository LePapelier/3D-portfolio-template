import type { GraphNodeProps, Vector3Tuple } from './types'

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
}

const iconByTemplateKey: Record<string, string> = {
  root: '👤',
  about: '👤',
  projects: '🧩',
  experience: '💼',
  mail: '✉️',
  github: '🐙',
  'about-story': '👤',
  'about-interests': '✨',
  'about-location': '📍',
  'interest-1': '✨',
  'interest-2': '✨',
  'topic-1-1': '•',
  'topic-1-2': '•',
  'topic-2-1': '•',
  'topic-2-2': '•',
  'diploma-1': '🎓',
  'diploma-2': '🎓',
  'project-1': '🧩',
  'project-2': '🧩',
  'project-3': '🧩',
  'exp-1': '💼',
  'exp-2': '💼',
}

export function getLabelIcon(label: string, templateKey?: string) {
  if (templateKey) {
    const mappedIcon = iconByTemplateKey[templateKey]
    if (mappedIcon) return mappedIcon
  }

  const value = normalizeLabel(label)

  if (value.includes('linkedin')) return '💼'
  if (value.includes('github')) return '🐙'
  if (value.includes('email') || value.includes('contact')) return '✉️'
  if (value.includes('projet') || value.includes('project') || value.includes('portfolio')) return '🧩'
  if (value.includes('experience') || value.includes('stage') || value.includes('intern')) return '💼'
  if (value.includes('recherche') || value.includes('research')) return '🔬'
  if (value.includes('diplome') || value.includes('degree') || value.includes('master') || value.includes('insa')) return '🎓'
  if (value.includes('cryptologie')) return '🔐'
  if (value.includes('crypto') || value.includes('securite') || value.includes('security') || value.includes('protocol')) return '🔐'
  if (value.includes('theorique') || value.includes('theoretical')) return 'λ'
  if (value.includes('complexite') || value.includes('complexity') || value.includes('computabil')) return '🧠'
  if (value.includes('semantique') || value.includes('semantics')) return 'λ'
  if (value.includes('verification')) return '✅'
  if ((value.includes('modele') || value.includes('model')) && (value.includes('securite') || value.includes('security'))) return '🧠'
  if (value.includes('modele') || value.includes('model')) return '🧠'
  if (value.includes('interet') || value.includes('centre') || value.includes('interest')) return '✨'
  if (value.includes('paris') || value.includes('ville') || value.includes('base') || value.includes('based') || value.includes('remote') || value.includes('rennes') || value.includes('france')) return '📍'
  if (value.includes('competence') || value.includes('stack') || value.includes('tech')) return '⚙️'
  if (value.includes('a propos') || value.includes('parcours') || value.includes('background') || value.includes('profile')) return '👤'

  return '•'
}

export function formatLabelWithIcon(icon: string, label: string) {
  if (!icon) return label
  const spacer = icon === '✉️' ? ' ' : icon === 'λ' ? '  ' : '\u2009'
  return `${icon}${spacer}${label}`
}

export function extractEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0]
}

function isSameVector3(a: Vector3Tuple, b: Vector3Tuple) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function areGraphNodePropsEqual(previous: GraphNodeProps, next: GraphNodeProps) {
  return (
    previous.id === next.id &&
    previous.templateKey === next.templateKey &&
    previous.label === next.label &&
    previous.visualType === next.visualType &&
    previous.accentColor === next.accentColor &&
    previous.href === next.href &&
    previous.expanding === next.expanding &&
    previous.expandStartAt === next.expandStartAt &&
    previous.collapsing === next.collapsing &&
    previous.collapseRole === next.collapseRole &&
    previous.collapseStartAt === next.collapseStartAt &&
    previous.expanded === next.expanded &&
    previous.totalNodeCount === next.totalNodeCount &&
    previous.depth === next.depth &&
    previous.radius === next.radius &&
    isSameVector3(previous.position, next.position) &&
    isSameVector3(previous.spawnFrom, next.spawnFrom)
  )
}
