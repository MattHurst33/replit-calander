// Database connection test - CommonJS version
const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf8');
const envLines = envFile.split('\n');
const envVars = {};

envLines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const DATABASE_URL = envVars.DATABASE_URL;

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📍 Database host:', DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Not found');
    
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    
    console.log('✅ Database connection successful!');
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    client.release();
    await pool.end();
    
    console.log('');
    console.log('🎉 Your Neon PostgreSQL database is ready!');
    console.log('💡 You can now run your full application:');
    console.log('   npm run dev');
    console.log('');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Check your DATABASE_URL in the .env file');
    process.exit(1);
  }
}

testConnection();
