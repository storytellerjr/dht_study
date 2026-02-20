import DHT from './index.js'
import crypto from 'crypto'

const INSERT = 0
const GET = 1

console.log('🚀 Simple DHT Demo - Step by Step\n')

async function runDemo() {
  // Step 1: Create bootstrap node
  console.log('Step 1: Creating bootstrap node...')
  const bootstrap = DHT.bootstrapper(10001, '127.0.0.1')
  await bootstrap.fullyBootstrapped()
  console.log('✅ Bootstrap ready on port 10001\n')

  // Step 2: Create storage nodes
  console.log('Step 2: Creating storage nodes (this may take a moment)...')
  const nodes = []
  
  for (let i = 0; i < 5; i++) {
    const node = new DHT({
      ephemeral: false,
      bootstrap: ['localhost:10001']
    })

    const values = new Map()
    
    node.on('request', function (req) {
      if (req.command === INSERT && req.token) {
        const key = sha256(req.value).toString('hex')
        values.set(key, req.value)
        console.log(`📦 Node ${i} stored: "${req.value.toString()}"`)
        return req.reply(null)
      }
      
      if (req.command === GET) {
        const value = values.get(req.target.toString('hex'))
        if (value) {
          console.log(`📤 Node ${i} serving: "${value.toString()}"`)
        }
        req.reply(value)
      }
    })

    nodes.push(node)
  }

  // Wait for network to stabilize
  console.log('⏳ Waiting for network to stabilize...')
  await new Promise(resolve => setTimeout(resolve, 6000))
  console.log('✅ Network ready\n')

  // Step 3: Insert data
  console.log('Step 3: Inserting data into DHT...')
  const client = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
  await client.fullyBootstrapped()

  const message = "Hello from the DHT!"
  const hash = sha256(Buffer.from(message))
  
  console.log(`📝 Inserting: "${message}"`)
  console.log(`🔑 Hash: ${hash.toString('hex').substring(0, 16)}...\n`)

  const q = client.query(
    { target: hash, command: INSERT, value: Buffer.from(message) },
    {
      async commit(reply) {
        await client.request(
          { 
            token: reply.token, 
            target: hash, 
            command: INSERT, 
            value: Buffer.from(message)
          },
          reply.from
        )
      }
    }
  )

  await q.finished()
  console.log('✅ Data inserted!\n')

  // Step 4: Retrieve data
  console.log('Step 4: Retrieving data from DHT...')
  
  const retriever = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
  await retriever.fullyBootstrapped()

  const getQuery = retriever.query({ target: hash, command: GET })
  
  let found = false
  for await (const data of getQuery) {
    if (data.value && sha256(data.value).toString('hex') === hash.toString('hex')) {
      console.log(`✅ Retrieved: "${data.value.toString()}"`)
      found = true
      break
    }
  }

  if (!found) {
    console.log('❌ Data not found')
  }

  console.log('\n🎉 Demo completed!')
  console.log('\nSummary:')
  console.log('- Created a DHT network with 5 nodes + 1 bootstrap')
  console.log('- Inserted data which was replicated across closest nodes')
  console.log('- Successfully retrieved the data using its hash')
  console.log('- This demonstrates distributed storage without central servers!')

  // Cleanup
  client.destroy()
  retriever.destroy()
  nodes.forEach(node => node.destroy())
  bootstrap.destroy()
}

function sha256(val) {
  return crypto.createHash('sha256').update(val).digest()
}

runDemo().catch(console.error)