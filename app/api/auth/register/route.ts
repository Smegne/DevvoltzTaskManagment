import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db/connection';
import { hashPassword, generateToken } from '@/lib/auth';
import { AuthResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        error: 'Name, email, and password are required'
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }

    // Check if user exists
    const connection = await pool.getConnection();
    try {
      const [existingUsers]: any = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return NextResponse.json({
          success: false,
          message: 'Registration failed',
          error: 'User already exists with this email'
        }, { status: 409 });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [result]: any = await connection.query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES (?, ?, ?, 'user')`,
        [name, email, passwordHash]
      );

      const userId = result.insertId;

      // Get the created user
      const [users]: any = await connection.query(
        'SELECT id, name, email, role FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      return NextResponse.json({
        success: true,
        message: 'User registered successfully',
        user,
        token
      }, { status: 201 });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Registration failed',
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}