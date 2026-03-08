/**
 * French card content.
 * Each key must match a leaf templateKey in nodes/structure.ts.
 */

import type { CardContent } from '../types'
import { siteUrl } from '../identity'

export const cardContentFr: Record<string, CardContent> = {
  'exp-1': {
    institutionText: 'Organisation A — Ville A',
    summaryText: 'Courte description du rôle 1',
    detailsText: `
- Tâche ou réalisation 1
- Tâche ou réalisation 2
- Tâche ou réalisation 3
`,
  },
  'exp-2': {
    institutionText: 'Organisation B — Ville B',
    summaryText: 'Courte description du rôle 2',
    detailsText: `
- Tâche ou réalisation 1
- Tâche ou réalisation 2
- Tâche ou réalisation 3
`,
  },
  'diploma-1': {
    institutionText: 'Établissement A — Année A',
    summaryText: 'Intitulé complet du diplôme 1',
    detailsText: `
- Matière ou cours clé 1
- Matière ou cours clé 2
`,
  },
  'diploma-2': {
    institutionText: 'Établissement B — Année B',
    summaryText: 'Intitulé complet du diplôme 2',
    detailsText: `
- Matière ou cours clé 1
- Matière ou cours clé 2
- Matière ou cours clé 3
`,
  },
  'project-1': {
    summaryText: 'Courte description du projet 1',
    detailsText: `
- Point fort ou fonctionnalité 1
- Point fort ou fonctionnalité 2
- Point fort ou fonctionnalité 3
- Disponible en direct sur [${siteUrl}](${siteUrl})
`,
  },
  'project-2': {
    summaryText: 'Courte description du projet 2',
    detailsText: `
- Point fort ou fonctionnalité 1
- Point fort ou fonctionnalité 2
- Point fort ou fonctionnalité 3
`,
  },
}
