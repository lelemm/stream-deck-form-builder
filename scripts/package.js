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
  const electronOutputDir = path.join(__dirname, '..', 'dist-electron')
  const pluginSourceDir = path.join(__dirname, '..', 'dist', pluginName)
  const outputPath = path.join(__dirname, '..', 'release', `${pluginName}.streamDeckPlugin`)

  // Ensure release directory exists
  await fs.ensureDir(path.join(__dirname, '..', 'release'))

  // Create the package
  const output = fs.createWriteStream(outputPath)
  const archive = archiver('zip', {
    zlib: { level: 9 }
  })

  output.on('close', () => {
    console.log(`Plugin packaged successfully: ${archive.pointer()} bytes`)
  })

  archive.on('error', (err) => {
    throw err
  })

  archive.pipe(output)

  // Add the plugin directory
  archive.directory(pluginSourceDir, pluginName)

  // Add the Electron executable if it exists
  if (await fs.pathExists(path.join(electronOutputDir, 'FormBuilder.exe'))) {
    archive.file(path.join(electronOutputDir, 'FormBuilder.exe'), {
      name: `${pluginName}/FormBuilder.exe`
    })
  }

  archive.finalize()
}

createPackage().catch(console.error)