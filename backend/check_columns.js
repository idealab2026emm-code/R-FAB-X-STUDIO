const pool = require('./db');

async function checkColumns() {
    const tables = ['users', 'materials', 'lab_inventory', 'transactions'];

    try {
        for (const table of tables) {
            console.log(`\n🔍 Checking '${table}' table columns...`);
            const result = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}';
            `);

            if (result.rows.length === 0) {
                console.log(`❌ Table '${table}' not found!`);
            } else {
                console.log(`✅ Found columns for '${table}':`);
                result.rows.forEach(row => {
                    console.log(`   - ${row.column_name} (${row.data_type})`);
                });
            }
        }
        pool.end();
    } catch (err) {
        console.error("❌ Error:", err.message);
        pool.end();
    }
}

checkColumns();
