import DHT from './index.js'
import crypto from 'crypto'
import fs from 'fs'

const INSERT = 0

// Check if JSON file path is provided
if (process.argv.length < 3) {
  console.error('Usage: node insert_json.mjs <json-file-path>')
  process.exit(1)
}

const jsonFilePath = process.argv[2]

// Read and parse JSON file
let jsonData
try {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
  jsonData = JSON.parse(fileContent) // Validate it's valid JSON
  console.log('JSON file loaded successfully')
} catch (error) {
  console.error('Error reading or parsing JSON file:', error.message)
  process.exit(1)
}

// Convert JSON to Buffer
const jsonBuffer = Buffer.from(JSON.stringify(jsonData))
const hash = sha256(jsonBuffer)

console.log('JSON data size:', jsonBuffer.length, 'bytes')
console.log('Hash:', hash.toString('hex'))

// Set ephemeral: true as we are not part of the network.
const node = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })

// CRITICAL: Wait for node to fully bootstrap before querying
await node.fullyBootstrapped()
console.log('Node bootstrapped, starting insert...')

const q = node.query({ target: hash, command: INSERT }, { commit })
await q.finished()

console.log('JSON inserted successfully!')
console.log('Hash to retrieve:', hash.toString('hex'))
console.log('Use: node retrieve_json.mjs', hash.toString('hex'))

process.exit(0)

async function commit(reply) {
  await node.request(
    { token: reply.token, target: hash, command: INSERT, value: jsonBuffer },
    reply.from
  )
}

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}