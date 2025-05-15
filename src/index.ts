#!/usr/bin/env node

import {Server} from '@modelcontextprotocol/sdk/server/index.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {CallToolRequestSchema, ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import {zodToJsonSchema} from 'zod-to-json-schema'
import * as homelab from './homelab.js'
import {logger} from './logger.js'

const server = new Server(
	{
		name: 'homelab-mcp',
		version: '0.0.1',
	},
	{
		capabilities: {
			tools: {},
		},
	},
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
	const env = homelab.EnvSchema.safeParse(process.env)
	if (!env.success) {
		logger.error('Invalid environment variables:', env.error.errors)
		process.exit(1)
	}

	return {
		tools: [
			{
				name: 'list_services',
				description: 'List all the services running in the Homelab',
				inputSchema: zodToJsonSchema(z.object({})),
			},
			{
				name: 'view_service_logs',
				description: 'View the logs of a service',
				inputSchema: zodToJsonSchema(homelab.ViewServiceLogsSchema),
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
				const result = await homelab.listServices()
				return {
					content: [{type: 'text', text: result}],
				}
			}

			case 'view_service_logs': {
				const args = homelab.ViewServiceLogsSchema.parse(request.params.arguments)
				const result = await homelab.viewServiceLogs(args.service_name, args.lines)
				return {
					content: [{type: 'text', text: result}],
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
