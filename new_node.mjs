import DHT from './index.js'

console.log('🚀 Creating new node...')
console.log('📞 Will contact bootstrap at: localhost:10001')

const node = new DHT({
  ephemeral: false,
  bootstrap: ['localhost:10001']
})

// Watch different stages of the bootstrap process
node.on('listening', () => {
  console.log('👂 Node is now listening for connections')
  console.log('📍 Address:', node.address())
})

node.on('bootstrap', () => {
  console.log('🤝 Bootstrap process completed!')
})

node.on('ready', () => {
  console.log('✅ Node fully ready!')
  console.log('🆔 My unique ID:', node.id?.toString('hex').substring(0, 16) + '...')
  console.log('📊 I now know about', node.toArray().length, 'other nodes')
  console.log('🌐 Network peers:', node.toArray().map(p => `${p.host}:${p.port}`))
})

node.on('persistent', () => {
  console.log('🔒 Node is now persistent (not ephemeral anymore)')
})

// Keep the program running
console.log('⏳ Starting bootstrap process...')
console.log('Press Ctrl+C to exit')

// Optional: Show network activity
setTimeout(() => {
  console.log('\n📈 Network status after 5 seconds:')
  console.log('   Known peers:', node.toArray().length)
  console.log('   Am I persistent?', !node.ephemeral)
  console.log('   My routing table:', node.toArray())
}, 5000)