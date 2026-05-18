const fs = require('fs')
const path = require('path')

// Keep only these locales — remove everything else from Electron Framework
const KEEP = new Set(['en', 'en_GB', 'th'])

module.exports = async function afterPack({ appOutDir, packager }) {
  const platform = packager.platform.name
  if (platform !== 'mac') return

  const appName = packager.appInfo.productName
  const resourcesDir = path.join(
    appOutDir,
    `${appName}.app`,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Versions',
    'A',
    'Resources',
  )

  if (!fs.existsSync(resourcesDir)) return

  let removed = 0
  let savedBytes = 0

  for (const entry of fs.readdirSync(resourcesDir)) {
    if (!entry.endsWith('.lproj')) continue
    const lang = entry.replace('.lproj', '')
    if (KEEP.has(lang)) continue

    const fullPath = path.join(resourcesDir, entry)
    try {
      const stat = fs.statSync(fullPath)
      // lproj is a directory — get recursive size
      const size = getDirSize(fullPath)
      fs.rmSync(fullPath, { recursive: true, force: true })
      removed++
      savedBytes += size
    } catch (e) {
      // ignore
    }
  }

  const savedMB = (savedBytes / 1024 / 1024).toFixed(1)
  console.log(`  afterPack: removed ${removed} unused locales, saved ~${savedMB} MB`)
}

function getDirSize(dirPath) {
  let total = 0
  try {
    for (const entry of fs.readdirSync(dirPath)) {
      const full = path.join(dirPath, entry)
      const st = fs.statSync(full)
      total += st.isDirectory() ? getDirSize(full) : st.size
    }
  } catch { /* ignore */ }
  return total
}
