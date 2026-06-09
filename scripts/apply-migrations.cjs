// scripts/apply-migrations.cjs — Apply DDL via direct PostgreSQL connection
// Usage: DB_PASSWORD=xxx node scripts/apply-migrations.cjs

const { Pool } = require('pg')

// Supabase connection pooler (transaction mode)
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD
if (!DB_PASSWORD) {
  console.error('❌ DB_PASSWORD env var required (Supabase dashboard → Settings → Database → Password)')
  process.exit(1)
}

const pool = new Pool({
  connectionString: `postgresql://postgres.keffsfxlnxbqkelapklx:${DB_PASSWORD}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
})

const STATEMENTS = [
  // RLS enable
  `ALTER TABLE food_providers        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE food_items            ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE food_sessions         ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE food_session_stocks   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE food_orders           ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE food_order_items      ENABLE ROW LEVEL SECURITY`,

  // SELECT public
  `DROP POLICY IF EXISTS "Public select" ON food_sessions`,
  `CREATE POLICY "Public select" ON food_sessions FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Public select" ON food_session_stocks`,
  `CREATE POLICY "Public select" ON food_session_stocks FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Public select" ON food_orders`,
  `CREATE POLICY "Public select" ON food_orders FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "Public select" ON food_order_items`,
  `CREATE POLICY "Public select" ON food_order_items FOR SELECT USING (true)`,

  // INSERT public (commandes clients)
  `DROP POLICY IF EXISTS "Public insert" ON food_orders`,
  `CREATE POLICY "Public insert" ON food_orders FOR INSERT WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Public insert" ON food_order_items`,
  `CREATE POLICY "Public insert" ON food_order_items FOR INSERT WITH CHECK (true)`,

  // Service role ALL (server actions)
  `DROP POLICY IF EXISTS "Service all food_sessions" ON food_sessions`,
  `CREATE POLICY "Service all food_sessions" ON food_sessions FOR ALL USING (auth.role() = 'service_role')`,
  `DROP POLICY IF EXISTS "Service all food_session_stocks" ON food_session_stocks`,
  `CREATE POLICY "Service all food_session_stocks" ON food_session_stocks FOR ALL USING (auth.role() = 'service_role')`,
  `DROP POLICY IF EXISTS "Service all food_orders" ON food_orders`,
  `CREATE POLICY "Service all food_orders" ON food_orders FOR ALL USING (auth.role() = 'service_role')`,
  `DROP POLICY IF EXISTS "Service all food_order_items" ON food_order_items`,
  `CREATE POLICY "Service all food_order_items" ON food_order_items FOR ALL USING (auth.role() = 'service_role')`,

  // Realtime
  `ALTER PUBLICATION supabase_realtime ADD TABLE food_session_stocks`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE food_orders`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE food_sessions`,

  // Unique constraint food_sessions
  `ALTER TABLE food_sessions ADD CONSTRAINT IF NOT EXISTS food_sessions_provider_date_unique UNIQUE (provider_id, date)`,
]

async function run() {
  console.log('🔌 Connexion PostgreSQL...')
  const client = await pool.connect()
  console.log('✅ Connecté')

  for (const sql of STATEMENTS) {
    try {
      await client.query(sql)
      console.log('✅', sql.slice(0, 70))
    } catch (e) {
      const msg = e.message
      if (msg.includes('already exists') || msg.includes('already a member')) {
        console.log('⏭️  déjà fait:', sql.slice(0, 70))
      } else {
        console.log('❌', sql.slice(0, 70), '→', msg)
      }
    }
  }

  client.release()
  await pool.end()
  console.log('\n🎉 Migrations appliquées !')
}

run().catch(e => { console.error(e); process.exit(1) })
