import DHT from './index.js'
import crypto from 'crypto'

// Exact copy of examples/network.mjs logic, but single node
console.log('🏪 Creating SIMPLE storage node (exact copy of working example)...')

const node = new DHT({
  ephemeral: false,
  bootstrap: ['localhost:10001']
})

const INSERT = 0
const values = new Map()

node.on('request', function (req) {
  console.log('📨 Request received:', {
    command: req.command,
    hasToken: !!req.token,
    from: `${req.from.host}:${req.from.port}`
  })

  if (req.command === INSERT) {
    if (req.token) {
      const key = crypto.createHash('sha256').update(req.value).digest().toString('hex')
      values.set(key, req.value)
      console.log('💾 Storing', key.substring(0, 8) + '...', '-->', req.value.toString())
      return req.reply(null)  // Exact same as working example
    }
  }
  
  // For retrieval (GET command from examples/find.mjs)
  const value = values.get(req.target.toString('hex'))
  console.log('🔍 Retrieval request for', req.target.toString('hex').substring(0, 8) + '...')
  if (value) {
    console.log('📤 Found and serving:', value.toString())
  } else {
    console.log('❌ Not found')
  }
  req.reply(value)
})

node.on('ready', () => {
  console.log('✅ Simple storage node ready!')
  console.log('📍 Address:', node.address())
  console.log('📊 Known peers:', node.toArray().length)
})