import DHT from './index.js'
import crypto from 'crypto'

// Define our storage commands (matching examples)
const INSERT = 0  // Same as examples/insert.mjs
const GET = 1     // For retrieval

console.log('🏪 Creating storage-enabled node...')

const node = new DHT({
  ephemeral: false,
  bootstrap: ['localhost:10001']
})

// This is our "filing cabinet" - stores key-value pairs
const storage = new Map()

// Listen for storage requests from other nodes
node.on('request', (req) => {
  console.log('📨 Incoming request:', {
    command: req.command,
    from: `${req.from.host}:${req.from.port}`,
    hasToken: !!req.token
  })

  if (req.command === INSERT && req.token) {
    // STORE DATA: Someone wants to store data on our node
    const key = req.target.toString('hex')
    const value = req.value
    
    storage.set(key, value)
    console.log(`💾 STORED: ${key.substring(0, 8)}... → "${value.toString()}"`)
    console.log(`📊 Total items stored: ${storage.size}`)
    
    // Reply with null (like the working example)
    return req.reply(null)
    
  } else if (req.command === GET) {
    // GET DATA: Someone wants to retrieve data from our node
    const key = req.target.toString('hex')
    const value = storage.get(key)
    
    if (value) {
      console.log(`📤 SERVED: ${key.substring(0, 8)}... → "${value.toString()}"`)
      req.reply(value)
    } else {
      console.log(`❌ NOT FOUND: ${key.substring(0, 8)}...`)
      req.reply(null)
    }
    
  } else {
    // Unknown command
    console.log(`❓ Unknown command: ${req.command}`)
    req.error(1)
  }
})

node.on('ready', () => {
  console.log('✅ Storage node ready!')
  console.log('🆔 Node ID:', node.id?.toString('hex').substring(0, 16) + '...')
  console.log('📍 Address:', node.address())
  console.log('💾 Ready to store and serve data!')
  
  // Show storage status every 30 seconds
  setInterval(() => {
    console.log(`\n📊 STORAGE STATUS:`)
    console.log(`   Items stored: ${storage.size}`)
    console.log(`   Known peers: ${node.toArray().length}`)
    if (storage.size > 0) {
      console.log(`   Stored keys:`, Array.from(storage.keys()).map(k => k.substring(0, 8) + '...'))
    }
  }, 30000)
})

console.log('⏳ Connecting to network...')

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest()
}