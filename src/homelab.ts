import {NodeSSH} from 'node-ssh'
import {logger} from './logger'
import {z} from 'zod'

export const EnvSchema = z.object({
  HOMELAB_HOST: z.string(),
  HOMELAB_PORT: z.string(),
  HOMELAB_USERNAME: z.string(),
  HOMELAB_PRIVATE_KEY_PATH: z.string(),
  HOMELAB_DIR: z.string(),
})

export const ViewServiceLogsSchema = z.object({
  service_name: z.string(),
  lines: z.number().optional().default(100),
})

export const ListServicesSchema = z.object({})

export async function execCommand(command: string) {
  const ssh = new NodeSSH()
  await ssh.connect({
    host: process.env.HOMELAB_HOST,
    port: process.env.HOMELAB_PORT,
    username: process.env.HOMELAB_USERNAME,
    privateKeyPath: process.env.HOMELAB_PRIVATE_KEY_PATH,
  })

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

export async function listServices() {
  return await execCommand('docker compose ps')
}

export async function viewServiceLogs(serviceName: string, lines: number) {
  return await execCommand(`docker compose logs --tail ${lines} ${serviceName}`)
}

