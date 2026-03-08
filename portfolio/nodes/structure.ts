/**
 * Graph structure — which nodes are children of which, and optional hrefs.
 *
 * Each key is a parent templateKey; its value is an array of child descriptors
 * `{ key, href? }`. Add an optional `href` to open an external URL when that
 * node is clicked.
 *
 * Rules:
 *  - Every key used here must have a matching entry in labels.ts.
 *  - Leaf nodes (no children) render as text nodes; some may be handled by
 *    specialized components or as pure external links.
 *  - Only leaf nodes with card content render as expandable card nodes.
 *  - Branch nodes (with children) render as spheres.
 */

import { githubUrl } from '../identity'

export interface StructureChild {
  key: string
  href?: string
}

export const graphStructure: Record<string, StructureChild[]> = {
  root: [
    { key: 'about' },
    { key: 'projects' },
    { key: 'experience' },
    { key: 'mail' },
    { key: 'github', href: githubUrl },
  ],
  about: [
    { key: 'about-story' },
    { key: 'about-interests' },
    { key: 'about-location' },
  ],
  'about-interests': [
    { key: 'interest-1' },
    { key: 'interest-2' },
  ],
  'interest-1': [
    { key: 'topic-1-1' },
    { key: 'topic-1-2' },
  ],
  'interest-2': [
    { key: 'topic-2-1' },
    { key: 'topic-2-2' },
  ],
  'about-story': [
    { key: 'diploma-1' },
    { key: 'diploma-2' },
  ],
  projects: [
    { key: 'project-1' },
    { key: 'project-2' },
    { key: 'project-3', href: `${githubUrl}/your-project-3-repo` },
  ],
  experience: [
    { key: 'exp-2' },
    { key: 'exp-1' },
  ],
}

/**
 * Extra edges that are drawn between nodes which are not in a parent-child
 * relationship. Each tuple is [sourceKey, targetKey].
 */
export const symmetricEdges: [string, string][] = [
  ['about-story', 'experience'],
  ['experience', 'projects'],
  ['topic-1-1', 'topic-2-1'],
  ['topic-1-2', 'topic-1-1'],
  ['topic-1-2', 'topic-2-2'],
  ['project-3', 'interest-1'],
  ['project-2', 'topic-1-2'],
  ['project-3', 'github'],
  ['exp-2', 'topic-2-1'],
  ['exp-1', 'diploma-1'],
  ['exp-2', 'diploma-2'],
]
