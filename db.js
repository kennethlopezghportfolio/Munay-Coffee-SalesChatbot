const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL!");
    client.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}

module.exports = {
  pool,
  testConnection,
};