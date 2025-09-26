import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function copyAssets() {
  const sourceDir = path.join(__dirname, '..', 'src')
  const destDir = path.join(__dirname, '..', 'dist')

  // Ensure destination directory exists
  await fs.ensureDir(destDir)

  // Copy HTML files
  await fs.copy(path.join(sourceDir, 'app.html'), path.join(destDir, 'app.html'))
  await fs.copy(path.join(sourceDir, 'pi.html'), path.join(destDir, 'pi.html'))
  await fs.copy(path.join(sourceDir, 'setup.html'), path.join(destDir, 'setup.html'))
  await fs.copy(path.join(sourceDir, 'form.html'), path.join(destDir, 'form.html'))
  await fs.copy(path.join(sourceDir, 'debug-logs.html'), path.join(destDir, 'debug-logs.html'))

  // Copy manifest.json
  await fs.copy(path.join(sourceDir, 'manifest.json'), path.join(destDir, 'manifest.json'))

  // Copy assets
  await fs.copy(path.join(sourceDir, 'assets'), path.join(destDir, 'assets'))

  // Copy CSS
  await fs.copy(path.join(sourceDir, 'css'), path.join(destDir, 'css'))

  // Copy components (UI components for React)
  await fs.copy(path.join(sourceDir, 'components'), path.join(destDir, 'components'))

  // Copy lib (utility functions)
  await fs.copy(path.join(sourceDir, 'lib'), path.join(destDir, 'lib'))

  // Other JS files are already built by Vite directly to the correct location
  // dist/com.leandro-menezes.formbuilder.sdPlugin/js/ - no copying needed

  // Copy Electron files
  await fs.copy(path.join(sourceDir, 'FormBuilder.exe.cjs'), path.join(destDir, 'FormBuilder.exe.cjs'))
  await fs.copy(path.join(sourceDir, 'preload.js'), path.join(destDir, 'preload.js'))

  console.log('Assets copied successfully!')
}

copyAssets().catch(console.error)