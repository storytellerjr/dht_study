import DHT from './index.js'
import crypto from 'crypto'

const INSERT = 0

console.log('🔍 DEBUGGING: Exact copy of examples/insert.mjs with logging...')

// EXACT same setup as examples/insert.mjs
const node = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
const val = Buffer.from('My network is finally working!')

console.log('📝 Value:', val.toString())
console.log('🔑 Target hash:', sha256(val).toString('hex'))

console.log('⏳ Waiting for node to bootstrap...')
await node.fullyBootstrapped()
console.log('✅ Node bootstrapped, known peers:', node.toArray().length)

console.log('📝 Starting query with commit function...')

async function commit(reply) {
  console.log('🔐 Commit called for:', reply.from.host + ':' + reply.from.port)
  console.log('   Token present:', !!reply.token)
  
  try {
    await node.request(
      { token: reply.token, target: sha256(val), command: INSERT, value: val },
      reply.from
    )
    console.log('✅ Commit successful for:', reply.from.host + ':' + reply.from.port)
  } catch (err) {
    console.log('❌ Commit failed for:', reply.from.host + ':' + reply.from.port, err.message)
    throw err
  }
}

try {
  console.log('🚀 Creating query...')
  const q = node.query({ target: sha256(val), command: INSERT }, { commit })
  
  console.log('⏳ Waiting for query to finish...')
  await q.finished()
  
  console.log('✅ SUCCESS! Inserted', sha256(val).toString('hex'))
} catch (err) {
  console.log('❌ FAILED:', err.message)
  console.log('🔍 Error occurred in:', err.stack.split('\n')[1])
}

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}

process.exit(0)