import { palette } from '../../styles/palette'
import type { Language } from '../../store/graph/types'

export const cardCollapsedWidth = 2.15
export const cardCollapsedHeight = 1.05
export const cardMaxExpandedWidth = 5
export const cardBaseExpandedWidth = 4
export const cardCharWidthFactor = 0.011
export const cardTextTopPadding = 0.24
export const cardTextBottomPadding = 0.24
export const cardSummaryDetailsGap = 0.12
export const cardDragStartThreshold = 18
export const cardCenterY = -0.18
export const cardCollapsedTitleGap = 0.5
export const cardExpandedTitleGap = 0.25
export const cardHorizontalPadding = 0.16
// Twice the maximum top extent of an expanded card measured from the node origin (Y = 0).
// The card's visual top (institution line above the title) extends further from the origin
// than the bottom, so the focus-distance formula uses this value — equal to 2 × maxTopExtent —
// to guarantee the whole card fits vertically regardless of the asymmetry.
// Derivation: cardCenterY(-0.18) + maxCardHeight(~4)/2 + titleGap(0.25) + institution(0.28) + titleHalf(0.17) ≈ 2.52 → 2 × 2.52 ≈ 5.1
export const cardMaxVisualHalfSpan = 5.1
export const cardCollapsedCtaFontSize = 0.29
export const cardCollapsedCtaColor = palette.ctaSecondary
export const secondaryCtaFontSize = cardCollapsedCtaFontSize
export const secondaryCtaColor = cardCollapsedCtaColor
export const secondaryCtaY = -0.35
export const researchCtaFontSize = secondaryCtaFontSize + 0.03

// Inline link rendering within card details text
export const cardLinkColor = '#7ec8f0'
export const cardLinkHitPadding = 0.3
export const emailPrivateSvgPath = `${import.meta.env.BASE_URL}private-contact/email.svg`
export const emailLetterSvgPath = `${import.meta.env.BASE_URL}mail-letter.svg`
export const githubLabelSvgPath = `${import.meta.env.BASE_URL}github-label.svg`

// Phone landscape adaptation: when the viewport is short (phone in landscape),
// allow wider cards so text wraps less and the card height fits the reduced viewport.
export const PHONE_LANDSCAPE_HEIGHT_THRESHOLD = 500 // CSS-px height below which we consider a phone landscape
const LANDSCAPE_WIDTH_MULTIPLIER = 1.5
const LANDSCAPE_CARD_MAX_WIDTH = 7.5
// Visual half-span in phone landscape: wider card → less text wrapping → shorter card height.
// Derived from 7.5-wide card: maxCardHeight ≈ 4 × (5/7.5) ≈ 2.67
// → top extent = |cardCenterY| + 2.67/2 + titleGap + institution + titleHalf ≈ 2.21 → 2 × 2.21 ≈ 4.4
// Using a slightly aggressive value of 4.0 (smaller than the derived 4.4) to allow closer zoom,
// accepting a small risk of minor clipping on unusually tall landscape cards with dense content.
// Used only internally via getEffectiveCardMaxVisualHalfSpan().
const LANDSCAPE_VISUAL_HALF_SPAN = 4.0

/**
 * Returns true when the viewport is a phone in landscape orientation
 * (wider than tall and below the height threshold).
 *
 * Single source of truth for the landscape check – used by all landscape-aware helpers.
 */
export function isPhoneLandscapeViewport(
  viewportWidthPx: number,
  viewportHeightPx: number,
): boolean {
  return viewportWidthPx > viewportHeightPx && viewportHeightPx < PHONE_LANDSCAPE_HEIGHT_THRESHOLD
}

/**
 * Returns the effective maximum card expanded width for the current viewport.
 * On phones in landscape orientation the limit is relaxed so the card uses more
 * horizontal space, wraps text less and stays shorter – fitting the smaller height.
 *
 * @param viewportWidthPx  Viewport width in CSS pixels.
 * @param viewportHeightPx Viewport height in CSS pixels.
 * @returns Maximum card expanded width in world units.
 */
export function getEffectiveCardMaxWidth(
  viewportWidthPx: number,
  viewportHeightPx: number,
): number {
  return isPhoneLandscapeViewport(viewportWidthPx, viewportHeightPx)
    ? Math.min(cardMaxExpandedWidth * LANDSCAPE_WIDTH_MULTIPLIER, LANDSCAPE_CARD_MAX_WIDTH)
    : cardMaxExpandedWidth
}

/**
 * Returns the effective maximum card visual half-span for the current viewport.
 * In phone landscape, the card is wider so text wraps less and the card is shorter,
 * so a smaller half-span value is used to allow a tighter (closer) focus distance.
 *
 * @param viewportWidthPx  Viewport width in CSS pixels.
 * @param viewportHeightPx Viewport height in CSS pixels.
 * @returns Maximum card visual half-span in world units.
 */
export function getEffectiveCardMaxVisualHalfSpan(
  viewportWidthPx: number,
  viewportHeightPx: number,
): number {
  return isPhoneLandscapeViewport(viewportWidthPx, viewportHeightPx)
    ? LANDSCAPE_VISUAL_HALF_SPAN
    : cardMaxVisualHalfSpan
}

export function getCardCollapsedCtaText(language: Language): string {
	return language === 'fr' ? 'détails ▼' : 'details ▼'
}

export function getResearchCtaText(): string {
	return '🔎'
}

export function getGithubCtaText(language: Language): string {
	return language === 'fr' ? 'ouvrir ↗' : 'open ↗'
}
