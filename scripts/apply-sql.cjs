// scripts/apply-sql.cjs — Exécute un fichier .sql sur la base Supabase
// Usage: DB_PASSWORD=xxx node scripts/apply-sql.cjs supabase/migrations/core.sql

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_PASSWORD = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD
if (!DB_PASSWORD) {
  console.error('❌ DB_PASSWORD requis (Supabase dashboard → Settings → Database → Password)')
  process.exit(1)
}

const file = process.argv[2]
if (!file || !fs.existsSync(file)) {
  console.error('❌ Fichier SQL introuvable. Usage: DB_PASSWORD=xxx node scripts/apply-sql.cjs <fichier.sql>')
  process.exit(1)
}

const sql = fs.readFileSync(path.resolve(file), 'utf8')

const pool = new Pool({
  connectionString: `postgresql://postgres.keffsfxlnxbqkelapklx:${DB_PASSWORD}@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

async function main() {
  const client = await pool.connect()
  try {
    console.log(`→ Application de ${file} (${sql.length} caractères)…`)
    await client.query(sql)
    console.log('✅ Migration appliquée sans erreur')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('❌ Erreur SQL:', err.message)
  process.exit(1)
})
