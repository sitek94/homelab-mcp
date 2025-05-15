import type {ReadResourceRequest} from '@modelcontextprotocol/sdk/types.js'
import pg from 'pg'
import {z} from 'zod'
import {logger} from './logger'

const user = process.env.POSTGRES_USER
const password = process.env.POSTGRES_PASSWORD
const host = process.env.POSTGRES_HOST
const port = process.env.POSTGRES_PORT
  ? Number.parseInt(process.env.POSTGRES_PORT, 10)
  : 5432
const database = process.env.POSTGRES_DATABASE
const schemaPath = process.env.POSTGRES_SCHEMA_PATH

const resourceBaseUrl = new URL(
  `postgres://${user}@${host}:${port}/${database}`,
)
resourceBaseUrl.protocol = 'postgres:'
// Ensure password is not part of the resourceBaseUrl for display/logging purposes
resourceBaseUrl.password = ''

const pool = new pg.Pool({user, password, host, port, database})

export const PostgresQuerySchema = z.object({
  sql: z.string(),
})

export async function listTablesResources() {
  const client = await pool.connect()
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    )
    return {
      resources: result.rows.map(row => ({
        uri: new URL(`${row.table_name}/${schemaPath}`, resourceBaseUrl).href,
        mimeType: 'application/json',
        name: `"${row.table_name}" database schema`,
      })),
    }
  } finally {
    client.release()
  }
}

export async function readTableResource(request: ReadResourceRequest) {
  const resourceUrl = new URL(request.params.uri)

  const pathComponents = resourceUrl.pathname.split('/')
  const schema = pathComponents.pop()
  const tableName = pathComponents.pop()

  if (schema !== schemaPath || !tableName) {
    logger.error('Invalid resource URI', {
      schema,
      tableName,
      schemaPath,
      resourceUrl,
    })
    // throw new Error('Invalid resource URI')
  }
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
      [tableName],
    )
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    }
  } finally {
    client.release()
  }
}

export async function runReadOnlyQuery(sql: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN TRANSACTION READ ONLY')
    const result = await client.query(sql)
    return result.rows
  } finally {
    await client.query('ROLLBACK').catch(() => {
      logger.error('Failed to rollback transaction')
    })
    client.release()
  }
}
