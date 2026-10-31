import { spawn } from 'node:child_process'

const children = ['frontend', 'backend'].map((workspace) =>
  spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    env: process.env,
  }),
)
let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
  process.exitCode = code
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop())
for (const child of children) {
  child.on('error', (error) => { console.error(error); stop(1) })
  child.on('exit', (code) => stop(code ?? 1))
}
