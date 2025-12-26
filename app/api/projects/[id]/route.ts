import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// GET single project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return errorResponse('Invalid project ID', 'ID must be a number', 400);
    }

    const connection = await pool.getConnection();
    try {
      const [projects]: any = await connection.query(
        `SELECT p.*, u.name as user_name 
         FROM projects p 
         LEFT JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [projectId]
      );

      if (projects.length === 0) {
        return errorResponse('Project not found', 'No project with that ID', 404);
      }

      return successResponse('Project retrieved successfully', {
        project: projects[0],
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

// PUT update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return errorResponse('Invalid project ID', 'ID must be a number', 400);
    }

    const body = await request.json();
    const { name, description, status } = body;

    const connection = await pool.getConnection();
    try {
      // Check if project exists and user has permission
      const [existingProjects]: any = await connection.query(
        'SELECT user_id FROM projects WHERE id = ?',
        [projectId]
      );

      if (existingProjects.length === 0) {
        return errorResponse('Project not found', 'No project with that ID', 404);
      }

      // Optional: Check if user owns the project (for security)
      // if (existingProjects[0].user_id !== auth.userId && auth.role !== 'admin') {
      //   return errorResponse('Permission denied', 'You can only update your own projects', 403);
      // }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        return errorResponse('No updates provided', 'Provide at least one field to update', 400);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(projectId);

      await connection.query(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Get updated project
      const [projects]: any = await connection.query(
        `SELECT p.*, u.name as user_name 
         FROM projects p 
         LEFT JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [projectId]
      );

      return successResponse('Project updated successfully', {
        project: projects[0],
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

// DELETE project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return errorResponse('Invalid project ID', 'ID must be a number', 400);
    }

    const connection = await pool.getConnection();
    try {
      // Check if project exists
      const [existingProjects]: any = await connection.query(
        'SELECT id FROM projects WHERE id = ?',
        [projectId]
      );

      if (existingProjects.length === 0) {
        return errorResponse('Project not found', 'No project with that ID', 404);
      }

      // Delete project (cascade will delete tasks)
      await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);

      return successResponse('Project deleted successfully');

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}