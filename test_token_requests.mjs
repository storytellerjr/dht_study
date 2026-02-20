import DHT from './index.js'
import crypto from 'crypto'

console.log('🔍 Testing TOKEN requests (commit phase simulation)...')
const client = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await client.fullyBootstrapped()

const testData = Buffer.from('Testing token requests')
const hash = crypto.createHash('sha256').update(testData).digest()

console.log('📝 Step 1: Finding closest nodes...')
const q = client.query({ target: hash, command: 0, value: testData })

const closestNodes = []
for await (const reply of q) {
  closestNodes.push(reply)
  console.log('📍 Found node:', reply.from.host + ':' + reply.from.port, 'token:', !!reply.token)
  if (closestNodes.length >= 5) break // Test with first 5 nodes
}

console.log('✅ Found', closestNodes.length, 'closest nodes')

console.log('📝 Step 2: Testing token requests to these nodes...')
let successfulCommits = 0

for (const reply of closestNodes) {
  if (reply.token) {
    try {
      console.log('🔐 Sending token request to:', reply.from.host + ':' + reply.from.port)
      
      const result = await client.request(
        { token: reply.token, target: hash, command: 0, value: testData },
        reply.from
      )
      
      console.log('✅ Token request successful!')
      successfulCommits++
    } catch (err) {
      console.log('❌ Token request failed:', err.message)
    }
  } else {
    console.log('⚠️  Node has no token:', reply.from.host + ':' + reply.from.port)
  }
}

console.log('📊 Results:')
console.log('  Found nodes:', closestNodes.length)
console.log('  Successful commits:', successfulCommits)
console.log('  Failed commits:', closestNodes.length - successfulCommits)

if (successfulCommits === 0) {
  console.log('🚨 PROBLEM: No successful commits! This explains the insert failure.')
} else if (successfulCommits < 3) {
  console.log('⚠️  LOW SUCCESS: Only', successfulCommits, 'commits. DHT might need more.')  
} else {
  console.log('🎉 GOOD: Multiple successful commits. Insert should work!')
}

process.exit(0)