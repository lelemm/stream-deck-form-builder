import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to load archiver, install if not available
let archiver
try {
  archiver = (await import('archiver')).default
} catch (err) {
  console.log('Archiver not found, installing...')
  const { execSync } = await import('child_process')
  execSync('npm install archiver', { stdio: 'inherit' })
  archiver = (await import('archiver')).default
}

async function createPackage() {
  const pluginName = 'com.leandro-menezes.formbuilder.sdPlugin'
  const distDir = path.join(__dirname, '..', 'dist')
  const outputPath = path.join(__dirname, '..', 'release', `${pluginName}.streamDeckPlugin`)

  // Ensure release directory exists
  await fs.ensureDir(path.join(__dirname, '..', 'release'))

  // Check if the dist directory exists
  if (!await fs.pathExists(distDir)) {
    throw new Error(`Dist directory not found: ${distDir}`)
  }

  // Create the package
  const output = fs.createWriteStream(outputPath)
  const archive = archiver('zip', {
    zlib: { level: 9 }
  })

  output.on('close', () => {
    console.log(`Plugin packaged successfully: ${archive.pointer()} bytes`)
    console.log(`Package location: ${outputPath}`)
  })

  archive.on('error', (err) => {
    throw err
  })

  archive.pipe(output)

  // Add all files from dist directory to the plugin directory
  archive.directory(distDir, pluginName)

  archive.finalize()
}

createPackage().catch(console.error)