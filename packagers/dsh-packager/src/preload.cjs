// CommonJS preload — sandboxed renderers don't support ESM preloads
const { contextBridge, ipcRenderer, shell } = require('electron')
contextBridge.exposeInMainWorld('builderAPI', {
  listPlugins: (dshDir) => ipcRenderer.invoke('builder:listPlugins', dshDir),
  build: (opts) => ipcRenderer.invoke('builder:build', opts),
  getDshVersion: (dshDir) => ipcRenderer.invoke('builder:dsh-version', dshDir),
  openExternal: (url) => shell.openExternal(url),
})
