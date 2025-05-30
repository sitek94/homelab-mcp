// MCP servers must not use console.log (stdout) for logging, as it breaks protocol communication.
// Use console.error (stderr) instead. See: https://modelcontextprotocol.io/llms-full.txt#logging

function debug(...args: unknown[]) {
  if (process.env.DEBUG === 'true') {
    console.error('[DEBUG]', ...args)
  }
}

function error(...args: unknown[]) {
  console.error('[ERROR]', ...args)
}

function info(...args: unknown[]) {
  console.error('[INFO]', ...args)
}

export const logger = {
  debug,
  error,
  info,
}
