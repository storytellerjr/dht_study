import DHT from './index.js'

console.log('🆕 Starting completely fresh node...')
console.log('📞 Attempting to contact bootstrap at localhost:10001')

const node = new DHT({
  ephemeral: false,
  bootstrap: ['localhost:10001']
})

node.on('listening', () => {
  console.log('👂 Node listening on:', node.address())
})

node.on('ready', () => {
  console.log('✅ SUCCESS! Node connected to network!')
  console.log('🆔 Node ID:', node.id?.toString('hex').substring(0, 16) + '...')
  console.log('📊 Known peers:', node.toArray().length)
})

node.on('bootstrap', () => {
  console.log('🤝 Bootstrap connection established!')
})

// Add error handling
node.on('error', (err) => {
  console.log('❌ Node error:', err.message)
})

setTimeout(() => {
  console.log('⏰ After 10 seconds:')
  console.log('   Node ready?', node.ready)
  console.log('   Known peers:', node.toArray().length)
}, 10000)