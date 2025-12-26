import { NextResponse } from 'next/server';
import pool from '@/lib/db/connection';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    // Check each table's structure
    const tables = ['users', 'projects', 'tasks'];
    const schemaInfo: any = {};
    
    for (const table of tables) {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME, table]);
      
      schemaInfo[table] = columns;
    }
    
    // Check for sample data
    const sampleData: any = {};
    for (const table of tables) {
      const [data] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      sampleData[table] = data;
    }
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'Database schema verified',
      tables: schemaInfo,
      rowCounts: sampleData,
      recommendations: sampleData.users[0].count === 0 
        ? 'No users found. You can register via /api/auth/register'
        : 'Database is ready for use!'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Schema check failed',
      error: error.message
    }, { status: 500 });
  }
}