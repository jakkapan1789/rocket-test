const { spawn } = require('child_process')
const waitOn = require('wait-on')
const electronPath = require('electron')

waitOn({ resources: ['http://localhost:5173'], timeout: 30000 })
  .then(() => {
    const child = spawn(electronPath, ['.'], {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'inherit',
    })
    child.on('exit', (code) => process.exit(code ?? 0))
  })
  .catch((err) => {
    console.error('Vite did not start in time:', err.message)
    process.exit(1)
  })
