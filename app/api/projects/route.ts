import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// GET all projects (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT p.*, u.name as user_name 
        FROM projects p 
        LEFT JOIN users u ON p.user_id = u.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      // Filter by status
      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      // Search by name or description
      if (search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const [countResult]: any = await connection.query(countQuery, params);
      const total = countResult[0].total;

      // Add pagination and ordering
      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [projects]: any = await connection.query(query, params);

      return successResponse('Projects retrieved successfully', {
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const body = await request.json();
    const { name, description, status = 'active' } = body;

    if (!name) {
      return errorResponse('Validation failed', 'Project name is required', 400);
    }

    const connection = await pool.getConnection();
    try {
      const [result]: any = await connection.query(
        `INSERT INTO projects (name, description, status, user_id) 
         VALUES (?, ?, ?, ?)`,
        [name, description, status, auth.userId]
      );

      // Get the created project
      const [projects]: any = await connection.query(
        `SELECT p.*, u.name as user_name 
         FROM projects p 
         LEFT JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [result.insertId]
      );

      return successResponse('Project created successfully', {
        project: projects[0],
      }, 201);

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}