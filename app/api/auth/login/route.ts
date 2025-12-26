import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { comparePasswords, generateToken } from '@/lib/auth';
import { AuthResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        error: 'Email and password are required'
      }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      // Find user
      const [users]: any = await connection.query(
        `SELECT id, name, email, password_hash, role 
         FROM users WHERE email = ?`,
        [email]
      );

      if (users.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'Login failed',
          error: 'Invalid email or password'
        }, { status: 401 });
      }

      const user = users[0];

      // Verify password
      const isValid = await comparePasswords(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({
          success: false,
          message: 'Login failed',
          error: 'Invalid email or password'
        }, { status: 401 });
      }

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      // Remove password_hash from response
      const { password_hash, ...userWithoutPassword } = user;

      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Login failed',
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}