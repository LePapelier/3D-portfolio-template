/**
 * SEO metadata — update these values to improve your portfolio's
 * visibility in search engines.
 *
 * These values are used in:
 *  - The <head> meta tags (title, description, theme-color, hreflang)
 *  - The Open Graph / Twitter Card meta tags
 *  - The JSON-LD structured data (schema.org/Person)
 *  - The Web App Manifest (manifest.webmanifest)
 *  - The sitemap.xml (auto-generated at build time)
 *  - The hidden HTML content layer read by crawlers
 */

import { fullName, siteUrl, githubUrl } from './identity'

/** Your job title shown in meta descriptions and structured data. */
export const jobTitle = 'Web Developer'

/**
 * A concise description of your portfolio shown in search-result snippets
 * and social-media previews (aim for 120–160 characters).
 */
export const seoDescription = `Portfolio of ${fullName} — ${jobTitle} specialising in interactive web experiences and modern front-end development.`

/**
 * Comma-separated keywords that describe your work.
 * Keep the list focused; 5-10 relevant terms is plenty.
 */
export const seoKeywords = [
  'web developer',
  'portfolio',
  'frontend developer',
  'react',
  'three.js',
  'webgl',
  'interactive experiences',
]

/**
 * URL of a social-preview image (1200 × 630 px recommended).
 * Place the image in /public and update the path, or use an absolute URL.
 * Leave as an empty string if you don't have one yet.
 */
export const ogImageUrl = ''

/**
 * Your Twitter / X handle (without the @), used for Twitter Card meta tags.
 * Leave as an empty string if you don't have one or don't want to use it.
 */
export const twitterHandle = ''

/**
 * Your LinkedIn profile URL, used in JSON-LD sameAs links.
 * Example: 'https://www.linkedin.com/in/your-profile'
 * Leave as an empty string if you don't have one or don't want to use it.
 */
export const linkedinUrl = ''

/**
 * The primary brand colour used in:
 *  - <meta name="theme-color"> (mobile browser toolbar)
 *  - The Web App Manifest theme/background colour
 * Should match your app's background.  Default is the dark portfolio background.
 */
export const themeColor = '#070B14'

// Re-export shared identity so consumers only need one import
export { fullName, siteUrl, githubUrl }
