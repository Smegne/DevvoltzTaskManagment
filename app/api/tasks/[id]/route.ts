import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// Helper to check if user can edit task
function canEditTask(task: any, userId: number, userRole: string): boolean {
  // Admin can edit all tasks
  if (userRole === 'admin') return true;
  
  // Users can edit tasks they created or are assigned to
  return task.created_by === userId || task.assigned_to === userId;
}

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 'ID must be a number', 400);
    }

    const connection = await pool.getConnection();
    try {
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
        [taskId]
      );

      if (tasks.length === 0) {
        return errorResponse('Task not found', 'No task with that ID', 404);
      }

      const task = tasks[0];
      
      // Parse JSON tags
      if (task.tags && typeof task.tags === 'string') {
        try {
          task.tags = JSON.parse(task.tags);
        } catch (e) {
          task.tags = [];
        }
      }
      
      // Add canEdit flag for frontend
      const taskWithPermissions = {
        ...task,
        canEdit: canEditTask(task, auth.userId, auth.role)
      };

      return successResponse('Task retrieved successfully', {
        task: taskWithPermissions,
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

// PUT update task (with permission check)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log('🔵 [API PUT] Request received at:', new Date().toISOString());
  console.log('🔵 Task ID from params:', id);
  console.log('🔵 Request URL:', request.url);
  
  try {
    const auth = await authenticate(request);
    console.log('🔵 Auth result:', {
      userId: auth?.userId,
      role: auth?.role,
      email: auth?.email,
      isValid: !!auth
    });
    
    if (!auth) {
      console.log('🔴 Authentication failed - no valid token');
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const taskId = parseInt(id);
    console.log('🔵 Parsed Task ID:', taskId, 'Is NaN?', isNaN(taskId));
    
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 'ID must be a number', 400);
    }

    const body = await request.json();
    console.log('🔵 Request body received:', body);
    console.log('🔵 Status being updated to:', body.status);
    console.log('🔵 Is status valid?', ['todo', 'in_progress', 'review', 'done', 'paused'].includes(body.status));

    const connection = await pool.getConnection();
    try {
      // Check if task exists and get current data
      console.log('🔵 Querying database for task ID:', taskId);
      const [existingTasks]: any = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      console.log('🔵 Database query result - tasks found:', existingTasks.length);
      
      if (existingTasks.length > 0) {
        console.log('🔵 Task data:', {
          id: existingTasks[0].id,
          title: existingTasks[0].title,
          status: existingTasks[0].status,
          created_by: existingTasks[0].created_by,
          assigned_to: existingTasks[0].assigned_to
        });
      }

      if (existingTasks.length === 0) {
        console.log('🔴 Task not found in database');
        return errorResponse('Task not found', 'No task with that ID', 404);
      }

      const task = existingTasks[0];

      // Check permission to edit
      const canEdit = canEditTask(task, auth.userId, auth.role);
      console.log('🔵 Permission check:', {
        userId: auth.userId,
        role: auth.role,
        taskCreator: task.created_by,
        taskAssignee: task.assigned_to,
        canEdit: canEdit
      });
      
      if (!canEdit) {
        console.log('🔴 Permission denied for user to edit this task');
        return errorResponse('Permission denied', 'You can only edit your own tasks', 403);
      }

      // Build update query with new fields
      const updates: string[] = [];
      const values: any[] = [];

      const { 
        title, 
        description, 
        module_name,
        status, 
        priority,
        due_date,
        estimated_hours,
        project_id,
        assigned_to,
        tags
      } = body;

      // Validate and add updates for each field
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return errorResponse('Invalid title', 'Title must be a non-empty string', 400);
        }
        updates.push('title = ?');
        values.push(title.trim());
      }
      
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }
      
      if (module_name !== undefined) {
        updates.push('module_name = ?');
        values.push(module_name || null);
      }
      
      if (status !== undefined) {
        const validStatuses = ['todo', 'in_progress', 'review', 'done', 'paused'];
        console.log('🔵 Validating status:', status, 'Valid?', validStatuses.includes(status));
        
        if (!validStatuses.includes(status)) {
          console.log('🔴 Invalid status value:', status);
          return errorResponse('Invalid status', `Status must be one of: ${validStatuses.join(', ')}`, 400);
        }
        updates.push('status = ?');
        values.push(status);
        console.log('🔵 Status update added to query');
      }
      
      if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
          return errorResponse('Invalid priority', `Priority must be one of: ${validPriorities.join(', ')}`, 400);
        }
        updates.push('priority = ?');
        values.push(priority);
      }
      
      if (due_date !== undefined) {
        // Validate date format if provided
        if (due_date && due_date !== null && due_date !== '') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            return errorResponse('Invalid date format', 'Due date must be in YYYY-MM-DD format or empty', 400);
          }
        }
        updates.push('due_date = ?');
        values.push(due_date || null);
      }
      
      if (estimated_hours !== undefined) {
        if (estimated_hours !== null && estimated_hours !== '') {
          const hours = parseFloat(estimated_hours);
          if (isNaN(hours) || hours < 0) {
            return errorResponse('Invalid estimated hours', 'Estimated hours must be a positive number', 400);
          }
          updates.push('estimated_hours = ?');
          values.push(hours);
        } else {
          updates.push('estimated_hours = ?');
          values.push(null);
        }
      }
      
      if (project_id !== undefined) {
        // Handle project_id: if "none", "null", or empty, set to NULL
        let projectId = null;
        if (project_id && project_id !== "none" && project_id !== "null" && project_id !== "") {
          const parsedId = parseInt(project_id);
          if (isNaN(parsedId)) {
            return errorResponse('Invalid project ID', 'Project ID must be a number', 400);
          }
          projectId = parsedId;
        }
        updates.push('project_id = ?');
        values.push(projectId);
      }
      
      if (assigned_to !== undefined) {
        // Handle assigned_to based on user role
        let assignedTo = null;
        
        if (auth.role === 'admin') {
          // Admin can assign to anyone
          if (assigned_to === "current") {
            assignedTo = auth.userId;
          } else if (assigned_to === "unassigned" || assigned_to === "null" || assigned_to === "") {
            assignedTo = null;
          } else if (assigned_to) {
            const parsedId = parseInt(assigned_to);
            if (isNaN(parsedId)) {
              return errorResponse('Invalid assignee ID', 'Assignee ID must be a number', 400);
            }
            assignedTo = parsedId;
          }
        } else {
          // Regular users can only assign to themselves or unassign
          if (assigned_to === "current" || assigned_to === auth.userId?.toString()) {
            assignedTo = auth.userId;
          } else if (assigned_to === "unassigned" || assigned_to === "null" || assigned_to === "") {
            assignedTo = null;
          } else if (assigned_to) {
            // Users can't assign to others, check if they're trying to assign to someone else
            const parsedId = parseInt(assigned_to);
            if (!isNaN(parsedId) && parsedId !== auth.userId) {
              return errorResponse('Permission denied', 'You can only assign tasks to yourself or unassign', 403);
            }
            assignedTo = auth.userId;
          }
        }
        
        updates.push('assigned_to = ?');
        values.push(assignedTo);
      }
      
      if (tags !== undefined) {
        // Convert tags to JSON string
        let tagsJson = null;
        if (tags && Array.isArray(tags) && tags.length > 0) {
          // Validate tags are strings
          if (!tags.every(tag => typeof tag === 'string')) {
            return errorResponse('Invalid tags', 'All tags must be strings', 400);
          }
          tagsJson = JSON.stringify(tags);
        }
        updates.push('tags = ?');
        values.push(tagsJson);
      }

      if (updates.length === 0) {
        console.log('🔴 No updates provided in request');
        return errorResponse('No updates provided', 'Provide at least one field to update', 400);
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add task ID for WHERE clause
      values.push(taskId);

      console.log('🔵 Final SQL query parts:');
      console.log('🔵 Updates:', updates);
      console.log('🔵 Values:', values);
      
      const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
      console.log('🔵 Executing SQL:', sql);

      const [updateResult]: any = await connection.query(sql, values);
      console.log('🔵 Database update result:', updateResult);
      console.log('🔵 Rows affected:', updateResult.affectedRows);

      // Get updated task
      const [updatedTasks]: any = await connection.query(
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
        [taskId]
      );

      console.log('🔵 Updated task fetched:', updatedTasks[0]);

      // Parse JSON tags for response
      const updatedTask = updatedTasks[0];
      if (updatedTask.tags && typeof updatedTask.tags === 'string') {
        try {
          updatedTask.tags = JSON.parse(updatedTask.tags);
        } catch (e) {
          updatedTask.tags = [];
        }
      }

      return successResponse('Task updated successfully', {
        task: updatedTask,
      });

    } finally {
      connection.release();
      console.log('🔵 Database connection released');
    }

  } catch (error: any) {
    console.error('🔴 [API PUT] Error:', error);
    console.error('🔴 Error message:', error.message);
    console.error('🔴 Error stack:', error.stack);
    return serverErrorResponse(error);
  }
}

// DELETE task (with permission check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return errorResponse('Invalid task ID', 'ID must be a number', 400);
    }

    const connection = await pool.getConnection();
    try {
      // Check if task exists and get creator
      const [existingTasks]: any = await connection.query(
        'SELECT created_by FROM tasks WHERE id = ?',
        [taskId]
      );

      if (existingTasks.length === 0) {
        return errorResponse('Task not found', 'No task with that ID', 404);
      }

      const task = existingTasks[0];

      // Only admin or creator can delete
      if (auth.role !== 'admin' && task.created_by !== auth.userId) {
        return errorResponse('Permission denied', 'You can only delete your own tasks', 403);
      }

      await connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);

      return successResponse('Task deleted successfully');

    } finally {
      connection.release();
    }

  } catch (error: any) {
    return serverErrorResponse(error);
  }
}