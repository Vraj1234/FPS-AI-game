import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const port = 4173
const viteProcess = spawn(
  'node',
  [
    '--experimental-global-webcrypto',
    './node_modules/vite/bin/vite.js',
    '--host',
    '0.0.0.0',
    '--port',
    String(port)
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
)

let output = ''
let isReady = false

viteProcess.stdout.on('data', (data) => {
  const text = data.toString()
  output += text
  if (text.includes('ready in')) {
    isReady = true
  }
})

viteProcess.stderr.on('data', (data) => {
  output += data.toString()
})

try {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (isReady) break
    await delay(250)
  }

  if (!isReady) {
    throw new Error(`Vite did not become ready. Output:\n${output}`)
  }

  const response = await fetch(`http://127.0.0.1:${port}/`)
  if (!response.ok) {
    throw new Error(`Unexpected response: ${response.status}`)
  }

  const body = await response.text()
  if (!body.includes('id="game"')) {
    throw new Error('Expected canvas with id="game" not found in HTML')
  }

  console.log('Smoke test passed: dev server responded with expected HTML.')
} finally {
  viteProcess.kill('SIGTERM')
}
