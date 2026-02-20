import DHT from './index.js'
import crypto from 'crypto'

console.log('🔍 Testing with simple { commit: true }...')
const node = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await node.fullyBootstrapped()

const val = Buffer.from('Testing simple commit')
const target = crypto.createHash('sha256').update(val).digest()

console.log('📝 Trying with { commit: true }...')

try {
  const q = node.query(
    { target, command: 0, value: val }, 
    { commit: true }  // Use simple commit instead of custom function
  )
  
  await q.finished()
  console.log('✅ SUCCESS! Inserted with simple commit')
  console.log('🔑 Hash:', target.toString('hex'))
  
} catch (err) {
  console.log('❌ FAILED with simple commit:', err.message)
}

console.log('📝 Now trying with original commit function...')

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}

async function commit(reply) {
  console.log('🔐 Custom commit called for:', reply.from.host + ':' + reply.from.port)
  await node.request(
    { token: reply.token, target, command: 0, value: val },
    reply.from
  )
  console.log('✅ Custom commit successful for this node')
}

try {
  const q2 = node.query(
    { target, command: 0, value: val }, 
    { commit }  // Use custom commit function like insert.mjs
  )
  
  await q2.finished()
  console.log('✅ SUCCESS! Inserted with custom commit function')
  
} catch (err) {
  console.log('❌ FAILED with custom commit function:', err.message)
  console.log('🔍 This might be the issue with insert.mjs')
}

process.exit(0)