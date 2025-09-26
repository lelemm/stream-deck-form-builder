// Test worker creation to debug the crash
const { Worker } = require('worker_threads')
const path = require('path')

console.log('Testing worker creation...')

try {
  const worker = new Worker(path.join(__dirname, 'src', 'streamdeck-worker.js'))
  
  worker.on('message', (message) => {
    console.log('Test received message from worker:', message)
  })
  
  worker.on('error', (error) => {
    console.error('Test worker error:', error)
    console.error('Error stack:', error.stack)
  })
  
  worker.on('exit', (code) => {
    console.log('Test worker exited with code:', code)
  })
  
  console.log('Test worker created successfully')
  
  // Send test message
  worker.postMessage({
    type: 'test',
    data: 'hello'
  })
  
  setTimeout(() => {
    worker.terminate()
    console.log('Test complete')
  }, 2000)
  
} catch (error) {
  console.error('Failed to create test worker:', error)
  console.error('Error stack:', error.stack)
}