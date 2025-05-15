#!/usr/bin/env node

import {Server} from '@modelcontextprotocol/sdk/server/index.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import {zodToJsonSchema} from 'zod-to-json-schema'
import * as docker from './docker.js'
import * as utils from './utils.js'
import * as postgres from './postgres.js'
import {logger} from './logger.js'

const server = new Server(
  {
    name: 'homelab-mcp',
    version: '0.0.1',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
)

server.setRequestHandler(
  ListResourcesRequestSchema,
  postgres.listTablesResources,
)

server.setRequestHandler(ReadResourceRequestSchema, postgres.readTableResource)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const env = utils.EnvSchema.safeParse(process.env)
  if (!env.success) {
    logger.error('Invalid environment variables:', env.error.errors)
    process.exit(1)
  }

  return {
    tools: [
      // Docker
      {
        name: 'list_services',
        description: 'List all the services running in the Homelab',
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: 'view_service_logs',
        description: 'View the logs of a service',
        inputSchema: zodToJsonSchema(docker.ViewServiceLogsSchema),
      },

      // VPS health
      {
        name: 'get_vps_health_snapshot',
        description: 'Get a snapshot of the VPS health',
        inputSchema: zodToJsonSchema(z.object({})),
      },

      // Postgres
      {
        name: 'postgres_query',
        description: 'Run a read-only SQL query',
        inputSchema: zodToJsonSchema(postgres.PostgresQuerySchema),
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    if (!request.params.arguments) {
      throw new Error('Arguments are required')
    }

    switch (request.params.name) {
      case 'list_services': {
        const result = await docker.listServices()
        return {
          content: [{type: 'text', text: result}],
        }
      }

      case 'view_service_logs': {
        const args = docker.ViewServiceLogsSchema.parse(
          request.params.arguments,
        )
        const result = await docker.viewServiceLogs(
          args.service_name,
          args.lines,
        )
        return {
          content: [{type: 'text', text: result}],
        }
      }

      case 'get_vps_health_snapshot': {
        const result = await utils.execCommands([
          'df -h',
          'free -m',
          'uptime',
          'sensors',
        ])
        return {
          content: [{type: 'text', text: result}],
        }
      }

      case 'postgres_query': {
        const args = postgres.PostgresQuerySchema.parse(
          request.params.arguments,
        )
        const result = await postgres.runReadOnlyQuery(args.sql)
        return {
          content: [{type: 'text', text: JSON.stringify(result, null, 2)}],
        }
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`)
    }
    throw error
  }
})

async function runServer() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info('Homelab MCP Server running on stdio')
}

runServer().catch(error => {
  logger.error('Fatal error in main():', error)
  process.exit(1)
})
