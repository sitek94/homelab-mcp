import {NodeSSH, type SSHExecCommandResponse} from 'node-ssh'
import {logger} from './logger'
import {z} from 'zod'

export const EnvSchema = z.object({
  VPS_HOST: z.string(),
  VPS_PORT: z.string(),
  VPS_USERNAME: z.string(),
  VPS_PRIVATE_KEY_PATH: z.string(),
  HOMELAB_DIR: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string(),
  POSTGRES_DATABASE: z.string(),
  POSTGRES_SCHEMA_PATH: z.string(),
})

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof EnvSchema> {}
  }
}

async function getSSH() {
  const ssh = new NodeSSH()
  await ssh.connect({
    host: process.env.VPS_HOST,
    port: process.env.VPS_PORT,
    username: process.env.VPS_USERNAME,
    privateKeyPath: process.env.VPS_PRIVATE_KEY_PATH,
  })
  return ssh
}

export async function execCommand(command: string) {
  const ssh = await getSSH()

  const result = await ssh.execCommand(command, {
    cwd: process.env.HOMELAB_DIR,
  })

  ssh.dispose()

  let output = ''
  if (result.stdout) {
    logger.info('Command stdout:', result.stdout)
    output += result.stdout
  }

  if (result.stderr) {
    if (result.code !== 0) {
      logger.error('Command stderr:', result.stderr)
    }
    // If result.code === 0, stderr is treated as a warning / additional info
    logger.info('Command stderr (non-error):', result.stderr)
    output += `\nWarnings:\n${result.stderr}`
  }

  return output
}

export async function execCommands(commands: string[]) {
  const results: SSHExecCommandResponse[] = []
  const ssh = await getSSH()

  for (const command of commands) {
    const result = await ssh.execCommand(command, {
      cwd: process.env.HOMELAB_DIR,
    })
    results.push(result)
  }

  ssh.dispose()

  let output = ''
  for (const result of results) {
    if (result.stdout) {
      logger.info('Command stdout:', result.stdout)
      output += result.stdout
    }
    if (result.stderr) {
      logger.info('Command stderr:', result.stderr)
      output += `\nWarnings:\n${result.stderr}`
    }
  }

  return output
}
