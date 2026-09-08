// afterPack: embed dsh icon via standalone rcedit (no winCodeSign/admin),
// then flip fuses — disable asar-integrity (rcedit rewrites PE resources) and
// keep runAsNode enabled (dsh spawn fallback uses ELECTRON_RUN_AS_NODE).
const path = require('path')
const { execFile } = require('child_process')

exports.default = async function (context) {
  const exe = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe')
  const icon = path.join(context.packager.projectDir, 'build', 'icon.ico')
  const rcedit = path.join(context.packager.projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe')
  await new Promise((resolvePromise, reject) => {
    execFile(rcedit, [exe, '--set-icon', icon], (err) => err ? reject(err) : resolvePromise())
  })
  console.log('[after-pack] embedded dsh icon into', exe)

  const { flipFuses, FuseV1Options, FuseVersion } = require('@electron/fuses')
  await flipFuses(exe, {
    version: FuseVersion.V1,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
    [FuseV1Options.EnableRunAsNode]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: false,
  })
  console.log('[after-pack] fuses flipped: integrity=off runAsNode=on for', exe)
}
