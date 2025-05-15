import {z} from 'zod'
import {execCommand} from './utils'

export const ViewServiceLogsSchema = z.object({
  service_name: z.string(),
  lines: z.number().optional().default(100),
})

export const ListServicesSchema = z.object({})

export async function listServices() {
  return await execCommand('docker compose ps')
}

export async function viewServiceLogs(serviceName: string, lines: number) {
  return await execCommand(`docker compose logs --tail ${lines} ${serviceName}`)
}
