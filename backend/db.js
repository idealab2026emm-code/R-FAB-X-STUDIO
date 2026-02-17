const { Pool } = require("pg");
require("dotenv").config();

// Create connection pool with proper config
let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  poolConfig = {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "rfab_x_studio"
  };
}

const pool = new Pool(poolConfig);

// Handle connection errors
pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client:", err);
});

pool.on("connect", () => {
  console.log("✅ Client connected to database");
});

// Test the connection
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("Make sure:");
    console.error("  1. PostgreSQL is running");
    console.error("  2. Database 'lab_material_db' exists");
    console.error("  3. .env file has correct credentials");
  } else {
    console.log("✅ Database connection successful");
    console.log("✅ Database connection pool initialized");
  }
});

module.exports = pool;