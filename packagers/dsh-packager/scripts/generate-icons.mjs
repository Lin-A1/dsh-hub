import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, '..', '..', 'deepseek-harness', 'apps', 'web', 'public', 'favicon.svg')
const buildDir = join(root, 'build')
mkdirSync(buildDir, { recursive: true })

let svg = readFileSync(svgPath, 'utf8')
// Render with dark background to make white path visible; sharp background handles canvas
const png512 = await sharp(Buffer.from(svg)).resize(512, 512, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()
const png256 = await sharp(Buffer.from(svg)).resize(256, 256, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()
const png128 = await sharp(Buffer.from(svg)).resize(128, 128, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()
const png48 = await sharp(Buffer.from(svg)).resize(48, 48, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()
const png32 = await sharp(Buffer.from(svg)).resize(32, 32, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()
const png16 = await sharp(Buffer.from(svg)).resize(16, 16, { fit: 'contain', background: { r: 15, g: 15, b: 15, alpha: 1 } }).png().toBuffer()

writeFileSync(join(buildDir, 'icon.png'), png512)
writeFileSync(join(buildDir, 'icon-256.png'), png256)
console.log('wrote icon.png 512')

// ICO multi-size
const ico = await pngToIco([png16, png32, png48, png128, png256, png512])
writeFileSync(join(buildDir, 'icon.ico'), ico)
console.log('wrote icon.ico')

// ICNS: proper icns via png2icons if available
try {
  const png2icons = await import('png2icons')
  const conv = png2icons.default ?? png2icons
  const icns = conv.createICNS(png256)
  if (icns) {
    writeFileSync(join(buildDir, 'icon.icns'), icns)
    console.log('wrote icon.icns via png2icons')
  } else {
    writeFileSync(join(buildDir, 'icon.icns'), png512)
    console.log('wrote icon.icns as png fallback')
  }
} catch {
  writeFileSync(join(buildDir, 'icon.icns'), png512)
  console.log('wrote icon.icns as png fallback (png2icons not installed)')
}
