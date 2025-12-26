import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// GET all tasks (with filters) - UPDATED WITH VALIDATION
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const moduleName = searchParams.get('moduleName');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Validate status filter
    if (status && !['todo', 'in_progress', 'review', 'done', 'paused'].includes(status)) {
      return errorResponse('Invalid status', 'Status must be one of: todo, in_progress, review, done, paused', 400);
    }

    // Validate priority filter
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return errorResponse('Invalid priority', 'Priority must be one of: low, medium, high', 400);
    }

    const connection = await pool.getConnection();
    try {
      // Base query to get all tasks with user info
      let query = `
        SELECT 
          t.*,
          u_creator.name as creator_name,
          u_assignee.name as assignee_name,
          p.name as project_name
        FROM tasks t
        LEFT JOIN users u_creator ON t.created_by = u_creator.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE 1=1
      `;
      
      const params: any[] = [];

      // Apply filters
      if (projectId) {
        const parsedProjectId = parseInt(projectId);
        if (isNaN(parsedProjectId)) {
          return errorResponse('Invalid project ID', 'Project ID must be a number', 400);
        }
        query += ' AND t.project_id = ?';
        params.push(parsedProjectId);
      }
      
      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }
      
      if (priority) {
        query += ' AND t.priority = ?';
        params.push(priority);
      }
      
      if (assignedTo) {
        const parsedAssignedTo = parseInt(assignedTo);
        if (isNaN(parsedAssignedTo)) {
          return errorResponse('Invalid assignee ID', 'Assignee ID must be a number', 400);
        }
        query += ' AND t.assigned_to = ?';
        params.push(parsedAssignedTo);
      }
      
      if (moduleName) {
        query += ' AND t.module_name = ?';
        params.push(moduleName);
      }
      
      if (search) {
        query += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.module_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const [countResult]: any = await connection.query(countQuery, params);
      const total = countResult[0].total;

      // Add ordering and pagination
      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [tasks]: any = await connection.query(query, params);

      // Parse JSON tags if they exist
      const tasksWithParsedTags = tasks.map((task: any) => {
        if (task.tags && typeof task.tags === 'string') {
          try {
            task.tags = JSON.parse(task.tags);
          } catch (e) {
            task.tags = [];
          }
        }
        return task;
      });

      return successResponse('Tasks retrieved successfully', {
        tasks: tasksWithParsedTags,
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

// POST create new task - UPDATED WITH VALIDATION
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      module_name,
      status = 'todo', 
      priority = 'medium',
      due_date,
      estimated_hours,
      project_id,
      assigned_to,
      tags = []
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return errorResponse('Validation failed', 'Task title is required and must be a non-empty string', 400);
    }

    // Validate status
    const validStatuses = ['todo', 'in_progress', 'review', 'done', 'paused'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse('Invalid status', `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return errorResponse('Invalid priority', `Priority must be one of: ${validPriorities.join(', ')}`, 400);
    }

    // Validate due_date format
    if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return errorResponse('Invalid date format', 'Due date must be in YYYY-MM-DD format', 400);
    }

    // Validate estimated_hours
    if (estimated_hours !== undefined && estimated_hours !== null) {
      const hours = parseFloat(estimated_hours);
      if (isNaN(hours) || hours < 0) {
        return errorResponse('Invalid estimated hours', 'Estimated hours must be a positive number', 400);
      }
    }

    // Validate tags
    if (tags && (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string'))) {
      return errorResponse('Invalid tags', 'Tags must be an array of strings', 400);
    }

    const connection = await pool.getConnection();
    try {
      // Handle assigned_to: if "unassigned" or empty, set to NULL
      let assignedTo = null;
      if (assigned_to === "current" || assigned_to === auth.userId?.toString()) {
        assignedTo = auth.userId;
      } else if (assigned_to && assigned_to !== "unassigned" && assigned_to !== "null") {
        const parsedId = parseInt(assigned_to);
        if (isNaN(parsedId)) {
          return errorResponse('Invalid assignee ID', 'Assignee ID must be a number', 400);
        }
        assignedTo = parsedId;
      }

      // Handle project_id: if "none" or empty, set to NULL
      let projectId = null;
      if (project_id && project_id !== "none" && project_id !== "null") {
        const parsedId = parseInt(project_id);
        if (isNaN(parsedId)) {
          return errorResponse('Invalid project ID', 'Project ID must be a number', 400);
        }
        projectId = parsedId;
      }

      // Convert tags to JSON string
      const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

      // Insert task with new fields
      const [result]: any = await connection.query(
        `INSERT INTO tasks 
          (title, description, module_name, status, priority, due_date, estimated_hours, project_id, assigned_to, created_by, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(), 
          description || null, 
          module_name || null, 
          status, 
          priority, 
          due_date || null, 
          estimated_hours || null, 
          projectId, 
          assignedTo, 
          auth.userId,
          tagsJson
        ]
      );

      // Get the created task with user info
      const [tasks]: any = await connection.query(
        `SELECT 
          t.*,
          u_creator.name as creator_name,
          u_assignee.name as assignee_name,
          p.name as project_name
        FROM tasks t
        LEFT JOIN users u_creator ON t.created_by = u_creator.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?`,
        [result.insertId]
      );

      // Parse JSON tags for response
      const task = tasks[0];
      if (task.tags && typeof task.tags === 'string') {
        try {
          task.tags = JSON.parse(task.tags);
        } catch (e) {
          task.tags = [];
        }
      }

      return successResponse('Task created successfully', {
        task,
      }, 201);

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Create task error:', error);
    return serverErrorResponse(error);
  }
}