import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
/**
 * List external plugins from dsh-hub + DSH_DIR packages.
 * Returns [{id,name,description,category,unique,enabled}]
 */
export function listPlugins(dshDir) {
  const out = []
  const seen = new Set()
  function add(id, name, desc, category, unique) {
    if (seen.has(id)) return
    seen.add(id)
    out.push({ id, name, description: desc, category, unique, enabled: false })
  }
  // dsh-hub plugins — external catalog, dsh-hub + user custom
  try {
    const hubPlugins = resolve(__dirname, '..', '..', '..', 'plugins')
    if (existsSync(hubPlugins)) {
      for (const cat of readdirSync(hubPlugins)) {
        const catPath = join(hubPlugins, cat)
        // filter to directories only
        try { if (!existsSync(catPath)) continue; const s = readdirSync(catPath); if (!Array.isArray(s)) continue } catch { continue }
        let entries
        try { entries = readdirSync(catPath) } catch { continue }
        for (const name of entries) {
          const full = join(catPath, name)
          try { if (!existsSync(join(full, 'package.json'))) continue } catch { continue }
          const pkg = join(full, 'package.json')
          if (!existsSync(pkg)) continue
          try {
            const j = JSON.parse(readFileSync(pkg,'utf8'))
            const unique = ['llm','sandbox','session','agent','agent-loop','system-prompt','subprocess','credentials','settings'].includes(cat)
            add(j.name.replace(/^@deepseek-ai\//,'').replace(/^dsh-/,'').slice(0,28), j.name, j.description||'', cat, unique)
          } catch {}
        }
      }
    }
  } catch {}
  // DSH_DIR packages — official harness
  try {
    const pkgs = resolve(dshDir, 'packages')
    if (!existsSync(pkgs)) throw new Error('no packages')
    for (const group of readdirSync(pkgs)) {
      const groupPath = join(pkgs, group)
      let entries
      try { entries = readdirSync(groupPath) } catch { continue }
      for (const pkg of entries) {
        const pkgPath = join(groupPath, pkg)
        let isDir = false
        try { isDir = existsSync(join(pkgPath, 'package.json')) } catch {}
        if (!isDir) continue
        const p = join(pkgPath, 'package.json')
        if (!existsSync(p)) continue
        try {
          const j = JSON.parse(readFileSync(p,'utf8'))
          if (!j.name?.startsWith('@deepseek-ai/dsh-')) continue
          const unique = j.name.includes('dsh-llm') || j.name.includes('dsh-sandbox') || j.name.includes('dsh-session') || (j.name.includes('dsh-agent-') && !j.name.includes('tool'))
          add(j.name.split('/').pop().replace('dsh-','').slice(0,28), j.name, j.description||'', group, unique)
        } catch {}
      }
    }
  } catch {}
  return out
}
if (process.argv[1] && process.argv[1].endsWith('list-plugins.mjs')) {
  const dir = process.argv[2] || '../deepseek-harness'
  console.log(JSON.stringify(listPlugins(dir), null, 2))
}
