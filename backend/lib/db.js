import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

export async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

export async function runMigrations() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const sql = readFileSync(join(__dirname, '../migrations/schema.sql'), 'utf8')
  await query(sql)
  console.log('Migrations applied.')
}
