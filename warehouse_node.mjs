import DHT from './index.js'
import crypto from 'crypto'

// Different storage commands for this warehouse node
const STORE_COMMAND = 100  // Different command number
const GET_COMMAND = 101
const LIST_COMMAND = 102   // New! Can list all stored items
const DELETE_COMMAND = 103 // New! Can delete items

console.log('🏭 Creating WAREHOUSE node (advanced storage)...')

const node = new DHT({
  ephemeral: false,
  bootstrap: ['localhost:10001']
})

// Advanced storage with metadata
const warehouse = new Map()
const metadata = new Map()

// Helper to track storage stats
let storageStats = {
  totalStored: 0,
  totalServed: 0,
  totalDeleted: 0,
  startTime: Date.now()
}

node.on('request', (req) => {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`📨 [${timestamp}] Request:`, {
    command: getCommandName(req.command),
    from: `${req.from.host}:${req.from.port}`,
    hasToken: !!req.token,
    target: req.target?.toString('hex').substring(0, 8) + '...'
  })

  // STORE command handling
  if (req.command === STORE_COMMAND) {
    if (req.token) {
      // Actually store the data
      const key = req.target.toString('hex')
      const value = req.value
      
      warehouse.set(key, value)
      metadata.set(key, {
        storedAt: Date.now(),
        storedBy: `${req.from.host}:${req.from.port}`,
        size: value.length,
        accessCount: 0
      })
      
      storageStats.totalStored++
      
      console.log(`🏭 WAREHOUSE STORED:`)
      console.log(`   Key: ${key.substring(0, 16)}...`)
      console.log(`   Value: "${value.toString()}"`)
      console.log(`   Size: ${value.length} bytes`)
      console.log(`   Total items: ${warehouse.size}`)
      
      req.reply(null) // Standard DHT response for successful storage
      return
    } else {
      // Query phase - let DHT handle token provision automatically
      console.log(`🔍 WAREHOUSE: Query phase for storage`)
    }
  }
  
  // GET command handling
  if (req.command === GET_COMMAND) {
    const key = req.target.toString('hex')
    const value = warehouse.get(key)
    
    if (value) {
      // Update metadata
      const meta = metadata.get(key)
      if (meta) {
        meta.accessCount++
        meta.lastAccess = Date.now()
      }
      
      storageStats.totalServed++
      
      console.log(`🚚 WAREHOUSE SERVED:`)
      console.log(`   Key: ${key.substring(0, 16)}...`)
      console.log(`   Value: "${value.toString()}"`)
      console.log(`   Value type: ${typeof value}`)
      console.log(`   Value constructor: ${value.constructor.name}`)
      console.log(`   Access count: ${meta?.accessCount || 0}`)
      
      req.reply(value)
      return
    } else {
      console.log(`❌ WAREHOUSE: Key not found: ${key.substring(0, 16)}...`)
      req.reply(null)
      return
    }
  }
  
  // LIST command handling
  if (req.command === LIST_COMMAND) {
    console.log(`📋 WAREHOUSE INVENTORY REQUEST`)
    
    const inventory = Array.from(warehouse.entries()).map(([key, value]) => {
      const meta = metadata.get(key) || {}
      return {
        key: key.substring(0, 16) + '...',
        preview: value.toString().substring(0, 30) + '...',
        size: value.length,
        stored: new Date(meta.storedAt).toLocaleString(),
        accessCount: meta.accessCount || 0
      }
    })
    
    const inventoryJson = JSON.stringify(inventory)
    console.log(`   Sending inventory of ${inventory.length} items`)
    console.log(`   Inventory JSON: ${inventoryJson.substring(0, 100)}...`)
    console.log(`   Inventory buffer length: ${Buffer.from(inventoryJson).length}`)
    
    req.reply(Buffer.from(inventoryJson))
    return
  }
  
  // DELETE command handling
  if (req.command === DELETE_COMMAND) {
    if (req.token) {
      // Actually delete the data
      const key = req.target.toString('hex')
      
      if (warehouse.has(key)) {
        const value = warehouse.get(key)
        warehouse.delete(key)
        metadata.delete(key)
        storageStats.totalDeleted++
        
        console.log(`🗑️  WAREHOUSE DELETED:`)
        console.log(`   Key: ${key.substring(0, 16)}...`)
        console.log(`   Was: "${value.toString()}"`)
        console.log(`   Replying with: "deleted"`)
        
        req.reply(Buffer.from('deleted'))
        return
      } else {
        console.log(`❌ WAREHOUSE: Cannot delete, key not found: ${key.substring(0, 16)}...`)
        req.reply(Buffer.from('not-found'))
        return
      }
    } else {
      // Query phase - let DHT handle token provision automatically
      console.log(`🔍 WAREHOUSE: Query phase for deletion`)
    }
  }
  
  // Default fallback - treat as GET request (standard DHT behavior)
  const value = warehouse.get(req.target.toString('hex'))
  req.reply(value)
})

node.on('ready', () => {
  console.log('🏭 WAREHOUSE NODE READY!')
  console.log('🆔 Warehouse ID:', node.id?.toString('hex').substring(0, 16) + '...')
  console.log('📍 Warehouse Address:', node.address())
  console.log('💾 Advanced storage capabilities:')
  console.log('   ✅ Store data with metadata')
  console.log('   ✅ Track access counts')
  console.log('   ✅ List inventory')  
  console.log('   ✅ Delete items')
  
  // Enhanced status updates every 30 seconds
  setInterval(() => {
    const uptime = Math.floor((Date.now() - storageStats.startTime) / 1000)
    console.log(`\n🏭 WAREHOUSE STATUS:`)
    console.log(`   📦 Items stored: ${warehouse.size}`)
    console.log(`   📊 Total stored: ${storageStats.totalStored}`)
    console.log(`   📤 Total served: ${storageStats.totalServed}`)
    console.log(`   🗑️  Total deleted: ${storageStats.totalDeleted}`)
    console.log(`   ⏱️  Uptime: ${uptime}s`)
    console.log(`   🌐 Known peers: ${node.toArray().length}`)
    
    if (warehouse.size > 0) {
      console.log(`   📋 Current inventory:`)
      for (const [key, value] of warehouse.entries()) {
        const meta = metadata.get(key) || {}
        console.log(`     • ${key.substring(0, 8)}... → "${value.toString().substring(0, 20)}..." (${meta.accessCount || 0} reads)`)
      }
    }
  }, 30000)
})

console.log('⏳ Warehouse connecting to network...')

function getCommandName(command) {
  switch(command) {
    case 100: return 'STORE'
    case 101: return 'GET'
    case 102: return 'LIST'
    case 103: return 'DELETE'
    default: return `UNKNOWN(${command})`
  }
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest()
}