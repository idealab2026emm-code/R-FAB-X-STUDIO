const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function setAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.log("Usage: node backend/set-admin.js <email_to_promote>");
        process.exit(1);
    }

    try {
        console.log(`🔍 Searching for user with email: ${email}`);

        // Check if user exists
        const check = await pool.query("SELECT * FROM users WHERE mail = $1", [email]);

        if (check.rows.length === 0) {
            console.log(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        const user = check.rows[0];
        console.log(`👤 Found user: ${user.username} (Current Role: ${user.role})`);

        // Update role
        await pool.query("UPDATE users SET role='admin' WHERE mail=$1", [email]);

        console.log(`✅ successfully promoted ${user.username} (${email}) to ADMIN!`);
        console.log("👉 Please verify by logging in with this account.");

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        pool.end();
    }
}

setAdmin();
