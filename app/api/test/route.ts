import { NextResponse } from 'next/server';
import pool from '@/lib/db/connection';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT NOW() as current_time');
    return NextResponse.json({
      message: 'Database connection successful!',
      timestamp: rows,
      status: 'OK'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database connection failed', details: error },
      { status: 500 }
    );
  }
}