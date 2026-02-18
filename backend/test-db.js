const pool = require('./db');

async function testConnection() {
    try {
        console.log("⏳ Testing database connection...");
        const res = await pool.query('SELECT NOW()');
        console.log("✅ Connection Successful!", res.rows[0]);

        // Check if tables exist
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log("📊 Tables in database:", tables.rows.map(r => r.table_name));

    } catch (err) {
        console.error("❌ Connection Failed:", err);
    } finally {
        pool.end();
    }
}

testConnection();
