import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// This script will be enhanced to generate manifest.json from React components
// For now, it just copies the template
async function generateManifest() {
  const sourceManifest = path.join(__dirname, '..', 'src', 'manifest.json')
  const destManifest = path.join(__dirname, '..', 'dist', 'com.leandro-menezes.formbuilder.sdPlugin', 'manifest.json')

  // Ensure destination directory exists
  await fs.ensureDir(path.dirname(destManifest))

  // Copy manifest
  await fs.copy(sourceManifest, destManifest)

  console.log('Manifest generated successfully!')
}

generateManifest().catch(console.error)