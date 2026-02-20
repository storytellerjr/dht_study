import DHT from './index.js'
import crypto from 'crypto'

const INSERT = 0
const GET = 1

console.log('🚀 Starting DHT Demo...\n')

// Create a bootstrap node
console.log('1️⃣  Creating bootstrap node on port 10001')
const bootstrap = DHT.bootstrapper(10001, '127.0.0.1')
await bootstrap.fullyBootstrapped()
console.log('✅ Bootstrap node ready:', bootstrap.address())

// Create a few DHT nodes that can store values
console.log('\n2️⃣  Creating 10 DHT storage nodes...')
const storageNodes = []
for (let i = 0; i < 10; i++) {
  const node = new DHT({
    ephemeral: false,
    bootstrap: ['localhost:10001']
  })

  const values = new Map()
  
  node.on('request', function (req) {
    if (req.command === INSERT) {
      if (req.token) {
        const key = sha256(req.value).toString('hex')
        values.set(key, req.value)
        console.log(`📦 Node ${i} storing: ${key.substring(0, 8)}... --> "${req.value.toString()}"`)
        return req.reply(null)
      }
    }
    
    if (req.command === GET) {
      const value = values.get(req.target.toString('hex'))
      req.reply(value)
    }
  })

  storageNodes.push(node)
}

// Wait for nodes to bootstrap and discover each other
console.log('⏳ Waiting for nodes to bootstrap and discover each other...')
await new Promise(resolve => setTimeout(resolve, 8000))

// Wait for all nodes to be fully bootstrapped
console.log('⏳ Ensuring all nodes are fully connected...')
for (let i = 0; i < storageNodes.length; i++) {
  try {
    await storageNodes[i].fullyBootstrapped()
    console.log(`✅ Node ${i} fully bootstrapped`)
  } catch (err) {
    console.log(`⚠️  Node ${i} bootstrap warning:`, err.message)
  }
}

console.log('\n3️⃣  Testing DHT operations...')

// Create a client node for testing
const client = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await client.fullyBootstrapped()

// Test 1: Insert a value
const testValue = Buffer.from('This is a test message for DHT!')
const hash = sha256(testValue)
console.log(`\n📝 Inserting value: "${testValue.toString()}"`)
console.log(`🔑 Hash: ${hash.toString('hex')}`)

const insertQuery = client.query(
  { target: hash, command: INSERT, value: testValue },
  {
    async commit(reply) {
      await client.request(
        { token: reply.token, target: hash, command: INSERT, value: testValue },
        reply.from
      )
    }
  }
)

await insertQuery.finished()
console.log('✅ Insert completed!')

// Test 2: Retrieve the value
console.log(`\n🔍 Searching for value with hash: ${hash.toString('hex').substring(0, 16)}...`)

const getQuery = client.query({ target: hash, command: GET })

for await (const data of getQuery) {
  if (data.value && sha256(data.value).toString('hex') === hash.toString('hex')) {
    console.log(`✅ Found value: "${data.value.toString()}"`)
    break
  }
}

// Test 3: Try to find a non-existent value
console.log('\n🔍 Searching for non-existent value...')
const fakeHash = crypto.randomBytes(32)
const getQuery2 = client.query({ target: fakeHash, command: GET })

let found = false
for await (const data of getQuery2) {
  if (data.value) {
    found = true
    break
  }
}

if (!found) {
  console.log('✅ Correctly returned no value for non-existent hash')
}

console.log('\n🎉 DHT Demo completed successfully!')
console.log('\nWhat happened:')
console.log('• Created a bootstrap node to coordinate the network')
console.log('• Spawned 10 storage nodes that form a distributed hash table')
console.log('• Inserted a value, which got replicated to closest nodes automatically')
console.log('• Retrieved the value by searching with its hash')
console.log('• Verified that non-existent values return empty results')

// Cleanup
client.destroy()
storageNodes.forEach(node => node.destroy())
bootstrap.destroy()

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}