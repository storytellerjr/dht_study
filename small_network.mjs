import DHT from './index.js'
import crypto from 'crypto'

const INSERT = 0

console.log('🏪 Creating small network (10 nodes)...')

// Let's create only 10 dht nodes for faster startup
const swarm = []
for (let i = 0; i < 10; i++) {
  console.log(`Starting node ${i + 1}/10...`)
  swarm[i] = createNode(i)
}

console.log('✅ All 10 storage nodes started!')
console.log('⏳ Waiting for network to stabilize...')

function createNode(id) {
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
        console.log(`📦 Node ${id} storing:`, key.substring(0, 8) + '...', '-->', req.value.toString())
        return req.reply(null)
      }
    }
    const value = values.get(req.target.toString('hex'))
    if (value) {
      console.log(`📤 Node ${id} serving:`, req.target.toString('hex').substring(0, 8) + '...')
    }
    req.reply(value)
  })

  node.on('ready', () => {
    console.log(`✅ Storage node ${id} ready!`)
  })

  return node
}

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}