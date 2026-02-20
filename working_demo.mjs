import DHT from './index.js'
import crypto from 'crypto'

const STORE_COMMAND = 100
const GET_COMMAND = 101

console.log('🚀 DHT-RPC Working Demo\n')

async function createDHT(opts = {}) {
  return new DHT({ host: '127.0.0.1', ...opts })
}

async function runDemo() {
  try {
    // Create first node (acts as bootstrap)
    console.log('1️⃣  Creating bootstrap node...')
    const bootstrap = await createDHT({ ephemeral: false, firewalled: false })
    await bootstrap.fullyBootstrapped()
    console.log(`✅ Bootstrap ready on port ${bootstrap.address().port}`)
    
    const bootstrapAddr = `localhost:${bootstrap.address().port}`
    
    // Create storage nodes
    console.log('\n2️⃣  Creating storage nodes...')
    const storageNodes = []
    
    for (let i = 0; i < 5; i++) {
      const node = await createDHT({ 
        ephemeral: false, 
        firewalled: false,
        bootstrap: [bootstrapAddr] 
      })
      
      await node.fullyBootstrapped()
      console.log(`✅ Storage node ${i} ready on port ${node.address().port}`)
      
      // Set up request handling for this storage node
      const storage = new Map()
      
      node.on('request', (req) => {
        if (req.command === STORE_COMMAND && req.token) {
          // Store the value
          const key = req.target.toString('hex')
          storage.set(key, req.value)
          console.log(`📦 Node ${i} stored data for key ${key.substring(0, 8)}...`)
          req.reply(Buffer.from('stored'))
        } else if (req.command === GET_COMMAND) {
          // Retrieve the value
          const key = req.target.toString('hex')
          const value = storage.get(key)
          if (value) {
            console.log(`📤 Node ${i} serving data for key ${key.substring(0, 8)}...`)
          }
          req.reply(value || null)
        } else {
          req.error(1) // Unknown command
        }
      })
      
      storageNodes.push(node)
    }
    
    console.log('\n3️⃣  Testing DHT operations...')
    
    // Create client for testing
    const client = await createDHT({ 
      ephemeral: true, 
      bootstrap: [bootstrapAddr] 
    })
    await client.fullyBootstrapped()
    
    // Test data
    const testData = Buffer.from('Hello, Distributed Hash Table! 🌐')
    const hash = crypto.createHash('sha256').update(testData).digest()
    
    console.log(`\n📝 Storing data: "${testData.toString()}"`)
    console.log(`🔑 Target hash: ${hash.toString('hex').substring(0, 16)}...`)
    
    // Store the data
    const storeQuery = client.query(
      { target: hash, command: STORE_COMMAND, value: testData },
      {
        commit: true,
        async commit(reply) {
          await client.request(
            { 
              token: reply.token, 
              target: hash, 
              command: STORE_COMMAND, 
              value: testData 
            },
            reply.from
          )
        }
      }
    )
    
    await storeQuery.finished()
    console.log('✅ Data stored successfully!')
    
    // Retrieve the data
    console.log(`\n🔍 Retrieving data for hash ${hash.toString('hex').substring(0, 16)}...`)
    
    const getQuery = client.query({ target: hash, command: GET_COMMAND })
    
    for await (const response of getQuery) {
      if (response.value && response.value.length > 0) {
        console.log(`✅ Found data: "${response.value.toString()}"`)
        if (response.value.equals(testData)) {
          console.log('🎯 Data integrity verified!')
        }
        break
      }
    }
    
    console.log('\n🎉 Demo completed successfully!')
    
    console.log('\n📊 DHT Network Summary:')
    console.log(`• Bootstrap node: ${bootstrap.address().port}`)
    storageNodes.forEach((node, i) => {
      console.log(`• Storage node ${i}: ${node.address().port}`)
    })
    console.log(`• Client node: ${client.address().port}`)
    
    console.log('\n💡 How it works:')
    console.log('• Data is hashed to create a consistent key')
    console.log('• DHT routes to nodes closest to that hash')
    console.log('• Multiple nodes store copies for redundancy')
    console.log('• Retrieval finds any node with the data')
    
    // Cleanup
    await client.destroy()
    for (const node of storageNodes) {
      await node.destroy()
    }
    await bootstrap.destroy()
    
    console.log('\n✨ All nodes cleaned up!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message)
    throw error
  }
}

runDemo().catch(console.error)