export const palette = {
  background: '#070B14',
  fog: '#111A2E',
  textPrimary: '#F7FAFF',
  nodePrimary: '#55E8F6',
  edgeParentChild: '#B6C2D9',
  edgeSymmetric: '#FFD166',
  ctaSecondary: '#B6C2D9',
  lightAmbient: '#B6C2D9',
  lightPoint: '#78B8FF',
} as const

export type GraphCategory = 'core' | 'about' | 'projects' | 'experience' | 'security' | 'contact'

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const tmp = next[index]
    next[index] = next[randomIndex]
    next[randomIndex] = tmp
  }

  return next
}

const graphCategories: GraphCategory[] = ['core', 'about', 'projects', 'experience', 'security', 'contact']
export const baseGraphColorPool = [
  '#FF6B9D',
  '#C44569',
  '#F8B195',
  '#AA96DA',
  '#5E9CCC',
  '#81C995',
  '#FFB347',
  '#87CEEB',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
]


if (baseGraphColorPool.length < graphCategories.length) {
  throw new Error('Not enough unique colors to map one unique color per graph category.')
}

const categoryColorPool = shuffleArray(baseGraphColorPool)
const colorByCategory = Object.fromEntries(
  graphCategories.map((category, index) => [category, categoryColorPool[index]]),
) as Record<GraphCategory, string>

const assignedCategoryColors = graphCategories.map((category) => colorByCategory[category])
if (new Set(assignedCategoryColors).size !== assignedCategoryColors.length) {
  throw new Error('Duplicate colors are not allowed across graph categories.')
}

export const categoryPalette: Record<GraphCategory, { node: string; edge: string }> = {
  core: {
    node: colorByCategory.core,
    edge: colorByCategory.core,
  },
  about: {
    node: colorByCategory.about,
    edge: colorByCategory.about,
  },
  projects: {
    node: colorByCategory.projects,
    edge: colorByCategory.projects,
  },
  experience: {
    node: colorByCategory.experience,
    edge: colorByCategory.experience,
  },
  security: {
    node: colorByCategory.security,
    edge: colorByCategory.security,
  },
  contact: {
    node: colorByCategory.contact,
    edge: colorByCategory.contact,
  },
}

export function getCategoryFromTemplateKey(templateKey: string): GraphCategory {
  if (templateKey === 'root' || templateKey === 'main') return 'core'
  if (templateKey === 'mail' || templateKey === 'github') return 'contact'
  if (templateKey === 'projects' || templateKey.startsWith('project-')) return 'projects'
  if (templateKey === 'experience' || templateKey.startsWith('exp-')) return 'experience'
  if (
    templateKey.includes('security') ||
    templateKey.includes('crypto') ||
    templateKey.includes('protocol')
  ) {
    return 'security'
  }

  return 'about'
}

export const particlePalette: Array<[number, number, number]> = [
  [0.384, 0.965, 1.0],
  [0.784, 0.714, 1.0],
  [1.0, 0.42, 0.42],
  [0.286, 0.949, 0.639],
  [0.918, 0.847, 0.706],
  [1.0, 0.82, 0.4],
]

export const fogSettings = {
  near: 5,
  far: 14,
  nearRatio: 0.55,
  farRatio: 1.55,
  minNear: 3,
  maxNear: 9,
  minFar: 9,
  maxFar: 24,
} as const
