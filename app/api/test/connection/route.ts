import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    // Try to connect without specifying a database first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    
    // Check MySQL version
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const version = (versionRows as any[])[0].version;
    
    // List all databases
    const [databases] = await connection.query('SHOW DATABASES');
    
    // Check if our database exists
    const dbExists = (databases as any[]).some(
      (db: any) => db.Database === process.env.DB_NAME
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      mysqlVersion: version,
      allDatabases: databases,
      ourDatabaseExists: dbExists,
      ourDatabaseName: process.env.DB_NAME,
      message: dbExists 
        ? `✅ Database '${process.env.DB_NAME}' exists!` 
        : `❌ Database '${process.env.DB_NAME}' not found. Create it in MySQL Workbench.`
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'MySQL connection failed',
      error: error.message,
      errorCode: error.code,
      troubleshooting: {
        step1: 'Is MySQL service running?',
        step2: 'Check username/password in .env.local',
        step3: 'Try: mysql -u root -p in terminal',
        step4: 'Default port is 3306'
      }
    }, { status: 500 });
  }
}