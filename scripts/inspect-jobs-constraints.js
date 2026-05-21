#!/usr/bin/env node
import pg from 'pg'

const { Client } = pg

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL

if (!connectionString) {
  console.error('Please set DATABASE_URL or SUPABASE_DB_URL environment variable to your Postgres connection string (service_role key not required for read-only).')
  process.exit(1)
}

const client = new Client({ connectionString })

const run = async () => {
  try {
    await client.connect()

    console.log('\n=== jobs table constraints ===')
    const constraintsRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS constraintdef
      FROM pg_constraint
      WHERE conrelid = 'jobs'::regclass;
    `)
    console.log(JSON.stringify(constraintsRes.rows, null, 2))

    console.log('\n=== jobs indexes ===')
    const indexesRes = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename='jobs';
    `)
    console.log(JSON.stringify(indexesRes.rows, null, 2))

    console.log('\n=== jobs columns ===')
    const colsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name='jobs'
      ORDER BY ordinal_position;
    `)
    console.log(JSON.stringify(colsRes.rows, null, 2))

    console.log('\n=== done ===')
  } catch (err) {
    console.error('Error querying database:', err)
  } finally {
    await client.end()
  }
}

run()
