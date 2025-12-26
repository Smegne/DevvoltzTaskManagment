import { NextResponse } from 'next/server';
import pool from '@/lib/db/connection';

export async function GET() {
  try {
    // Test the connection
    const connection = await pool.getConnection();
    
    // Fixed query - avoid reserved keywords
    const [rows] = await connection.query('SELECT NOW() as current_time_db, VERSION() as mysql_version');
    
    // Also check if our database exists and has tables
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || 'task_management']
    );
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      databaseInfo: rows,
      tables: tables,
      environment: {
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
  } catch (error: any) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      errorCode: error.code,
      sqlMessage: error.sqlMessage,
      suggestions: [
        'Check if MySQL service is running',
        'Verify database name in .env.local',
        'Check MySQL user permissions'
      ]
    }, { status: 500 });
  }
}