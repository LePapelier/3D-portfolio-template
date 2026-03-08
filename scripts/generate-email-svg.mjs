import fs from 'node:fs/promises'
import path from 'node:path'
import opentype from 'opentype.js'

function parseArgs(argv) {
  const args = {
    email: '',
    font: '',
    out: 'public/email.svg',
    fontSize: 34,
    letterSpacing: 0,
    fill: '#ffffff',
    padding: 8,
  }

  for (let index = 2; index < argv.length; index++) {
    const key = argv[index]
    const value = argv[index + 1]

    if (!key.startsWith('--')) continue

    switch (key) {
      case '--email':
        args.email = value ?? ''
        index += 1
        break
      case '--font':
        args.font = value ?? ''
        index += 1
        break
      case '--out':
        args.out = value ?? args.out
        index += 1
        break
      case '--fontSize':
        args.fontSize = Number(value ?? args.fontSize)
        index += 1
        break
      case '--letterSpacing':
        args.letterSpacing = Number(value ?? args.letterSpacing)
        index += 1
        break
      case '--fill':
        args.fill = value ?? args.fill
        index += 1
        break
      case '--padding':
        args.padding = Number(value ?? args.padding)
        index += 1
        break
      default:
        break
    }
  }

  return args
}

function loadFont(fontPath) {
  return new Promise((resolve, reject) => {
    opentype.load(fontPath, (error, font) => {
      if (error || !font) {
        reject(error ?? new Error('Unable to load font'))
        return
      }

      resolve(font)
    })
  })
}

function buildGlyphPath(font, text, fontSize, letterSpacing) {
  let x = 0
  const y = fontSize
  const path = new opentype.Path()

  for (const char of text) {
    const glyph = font.charToGlyph(char)
    const glyphPath = glyph.getPath(x, y, fontSize)
    path.commands.push(...glyphPath.commands)

    const advanceWidth = glyph.advanceWidth ?? font.unitsPerEm
    x += (advanceWidth / font.unitsPerEm) * fontSize + letterSpacing
  }

  return path
}

function validateInput(args) {
  if (!args.email) {
    args.email = 'hello@example.com'
    process.stdout.write('No email provided, fallback to hello@example.com\n')
  }

  if (!args.font) {
    throw new Error('Missing --font. Example: --font "./public/fonts/Inter-Regular.ttf"')
  }

  if (!Number.isFinite(args.fontSize) || args.fontSize <= 0) {
    throw new Error('--fontSize must be a positive number')
  }

  if (!Number.isFinite(args.letterSpacing)) {
    throw new Error('--letterSpacing must be a number')
  }

  if (!Number.isFinite(args.padding) || args.padding < 0) {
    throw new Error('--padding must be a positive number or zero')
  }
}

async function run() {
  const args = parseArgs(process.argv)
  validateInput(args)

  const fontPath = path.resolve(process.cwd(), args.font)
  const outPath = path.resolve(process.cwd(), args.out)

  const font = await loadFont(fontPath)
  const glyphPath = buildGlyphPath(font, args.email, args.fontSize, args.letterSpacing)
  const bbox = glyphPath.getBoundingBox()
  const pathData = glyphPath.toPathData(3)

  const width = Math.max(1, Math.ceil(bbox.x2 - bbox.x1 + args.padding * 2))
  const height = Math.max(1, Math.ceil(bbox.y2 - bbox.y1 + args.padding * 2))
  const dx = args.padding - bbox.x1
  const dy = args.padding - bbox.y1

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="email">\n  <g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)})">\n    <path d="${pathData}" fill="${args.fill}" />\n  </g>\n</svg>\n`

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, svg, 'utf8')

  process.stdout.write(`SVG generated: ${path.relative(process.cwd(), outPath)}\n`)
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
