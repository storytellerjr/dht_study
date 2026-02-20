import DHT from './index.js'

console.log('🚀 Starting VERBOSE Bootstrap Node...')

const bootstrap = DHT.bootstrapper(10001, '127.0.0.1')

// Watch for incoming requests (when nodes contact us)
bootstrap.on('request', (req) => {
  console.log('📞 Incoming request from:', req.from)
  console.log('   Command:', req.command)
  console.log('   Target:', req.target?.toString('hex').substring(0, 16) + '...')
})

// Watch our routing table grow
bootstrap.on('listening', () => {
  console.log('👂 Bootstrap listening on port 10001')
  console.log('📍 Address:', bootstrap.address())
})

bootstrap.on('ready', async () => {
  console.log('✅ Bootstrap ready!')
  console.log('🆔 Bootstrap ID:', bootstrap.id?.toString('hex').substring(0, 16) + '...')
  
  // Show routing table status every 10 seconds
  setInterval(() => {
    const peers = bootstrap.toArray()
    console.log('\n📊 BOOTSTRAP ROUTING TABLE:')
    console.log('   Time:', new Date().toLocaleTimeString())
    console.log('   📋 Total known peers:', peers.length)
    console.log('   🌐 Peer addresses:', peers.map(p => `${p.host}:${p.port}`))
    
    // Show routing table internal structure (safely)
    try {
      if (bootstrap.table && bootstrap.table.buckets) {
        console.log('   📚 Routing table buckets:', bootstrap.table.buckets.length)
        console.log('   🪣 Nodes per bucket:', bootstrap.table.buckets.map(b => b.nodes.length))
      } else {
        console.log('   📚 Routing table: Internal structure not accessible')
      }
      console.log('   🎯 My node ID:', bootstrap.id?.toString('hex').substring(0, 8) + '...')
    } catch (err) {
      console.log('   📚 Routing table: Structure hidden (that\'s normal)')
    }
    
    console.log('   💡 This bootstrap is helping', peers.length, 'nodes find each other')
  }, 10000)
})

await bootstrap.fullyBootstrapped()
console.log('🌐 Bootstrap fully operational - ready to help nodes join!')
console.log('💡 Watch this terminal to see when new nodes contact me for help')