const listEl = document.getElementById('plist')
const logEl = document.getElementById('log')
const dshSourceEl = document.getElementById('dshSource')
const localFieldEl = document.getElementById('localField')
const modeEl = document.getElementById('mode')
const verBadge = document.getElementById('verBadge')
const searchEl = document.getElementById('search')
const catListEl = document.getElementById('catList')
const onlySelEl = document.getElementById('onlySelected')
const countEl = document.getElementById('count')

let catalog = []
let selected = new Map()
let activeCat = ''

function currentDshDir() {
  if (dshSourceEl.value === 'github') return 'github:deepseek-ai/deepseek-harness'
  const el = document.getElementById('dshDir')
  return (el && el.value ? el.value : '').trim() || '../../deepseek-harness'
}

async function fetchCatalog() {
  const dshDir = currentDshDir()
  if (dshSourceEl.value === 'github') {
    logEl.textContent = 'GitHub 源（deepseek-ai/deepseek-harness master）— 使用随打包器内置的插件目录'
  } else {
    logEl.textContent = '加载本地插件目录… ' + dshDir
  }
  try {
    catalog = await window.builderAPI.listPlugins(dshDir)
    const ver = dshSourceEl.value === 'github' ? null : await window.builderAPI.getDshVersion(dshDir)
    verBadge.textContent = ver ? ('DSH ' + ver) : 'DSH latest@master'
  } catch (e) {
    logEl.textContent = '加载失败: ' + e.message
    catalog = []
    renderCats(); render()
    return
  }
  if (!catalog.length) {
    logEl.textContent += '\n未发现插件 — 本地源请检查路径与 submodule init；GitHub 源应始终有内置目录'
  } else {
    const uq = catalog.filter(c => c.unique).length
    logEl.textContent += '\n已加载 ' + catalog.length + ' 个插件（唯一 ' + uq + ' / 不限数 ' + (catalog.length - uq) + '）— 勾选后一键出包'
  }
  renderCats(); render()
}

function renderCats() {
  const cats = [...new Set(catalog.map(c => c.category))].sort()
  catListEl.innerHTML =
    '<div class="cat-item ' + (!activeCat ? 'active' : '') + '" data-cat="">全部 <span class="n">' + catalog.length + '</span></div>' +
    cats.map(c => '<div class="cat-item ' + (activeCat === c ? 'active' : '') + '" data-cat="' + c + '">' + c +
      ' <span class="n">' + catalog.filter(x => x.category === c).length + '</span></div>').join('')
  catListEl.querySelectorAll('.cat-item').forEach(el => el.onclick = () => { activeCat = el.dataset.cat; renderCats(); render() })
}

function linkFor(p) {
  const n = p.name
  if (n.startsWith('@deepseek-ai/')) return 'https://www.npmjs.com/package/' + n
  if (n.startsWith('github:')) return 'https://github.com/' + n.slice(7)
  if (n.startsWith('dsh-') && p.category && p.category !== 'custom') return 'https://github.com/Lin-A1/dsh-hub/tree/main/plugins/' + p.category + '/' + n
  return null
}

function render() {
  const q = (searchEl.value || '').toLowerCase().trim()
  const onlySel = onlySelEl.checked
  listEl.innerHTML = ''
  let shown = 0
  for (const p of catalog) {
    if (activeCat && p.category !== activeCat) continue
    if (q && !(((p.name || '') + '').toLowerCase().includes(q) || ((p.description || '') + '').toLowerCase().includes(q))) continue
    const isSel = selected.has(p.name)
    if (onlySel && !isSel) continue
    shown++
    const row = document.createElement('div')
    row.className = 'prow' + (isSel ? ' selected' : '')
    const href = linkFor(p)
    const tag = p.unique ? '<span class="ptag unique">唯一</span>' : '<span class="ptag">不限数</span>'
    const link = href
      ? '<a href="#" onclick="event.preventDefault();window.builderAPI.openExternal(\'' + href + '\')">↗</a>'
      : ''
    row.innerHTML =
      '<input type="checkbox" class="pcheck" ' + (isSel ? 'checked' : '') + ' />' +
      '<div class="pinfo">' +
        '<div class="pname">' + p.name + ' ' + tag + ' ' + link + '</div>' +
        '<div class="pdesc" title="' + ((p.description || '').replace(/"/g, '&quot;')) + '">' + (p.description || '—') + '</div>' +
      '</div>' +
      '<span class="ptag">' + p.category + '</span>'
    const cb = row.querySelector('.pcheck')
    cb.onchange = () => {
      if (cb.checked) {
        if (p.unique) {
          for (const [k, v] of selected) if (v.unique && v.category === p.category) selected.delete(k)
        }
        const id = (p.id || p.name.replace(/^@deepseek-ai\//, '').replace(/^dsh-/, '')).slice(0, 28)
        selected.set(p.name, Object.assign({}, p, { id }))
      } else selected.delete(p.name)
      render()
    }
    listEl.appendChild(row)
  }
  countEl.textContent = shown + ' / ' + catalog.length + (selected.size ? (' · 已选 ' + selected.size) : '')
  if (!shown) {
    listEl.innerHTML = '<div class="empty">' + (onlySel ? '尚未勾选任何插件' : (q ? '无匹配结果' : '暂无插件 — 请检查 DSH_DIR 或添加自定义源')) + '</div>'
  }
}

window.addCustom = () => {
  const input = document.getElementById('customSpec')
  const spec = input.value.trim()
  if (!spec) return
  const exists = catalog.some(c => c.name === spec)
  if (!exists) {
    const id = spec.split('/').pop().split(':').pop().replace(/[^a-z0-9-]/gi, '-').slice(0, 28).toLowerCase() || 'custom'
    catalog.unshift({ id, name: spec, description: '用户自定义源', category: 'custom', unique: false })
    renderCats()
  }
  input.value = ''
  render()
}

window.build = async () => {
  if (!selected.size) { logEl.textContent = '请先勾选至少一个插件'; return }
  const mode = modeEl.value
  const dshDir = currentDshDir()
  const productName = document.getElementById('productName').value.trim() || 'dsh-fixed-demo'
  const plugins = [...selected.values()].map(v => ({ id: v.id, name: v.name }))
  logEl.textContent = '[build] mode=' + mode + ' product=' + productName + ' dsh=' + dshDir + ' 插件 ' + plugins.length + '\n' + JSON.stringify(plugins, null, 2)
  try {
    const res = await window.builderAPI.build({ mode, dshDir, productName, plugins })
    logEl.textContent += '\n' + (res.log || JSON.stringify(res))
  } catch (e) { logEl.textContent += '\n失败: ' + e.message }
}

modeEl.addEventListener('change', () => {})
dshSourceEl.addEventListener('change', () => {
  localFieldEl.style.display = dshSourceEl.value === 'local' ? '' : 'none'
  fetchCatalog()
})
fetchCatalog()
