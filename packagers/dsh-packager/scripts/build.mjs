#!/usr/bin/env node
/**
 * Non-invasive packager: specify external DSH_DIR, copy built artifacts into resources/dsh
 * Usage:
 *   pnpm run build -- --dsh-dir ../deepseek-harness
 *   DSH_DIR=../deepseek-harness pnpm run build
 *   pnpm run build -- --dsh-dir G:\path\to\dsh --skip-build
 */
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  if (i !== -1) return args[i + 1]
  const pref = args.find(a => a.startsWith(name + '='))
  if (pref) return pref.slice(name.length + 1)
  return undefined
}

const dshDirRaw = getArg('--dsh-dir') ?? process.env.DSH_DIR ?? 'github:deepseek-ai/deepseek-harness'

// github:<owner>/<repo> â€?shallow clone to temp, then treat as local dir
function materializeGithubSource(spec) {
  const target = join(process.env.TEMP || '/tmp', 'dsh-packager-clone', spec.replace(/[^a-z0-9-]/gi, '_'))
  if (existsSync(join(target, 'package.json'))) {
    console.log(`[packager] reusing cached clone ${target}`)
    return target
  }
  console.log(`[packager] cloning ${spec} -> ${target}`)
  mkdirSync(dirname(target), { recursive: true })
  const r = spawnSync('git', ['clone', '--depth', '1', spec.replace(/^github:/, 'https://github.com/') + '.git', target], {
    stdio: 'inherit', shell: process.platform === 'win32',
  })
  if (r.status !== 0) {
    console.error('[packager] git clone failed â€?install git or use a local DSH_DIR')
    process.exit(1)
  }
  return target
}

const resolvedRaw = dshDirRaw.startsWith('github:') ? materializeGithubSource(dshDirRaw) : dshDirRaw
const dshDir = resolve(root, resolvedRaw)
const skipBuild = args.includes('--skip-build')
const outDir = join(root, 'resources/dsh')

if (!existsSync(join(dshDir, 'package.json'))) {
  console.error(`[packager] DSH_DIR not found: ${dshDir}`)
  console.error(`  pass --dsh-dir <path|github:owner/repo> or DSH_DIR env`)
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(join(dshDir, 'package.json'), 'utf8'))
console.log(`[packager] DSH_DIR=${dshDir} (${manifest.name}@${manifest.version})`)
console.log(`[packager] out=${outDir} skipBuild=${skipBuild}`)

function ensureDshBuilt(dir) {
  const hasDeps = existsSync(join(dir, 'node_modules', '.pnpm')) || existsSync(join(dir, 'node_modules', '@deepseek-ai'))
  if (!hasDeps) {
    console.log('[packager] node_modules missing â€?running pnpm install (first time on fresh clone)...')
    const inst = spawnSync('pnpm', ['install'], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, CI: 'true' } })
    if (inst.status !== 0) process.exit(inst.status ?? 1)
  }
  const hasLib = existsSync(join(dir, 'apps/cli/lib/bin.js'))
  const hasWeb = existsSync(join(dir, 'apps/web/dist'))
  if (!hasLib || !hasWeb) {
    const r = spawnSync('pnpm', ['run', 'build'], { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, CI: 'true' } })
    if (r.status !== 0) process.exit(r.status ?? 1)
  } else {
    console.log('[packager] found apps/cli/lib/bin.js and apps/web/dist, skip pnpm build')
  }
}

if (!skipBuild) {
  console.log('[packager] ensuring dsh built artifacts...')
  ensureDshBuilt(dshDir)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// Full dependency closure via pnpm deploy (same pipeline as python/sdk-runtime exe):
// produces node_modules + apps/cli/lib + config â€?required for packaged runtime,
// bare lib/ cannot resolve @deepseek-ai/* without the monorepo.
console.log('[packager] staging deploy closure (pnpm deploy)...')
const deploy = spawnSync('pnpm', [
  '--dir', dshDir,
  '--filter', '@deepseek-ai/dsh',
  'deploy', '--legacy', '--prod',
  '--config.node-linker=hoisted',
  '--config.auto-install-peers=false',
  '--config.link-workspace-packages=true',
  outDir,
], { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, CI: 'true' } })
if (deploy.status !== 0) {
  console.error('[packager] pnpm deploy failed')
  process.exit(deploy.status ?? 1)
}
// Frontend assets for the web profile
const webDist = join(dshDir, 'apps/web/dist')
if (existsSync(webDist)) {
  cpSync(webDist, join(outDir, 'apps/web/dist'), { recursive: true })
  console.log('[packager] cp apps/web/dist -> staged')
}
// Vendored workspace packages (rescoped cordis/cosmokit/schemastery) are resolved
// via harness pnpm-workspace overrides â€?legacy deploy omits them. Copy from vendor/.
const vendorMap = {
  cordis: 'cordis', cosmokit: 'cosmokit', group: 'cordis-plugin-group',
  hmr: 'cordis-plugin-hmr', include: 'cordis-plugin-include', loader: 'cordis-plugin-loader',
  'logger-console': 'cordis-plugin-logger-console', schemastery: 'schemastery', timer: 'cordis-plugin-timer',
}
for (const [dir, pkgName] of Object.entries(vendorMap)) {
  const srcDir = join(dshDir, 'vendor', dir)
  const dst = join(outDir, 'node_modules/@deepseek-ai', pkgName)
  if (!existsSync(join(srcDir, 'package.json'))) { console.warn(`[packager] vendor ${dir} missing, skip`); continue }
  rmSync(dst, { recursive: true, force: true })
  cpSync(srcDir, dst, { recursive: true, filter: s => !s.includes('node_modules') && !s.includes('tsconfig.tsbuildinfo') })
}
console.log('[packager] vendored cordis/cosmokit/schemastery packages staged')

// Peer-dependency workspace packages are omitted by legacy deploy. Scan the
// harness packages tree for name->dir, then copy any @deepseek-ai/* import that
// is missing from the staged closure (iterate until no unresolved imports).
const peerPkgs = {}
const pkgsRoot = join(dshDir, 'packages')
if (existsSync(pkgsRoot)) {
  for (const group of readdirSync(pkgsRoot)) {
    const gDir = join(pkgsRoot, group)
    let entries = []
    try { entries = readdirSync(gDir) } catch { continue }
    for (const name of entries) {
      const mf = join(gDir, name, 'package.json')
      if (!existsSync(mf)) continue
      try {
        const j = JSON.parse(readFileSync(mf, 'utf8'))
        if (j.name?.startsWith('@deepseek-ai/')) peerPkgs[j.name] = join(gDir, name)
      } catch {}
    }
  }
}
const stagedScope = join(outDir, 'node_modules/@deepseek-ai')
for (let round = 0; round < 4; round++) {
  const missing = new Set()
  for (const dir of readdirSync(stagedScope)) {
    const pkgDir = join(stagedScope, dir)
    let files = []
    try { files = readdirSync(pkgDir, { recursive: true }) } catch { continue }
    for (const f of files) {
      if (!String(f).endsWith('.js')) continue
      const src = readFileSync(join(pkgDir, String(f)), 'utf8')
      for (const m of src.matchAll(/from ['"](@deepseek-ai\/[^'"/]+)(?:\/[^'"]*)?['"]/g)) {
        const dep = m[1]
        if (!existsSync(join(stagedScope, dep.replace('@deepseek-ai/', '')))) missing.add(dep)
      }
    }
  }
  if (!missing.size) { console.log('[packager] peer closure complete'); break }
  console.log(`[packager] peer round ${round + 1}: adding ${[...missing].join(', ')}`)
  for (const dep of missing) {
    const srcDir = peerPkgs[dep]
    if (!srcDir) { console.error(`[packager] FATAL: ${dep} not found in harness packages â€?cannot close`); process.exit(1) }
    const dst = join(stagedScope, dep.replace('@deepseek-ai/', ''))
    rmSync(dst, { recursive: true, force: true })
    cpSync(srcDir, dst, { recursive: true, filter: s => !s.includes('node_modules') && !s.includes('.tsbuildinfo') && !s.includes('/tests') })
  }
}
let ok = 6
console.log('[packager] done. deploy closure staged.')
console.log('[packager] Next: pnpm run dist  (or dist:win/mac/linux)')
console.log('[packager] DSH_HOME remains at ~/.dsh (resolveDshHome), plugin hot-plug via profile node_modules stays outside asar.')
