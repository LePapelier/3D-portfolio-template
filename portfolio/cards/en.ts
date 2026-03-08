/**
 * English card content.
 * Each key must match a leaf templateKey in nodes/structure.ts.
 */

import type { CardContent } from '../types'
import { siteUrl } from '../identity'

export const cardContentEn: Record<string, CardContent> = {
  'exp-1': {
    institutionText: 'Organization A — City A',
    summaryText: 'Short description of Role 1',
    detailsText: `
- Task or achievement 1
- Task or achievement 2
- Task or achievement 3
`,
  },
  'exp-2': {
    institutionText: 'Organization B — City B',
    summaryText: 'Short description of Role 2',
    detailsText: `
- Task or achievement 1
- Task or achievement 2
- Task or achievement 3
`,
  },
  'diploma-1': {
    institutionText: 'Institution A — Year A',
    summaryText: 'Degree 1 full title',
    detailsText: `
- Key topic or course 1
- Key topic or course 2
`,
  },
  'diploma-2': {
    institutionText: 'Institution B — Year B',
    summaryText: 'Degree 2 full title',
    detailsText: `
- Key topic or course 1
- Key topic or course 2
- Key topic or course 3
`,
  },
  'project-1': {
    summaryText: 'Short description of Project 1',
    detailsText: `
- Highlight or feature 1
- Highlight or feature 2
- Highlight or feature 3
- Explore it live at [${siteUrl}](${siteUrl})
`,
  },
  'project-2': {
    summaryText: 'Short description of Project 2',
    detailsText: `
- Highlight or feature 1
- Highlight or feature 2
- Highlight or feature 3
`,
  },
}
