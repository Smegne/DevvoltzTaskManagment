import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required',
        error: 'No valid token provided'
      }, { status: 401 });
    }

    // Get user profile
    const connection = await pool.getConnection();
    try {
      const [users]: any = await connection.query(
        `SELECT id, name, email, role, created_at, updated_at 
         FROM users WHERE id = ?`,
        [auth.userId]
      );

      if (users.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'User not found',
          error: 'User does not exist'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Profile retrieved successfully',
        user: users[0]
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Profile error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get profile',
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}