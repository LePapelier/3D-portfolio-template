import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  fullName,
  siteUrl,
  githubUrl,
  jobTitle,
  seoDescription,
  seoKeywords,
  ogImageUrl,
  twitterHandle,
  linkedinUrl,
  themeColor,
} from './portfolio/seo'

const seoTitle = `${fullName} — ${jobTitle}`
const seoKeywordsStr = seoKeywords.join(', ')

// Respect VITE_BASE_URL so sitemap / manifest stay correct on subpath deployments
// (e.g. GitHub Pages: VITE_BASE_URL=/my-portfolio/).
// Normalise to always end with '/' so path concatenation is safe.
const rawBase = process.env.VITE_BASE_URL?.trim() || '/'
const viteBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

// Normalise siteUrl — strip any trailing slash before appending so we never
// produce a double slash (e.g. "https://example.com/" + "/" → "…//").
const normalizedSiteUrl = siteUrl.replace(/\/+$/, '')
const canonicalUrl = viteBase === '/' ? `${normalizedSiteUrl}/` : `${normalizedSiteUrl}${viteBase}`

// ── Open Graph image tag ─────────────────────────────────────────────────────
const ogImageTag = ogImageUrl
  ? `<meta property="og:image" content="${ogImageUrl}" />\n    <meta name="twitter:image" content="${ogImageUrl}" />`
  : `<!-- og:image — add an ogImageUrl in portfolio/seo.ts to enable social previews -->`

// ── Twitter creator tag ──────────────────────────────────────────────────────
const twitterCreatorTag = twitterHandle
  ? `<meta name="twitter:creator" content="@${twitterHandle}" />`
  : `<!-- twitter:creator — add a twitterHandle in portfolio/seo.ts to enable this tag -->`

// ── hreflang alternate links (bilingual EN + FR SPA) ────────────────────────
const hreflangTags = [
  `<link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />`,
  `<link rel="alternate" hreflang="en"         href="${canonicalUrl}" />`,
  `<link rel="alternate" hreflang="fr"         href="${canonicalUrl}" />`,
].join('\n    ')

// ── JSON-LD Person schema ────────────────────────────────────────────────────
const sameAs = [githubUrl, linkedinUrl].filter(Boolean)

const jsonLd = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    jobTitle,
    description: seoDescription,
    url: normalizedSiteUrl,
    sameAs,
  },
  null,
  2,
)

// ── Web App Manifest ─────────────────────────────────────────────────────────
const manifestContent = JSON.stringify(
  {
    name: seoTitle,
    short_name: fullName,
    description: seoDescription,
    start_url: viteBase,
    scope: viteBase,
    display: 'standalone',
    theme_color: themeColor,
    background_color: themeColor,
    icons: [
      {
        src: `${viteBase}favicon.svg`,
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any maskable',
      },
    ],
  },
  null,
  2,
)

// ── Sitemap ──────────────────────────────────────────────────────────────────
const lastmod = new Date().toISOString().split('T')[0]
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
  <url>
    <loc>${canonicalUrl}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl}"/>
    <xhtml:link rel="alternate" hreflang="en"         href="${canonicalUrl}"/>
    <xhtml:link rel="alternate" hreflang="fr"         href="${canonicalUrl}"/>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL?.trim() || '/',
  plugins: [
    react(),
    {
      // Inject portfolio SEO values into index.html at build / dev time.
      // All values come from portfolio/seo.ts — edit that file, not index.html.
      name: 'inject-portfolio-seo',
      transformIndexHtml(html) {
        return html
          .replace(/%SEO_TITLE%/g, () => seoTitle)
          .replace(/%SEO_DESCRIPTION%/g, () => seoDescription)
          .replace(/%SEO_KEYWORDS%/g, () => seoKeywordsStr)
          .replace(/%SEO_AUTHOR%/g, () => fullName)
          .replace(/%SEO_URL%/g, () => canonicalUrl)
          .replace(/%SEO_GITHUB_URL%/g, () => githubUrl)
          .replace(/%SEO_JOB_TITLE%/g, () => jobTitle)
          .replace(/%SEO_OG_IMAGE%/g, () => ogImageTag)
          .replace(/%SEO_TWITTER_CREATOR%/g, () => twitterCreatorTag)
          .replace(/%SEO_JSON_LD%/g, () => jsonLd)
          .replace(/%SEO_THEME_COLOR%/g, () => themeColor)
          .replace(/%SEO_HREFLANG%/g, () => hreflangTags)
      },
    },
    {
      // Serve manifest.webmanifest in dev and write sitemap.xml + manifest in
      // production — all values come from portfolio/seo.ts.
      name: 'generate-manifest-and-sitemap',
      configureServer(server) {
        server.middlewares.use('/manifest.webmanifest', (_req, res) => {
          res.setHeader('Content-Type', 'application/manifest+json')
          res.end(manifestContent)
        })
      },
      writeBundle(options) {
        const outDir = options.dir ?? 'dist'
        fs.writeFileSync(path.join(outDir, 'manifest.webmanifest'), manifestContent, 'utf8')
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapContent, 'utf8')
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }

          if (
            id.includes('/@react-three/fiber/') ||
            id.includes('/@react-three/drei/') ||
            id.includes('/@react-three/postprocessing/') ||
            id.includes('/postprocessing/') ||
            id.includes('/three-stdlib/')
          ) {
            return 'r3f-vendor'
          }

          if (id.includes('/three/')) {
            return 'three-core'
          }

          if (id.includes('/gsap/')) {
            return 'animation-vendor'
          }

          if (id.includes('/zustand/')) {
            return 'state-vendor'
          }

          return undefined
        },
      },
    },
  },
})
