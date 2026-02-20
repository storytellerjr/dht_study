import DHT from './index.js'
import crypto from 'crypto'

// Warehouse command constants (matching warehouse_node.mjs)
const STORE_COMMAND = 100
const GET_COMMAND = 101
const LIST_COMMAND = 102
const DELETE_COMMAND = 103

console.log('🧪 Starting WAREHOUSE STORAGE TESTS...')
console.log('⏳ Bootstrapping test client...')

const client = new DHT({ ephemeral: true, bootstrap: ['localhost:10001'] })
await client.fullyBootstrapped()

console.log('✅ Test client bootstrapped!')

// Test data
const testItems = [
  { key: 'user123', value: 'John Doe' },
  { key: 'config', value: '{"theme":"dark","lang":"en"}' },
  { key: 'session', value: 'abc123xyz' },
  { key: 'document', value: 'Important business document content here...' }
]

let testsPassed = 0
let testsTotal = 0

// Helper function to run a test
async function runTest(name, testFunc) {
  testsTotal++
  console.log(`\n🔬 TEST ${testsTotal}: ${name}`)
  try {
    await testFunc()
    console.log(`✅ PASS: ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   Error: ${error.message}`)
  }
}

// Helper function to create hash target
function createTarget(data) {
  return crypto.createHash('sha256').update(data).digest()
}

// Helper function to find warehouse node
async function findWarehouseNode() {
  console.log('🔍 Finding warehouse node...')
  const testTarget = createTarget('test')
  const q = client.query({ target: testTarget, command: STORE_COMMAND })
  
  for await (const reply of q) {
    if (reply.token) {
      console.log(`🏭 Found warehouse at ${reply.from.host}:${reply.from.port}`)
      return reply.from
    }
  }
  throw new Error('No warehouse node found with token!')
}

// TEST 1: Store items in warehouse
await runTest('Store items in warehouse', async () => {
  const warehouseAddr = await findWarehouseNode()
  
  for (const item of testItems) {
    const target = createTarget(item.key)
    const value = Buffer.from(item.value)
    
    console.log(`   Storing: ${item.key} → ${item.value}`)
    
    // First get token
    const tokenQuery = client.query({ target, command: STORE_COMMAND })
    let token = null
    
    for await (const reply of tokenQuery) {
      if (reply.from.host === warehouseAddr.host && reply.from.port === warehouseAddr.port && reply.token) {
        token = reply.token
        break
      }
    }
    
    if (!token) throw new Error(`No token received for ${item.key}`)
    
    // Store with token
    const result = await client.request(
      { token, target, command: STORE_COMMAND, value },
      warehouseAddr
    )
    
    // Check DHT response object
    if (result.error !== 0) {
      throw new Error(`Store failed with DHT error: ${result.error}`)
    }
    
    // Successful storage should return null value
    if (result.value !== null) {
      throw new Error(`Expected null value for successful store, got: ${result.value}`)
    }
    
    console.log(`   ✓ Stored ${item.key}`)
  }
})

// TEST 2: Retrieve stored items
await runTest('Retrieve stored items', async () => {
  const warehouseAddr = await findWarehouseNode()
  
  for (const item of testItems) {
    const target = createTarget(item.key)
    
    console.log(`   Retrieving: ${item.key}`)
    
    const result = await client.request(
      { target, command: GET_COMMAND },
      warehouseAddr
    )
    
    if (result.error !== 0) {
      throw new Error(`Retrieve failed for ${item.key} with DHT error: ${result.error}`)
    }
    
    if (!result.value) throw new Error(`No value returned for ${item.key}`)
    
    const retrieved = result.value.toString()
    if (retrieved !== item.value) {
      throw new Error(`Value mismatch for ${item.key}: expected "${item.value}", got "${retrieved}"`)
    }
    
    console.log(`   ✓ Retrieved ${item.key}: ${retrieved}`)
  }
})

// TEST 3: List warehouse inventory
await runTest('List warehouse inventory', async () => {
  const warehouseAddr = await findWarehouseNode()
  
  console.log('   Requesting inventory...')
  
  const result = await client.request(
    { target: Buffer.alloc(32), command: LIST_COMMAND }, // dummy target
    warehouseAddr
  )
  
  if (result.error !== 0) {
    throw new Error(`List failed with DHT error: ${result.error}`)
  }
  
  if (!result.value) throw new Error('No inventory response')
  
  const inventory = JSON.parse(result.value.toString())
  console.log(`   Inventory has ${inventory.length} items:`)
  
  for (const item of inventory) {
    console.log(`     • ${item.key} → ${item.preview} (${item.size} bytes, ${item.accessCount} accesses)`)
  }
  
  if (inventory.length < testItems.length) {
    throw new Error(`Expected at least ${testItems.length} items, got ${inventory.length}`)
  }
})

// TEST 4: Access tracking (retrieve again to increment counters)
await runTest('Access tracking', async () => {
  const warehouseAddr = await findWarehouseNode()
  const testItem = testItems[0] // Use first item
  const target = createTarget(testItem.key)
  
  // Retrieve the same item multiple times
  for (let i = 0; i < 3; i++) {
    console.log(`   Access ${i + 1}/3 for ${testItem.key}`)
    
    const result = await client.request(
      { target, command: GET_COMMAND },
      warehouseAddr
    )
    
    if (result.error !== 0 || !result.value || result.value.toString() !== testItem.value) {
      throw new Error(`Failed access ${i + 1}: error=${result.error}, value=${result.value}`)
    }
  }
  
  // Check inventory to see if access count increased
  const inventoryResult = await client.request(
    { target: Buffer.alloc(32), command: LIST_COMMAND },
    warehouseAddr
  )
  
  if (inventoryResult.error !== 0 || !inventoryResult.value) {
    throw new Error(`Could not get inventory for access tracking: error=${inventoryResult.error}`)
  }
  
  const inventory = JSON.parse(inventoryResult.value.toString())
  const trackedItem = inventory.find(item => item.preview.includes(testItem.value.substring(0, 10)))
  
  if (!trackedItem) {
    throw new Error('Could not find tracked item in inventory')
  }
  
  console.log(`   Access count for ${testItem.key}: ${trackedItem.accessCount}`)
  
  if (trackedItem.accessCount < 4) { // 1 from previous test + 3 from this test
    throw new Error(`Expected access count >= 4, got ${trackedItem.accessCount}`)
  }
})

// TEST 5: Delete items
await runTest('Delete items', async () => {
  const warehouseAddr = await findWarehouseNode()
  const itemToDelete = testItems[testItems.length - 1] // Delete last item
  const target = createTarget(itemToDelete.key)
  
  console.log(`   Deleting: ${itemToDelete.key}`)
  
  // Get token for delete
  const tokenQuery = client.query({ target, command: DELETE_COMMAND })
  let token = null
  
  for await (const reply of tokenQuery) {
    if (reply.from.host === warehouseAddr.host && reply.from.port === warehouseAddr.port && reply.token) {
      token = reply.token
      break
    }
  }
  
  if (!token) throw new Error(`No token received for delete`)
  
  // Delete with token
  const result = await client.request(
    { token, target, command: DELETE_COMMAND },
    warehouseAddr
  )
  
  if (result.error !== 0) {
    throw new Error(`Delete failed with DHT error: ${result.error}`)
  }
  
  const resultStr = result.value ? result.value.toString() : 'null'
  if (resultStr !== 'deleted') {
    throw new Error(`Unexpected delete response: ${resultStr}`)
  }
  
  console.log(`   ✓ Deleted ${itemToDelete.key}`)
  
  // Verify it's gone
  const getResult = await client.request(
    { target, command: GET_COMMAND },
    warehouseAddr
  )
  
  if (getResult.error === 0 && getResult.value) {
    throw new Error(`Item still exists after deletion: ${getResult.value.toString()}`)
  }
  
  console.log(`   ✓ Confirmed deletion`)
})

// TEST 6: Error handling - get non-existent item
await runTest('Error handling - non-existent item', async () => {
  const warehouseAddr = await findWarehouseNode()
  const fakeTarget = createTarget('non-existent-key')
  
  console.log('   Trying to retrieve non-existent item...')
  
  const result = await client.request(
    { target: fakeTarget, command: GET_COMMAND },
    warehouseAddr
  )
  
  if (result.error !== 0) {
    throw new Error(`Unexpected error for non-existent item: ${result.error}`)
  }
  
  if (result.value !== null) {
    throw new Error(`Expected null for non-existent item, got: ${result.value}`)
  }
  
  console.log('   ✓ Correctly returned null for non-existent item')
})

// TEST 7: Error handling - delete non-existent item
await runTest('Error handling - delete non-existent item', async () => {
  const warehouseAddr = await findWarehouseNode()
  const fakeTarget = createTarget('another-non-existent-key')
  
  console.log('   Trying to delete non-existent item...')
  
  // Get token for delete
  const tokenQuery = client.query({ target: fakeTarget, command: DELETE_COMMAND })
  let token = null
  
  for await (const reply of tokenQuery) {
    if (reply.from.host === warehouseAddr.host && reply.from.port === warehouseAddr.port && reply.token) {
      token = reply.token
      break
    }
  }
  
  if (!token) throw new Error(`No token received for delete`)
  
  const result = await client.request(
    { token, target: fakeTarget, command: DELETE_COMMAND },
    warehouseAddr
  )
  
  if (result.error !== 0) {
    throw new Error(`Delete non-existent failed with DHT error: ${result.error}`)
  }
  
  const resultStr = result.value ? result.value.toString() : 'null'
  if (resultStr !== 'not-found') {
    throw new Error(`Expected 'not-found', got: ${resultStr}`)
  }
  
  console.log('   ✓ Correctly returned not-found for non-existent item')
})

// FINAL RESULTS
console.log('\n' + '='.repeat(50))
console.log('🧪 WAREHOUSE STORAGE TEST RESULTS')
console.log('='.repeat(50))
console.log(`✅ Passed: ${testsPassed}/${testsTotal}`)
console.log(`❌ Failed: ${testsTotal - testsPassed}/${testsTotal}`)

if (testsPassed === testsTotal) {
  console.log('🎉 ALL TESTS PASSED! Warehouse storage is working correctly!')
} else {
  console.log('⚠️  Some tests failed. Check the warehouse node implementation.')
}

console.log('\n🔍 Final warehouse inventory:')
try {
  const warehouseAddr = await findWarehouseNode()
  const inventoryResult = await client.request(
    { target: Buffer.alloc(32), command: LIST_COMMAND },
    warehouseAddr
  )
  
  if (inventoryResult.error !== 0 || !inventoryResult.value) {
    console.log('   ❌ Could not retrieve final inventory: error=' + inventoryResult.error)
  } else {
    const inventory = JSON.parse(inventoryResult.value.toString())
    if (inventory.length === 0) {
      console.log('   📦 Warehouse is empty')
    } else {
      console.log(`   📦 ${inventory.length} items remaining:`)
      for (const item of inventory) {
        console.log(`     • ${item.key} → ${item.preview} (${item.accessCount} accesses)`)
      }
    }
  }
} catch (err) {
  console.log('   ❌ Could not retrieve final inventory:', err.message)
}

process.exit(testsPassed === testsTotal ? 0 : 1)