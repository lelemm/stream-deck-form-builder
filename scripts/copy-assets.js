import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Plugin folder name (same as in vite.config.js)
const pluginFolderName = 'com.leandro-menezes.formbuilder.sdPlugin'

async function copyAssets() {
  const sourceDir = path.join(__dirname, '..', 'src')
  const destDir = path.join(__dirname, '..', 'dist', 'com.leandro-menezes.formbuilder.sdPlugin')

  // Ensure destination directory exists
  await fs.ensureDir(destDir)

  // Copy HTML files
  await fs.copy(path.join(sourceDir, 'app.html'), path.join(destDir, 'app.html'))
  await fs.copy(path.join(sourceDir, 'pi.html'), path.join(destDir, 'pi.html'))
  await fs.copy(path.join(sourceDir, 'setup.html'), path.join(destDir, 'setup.html'))
  await fs.copy(path.join(sourceDir, 'form.html'), path.join(destDir, 'form.html'))

  // Copy manifest.json
  await fs.copy(path.join(sourceDir, 'manifest.json'), path.join(destDir, 'manifest.json'))

  // Copy assets
  await fs.copy(path.join(sourceDir, 'assets'), path.join(destDir, 'assets'))

  // Copy CSS
  await fs.copy(path.join(sourceDir, 'css'), path.join(destDir, 'css'))

  // Copy chunk JS files from dist/assets to plugin js directory
  const buildAssetsDir = path.join(__dirname, '..', 'dist', 'assets')
  
  if (await fs.pathExists(buildAssetsDir)) {
    const files = await fs.readdir(buildAssetsDir)
    for (const file of files) {
      if (file.endsWith('.js')) {
        await fs.copy(
          path.join(buildAssetsDir, file), 
          path.join(destDir, 'js', file)
        )
        console.log(`Copied chunk: ${file}`)
      }
    }
  }

  // Copy Electron files
  await fs.copy(path.join(sourceDir, 'FormBuilder.exe.cjs'), path.join(destDir, 'FormBuilder.exe.cjs'))
  await fs.copy(path.join(sourceDir, 'preload.js'), path.join(destDir, 'preload.js'))

  console.log('Assets copied successfully!')
}

copyAssets().catch(console.error)