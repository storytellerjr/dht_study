import DHT from './index.js'
import crypto from 'crypto'

console.log('🔍 Testing storage WITHOUT commit...')
const client = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await client.fullyBootstrapped()

const testData = Buffer.from('Test without commit')
const hash = crypto.createHash('sha256').update(testData).digest()

console.log('📝 Trying query without commit...')
const q = client.query({ target: hash, command: 0, value: testData })

let responses = 0
for await (const data of q) {
  responses++
  console.log('📨 Response:', responses, 'from:', data.from.host + ':' + data.from.port)
}

console.log('✅ Query completed with', responses, 'responses')
console.log('🔍 Now checking if any nodes actually stored it...')

// Try to retrieve
const getQuery = client.query({ target: hash, command: 0 })
let found = false
for await (const data of getQuery) {
  if (data.value) {
    console.log('📤 Found stored data:', data.value.toString())
    found = true
    break
  }
}

if (!found) {
  console.log('❌ No data stored (expected - no commit)')
} else {
  console.log('🎉 Data was stored even without commit!')
}

console.log('🔍 This tells us if the issue is with commit phase or basic storage')
process.exit(0)