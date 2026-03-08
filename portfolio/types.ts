/**
 * Shared types used across portfolio data files.
 * Keep this file free of any app-layer imports so the portfolio/ folder
 * remains a pure data layer with no circular dependencies.
 */

export type Language = 'en' | 'fr'

export interface CardContent {
  /** Name of the institution, company, or lab (optional). */
  institutionText?: string
  /** One-line summary shown on the collapsed card. */
  summaryText: string
  /** Markdown-style bullet list shown in the expanded card. */
  detailsText: string
}
