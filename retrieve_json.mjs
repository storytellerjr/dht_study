import DHT from './index.js'
import crypto from 'crypto'
import fs from 'fs'

const GET = 1

// Check if hash is provided
if (process.argv.length < 3) {
  console.error('Usage: node retrieve_json.mjs <hash-hex>')
  process.exit(1)
}

const hex = process.argv[2]
const outputFile = process.argv[3] // Optional output file

console.log('Searching for hash:', hex)

const node = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await node.fullyBootstrapped()
console.log('Node bootstrapped, starting search...')

const q = node.query({ target: Buffer.from(hex, 'hex'), command: GET }, { commit: true })

let found = false
for await (const data of q) {
  if (data.value && sha256(data.value).toString('hex') === hex) {
    console.log('JSON data found!')
    console.log('Data size:', data.value.length, 'bytes')
    
    try {
      // Parse the JSON
      const jsonString = data.value.toString()
      const jsonData = JSON.parse(jsonString)
      
      console.log('JSON content:')
      console.log(JSON.stringify(jsonData, null, 2))
      
      // Optionally save to file
      if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
        console.log('JSON saved to:', outputFile)
      }
      
      found = true
      break
    } catch (error) {
      console.error('Error parsing retrieved data as JSON:', error.message)
      console.log('Raw data:', data.value.toString())
    }
  }
}

if (!found) {
  console.log('JSON data not found in the DHT')
}

console.log('(query finished)')
process.exit(0)

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}