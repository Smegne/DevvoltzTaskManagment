import pool from '@/lib/db/connection';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Test query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ Query test passed:', rows);
    
    // Check if tables exist
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'task_management']);
    
    console.log('📊 Existing tables:', tables);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Handle environment variables for script
import { config } from 'dotenv';
config({ path: '.env.local' });

testConnection();