const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'lab_material_db'
});

async function checkColumns() {
    try {
        const res = await pool.query("SELECT * FROM materials LIMIT 1");
        if (res.rows.length > 0) {
            console.log('COLUMNS:', Object.keys(res.rows[0]).join(', '));
        } else {
            console.log('Table empty');
            const schema = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'materials'");
            console.log('COLUMNS (schema):', schema.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
