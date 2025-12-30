import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// Helper function to generate module name
function generateModuleName(user: any, month?: string, week?: string, subject?: string): string {
  let finalMonth = month;
  let finalWeek = week;
  
  if (!finalMonth || !finalWeek) {
    const now = new Date();
    finalMonth = now.toLocaleString('en-US', { month: 'long' });
    
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayWeekday = firstDay.getDay() || 7;
    const offsetDate = now.getDate() + firstDayWeekday - 1;
    const weekNumber = Math.ceil(offsetDate / 7);
    finalWeek = `Week${weekNumber}`;
  }

  const userName = (user.full_name || user.name || user.email || 'user')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  
  const moduleSubject = subject || 'project';
  
  return `${finalMonth}-${finalWeek}-${userName}-${moduleSubject}`;
}

// Helper to check if user can edit task
function canEditTask(task: any, userId: number, userRole: string): boolean {
  if (userRole === 'admin') return true;
  return task.created_by === userId || task.assigned_to === userId;
}
// Helper function to handle assignment for admin vs regular users
function handleAssignment(auth: any, assigned_to: any, existingTask?: any) {
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
        throw new Error('Invalid assignee ID');
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
      // Check if they're trying to reassign their own task
      if (!existingTask || existingTask.created_by !== auth.userId) {
        throw new Error('You can only reassign your own tasks');
      }
      const parsedId = parseInt(assigned_to);
      if (!isNaN(parsedId) && parsedId !== auth.userId) {
        throw new Error('You can only assign tasks to yourself or unassign');
      }
      assignedTo = auth.userId;
    }
  }
  
  return assignedTo;
}
// GET single task - FIXED
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
          u_creator.email as creator_email,
          u_assignee.name as assignee_name,
          u_assignee.email as assignee_email,
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
      
      // Check permission
      if (!canEditTask(task, auth.userId, auth.role)) {
        return errorResponse('Permission denied', 'You cannot access this task', 403);
      }
      
      // Parse JSON tags
      if (task.tags && typeof task.tags === 'string') {
        try {
          task.tags = JSON.parse(task.tags);
        } catch (e) {
          task.tags = [];
        }
      }
      
      // Add user display names
      if (!task.creator_name && task.creator_email) {
        task.creator_name = task.creator_email.split('@')[0];
      }
      if (!task.assignee_name && task.assignee_email) {
        task.assignee_name = task.assignee_email.split('@')[0];
      }
      
      // Add canEdit flag for frontend
      const taskWithPermissions = {
        ...task,
        canEdit: canEditTask(task, auth.userId, auth.role)
      };

      return successResponse('Task retrieved successfully', {
        task: taskWithPermissions,
      });

    } catch (dbError: any) {
      console.error('🔴 Database error in GET:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 GET /api/tasks/[id] error:', error);
    return serverErrorResponse(error);
  }
}

// PUT update task - SIMPLIFIED VERSION
export async function PUT(
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

    const body = await request.json();
    console.log('🔵 Updating task:', taskId, 'with data:', body);

    const connection = await pool.getConnection();
    try {
      // Check if task exists
      const [existingTasks]: any = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      if (existingTasks.length === 0) {
        return errorResponse('Task not found', 'No task with that ID', 404);
      }

      const task = existingTasks[0];

      // Check permission to edit
      if (!canEditTask(task, auth.userId, auth.role)) {
        return errorResponse('Permission denied', 'You can only edit your own tasks', 403);
      }

      // Build update query
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

      // Add updates for each field
      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title.trim());
      }
      
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }
      
      if (module_name !== undefined) {
        let finalModuleName = module_name;
        if (!finalModuleName || finalModuleName.trim() === '') {
          finalModuleName = generateModuleName(auth);
        }
        updates.push('module_name = ?');
        values.push(finalModuleName);
      }
      
      if (status !== undefined) {
        const validStatuses = ['todo', 'in_progress', 'review', 'done', 'paused'];
        if (!validStatuses.includes(status)) {
          return errorResponse('Invalid status', `Status must be one of: ${validStatuses.join(', ')}`, 400);
        }
        updates.push('status = ?');
        values.push(status);
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
        updates.push('due_date = ?');
        values.push(due_date || null);
      }
      
      if (estimated_hours !== undefined) {
        updates.push('estimated_hours = ?');
        values.push(estimated_hours || null);
      }
      
      if (project_id !== undefined) {
        let projectId = null;
        if (project_id && project_id !== "none" && project_id !== "null" && project_id !== "") {
          projectId = parseInt(project_id);
        }
        updates.push('project_id = ?');
        values.push(projectId);
      }
      
      if (assigned_to !== undefined) {
        let assignedTo = auth.userId;
        if (assigned_to === "unassigned" || assigned_to === "null" || assigned_to === "") {
          assignedTo = null;
        } else if (assigned_to && assigned_to !== "current") {
          assignedTo = parseInt(assigned_to);
        }
        updates.push('assigned_to = ?');
        values.push(assignedTo);
      }
      
      if (tags !== undefined) {
        let tagsJson = null;
        if (tags && Array.isArray(tags) && tags.length > 0) {
          tagsJson = JSON.stringify(tags);
        }
        updates.push('tags = ?');
        values.push(tagsJson);
      }

      if (updates.length === 0) {
        return errorResponse('No updates provided', 'Provide at least one field to update', 400);
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      // Add task ID for WHERE clause
      values.push(taskId);

      const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
      console.log('🔵 Executing SQL:', sql);

      await connection.query(sql, values);

      // Get updated task
      const [updatedTasks]: any = await connection.query(
        `SELECT 
          t.*,
          u_creator.name as creator_name,
          u_creator.email as creator_email,
          u_assignee.name as assignee_name,
          u_assignee.email as assignee_email,
          p.name as project_name
        FROM tasks t
        LEFT JOIN users u_creator ON t.created_by = u_creator.id
        LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.id = ?`,
        [taskId]
      );

      // Parse JSON tags for response
      const updatedTask = updatedTasks[0];
      if (updatedTask.tags && typeof updatedTask.tags === 'string') {
        try {
          updatedTask.tags = JSON.parse(updatedTask.tags);
        } catch (e) {
          updatedTask.tags = [];
        }
      }
      
      // Add user display names
      if (!updatedTask.creator_name && updatedTask.creator_email) {
        updatedTask.creator_name = updatedTask.creator_email.split('@')[0];
      }
      if (!updatedTask.assignee_name && updatedTask.assignee_email) {
        updatedTask.assignee_name = updatedTask.assignee_email.split('@')[0];
      }

      return successResponse('Task updated successfully', {
        task: updatedTask,
      });

    } catch (dbError: any) {
      console.error('🔴 Database error in PUT:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 PUT /api/tasks/[id] error:', error);
    return serverErrorResponse(error);
  }
}

// DELETE task
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

    } catch (dbError: any) {
      console.error('🔴 Database error in DELETE:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 DELETE /api/tasks/[id] error:', error);
    return serverErrorResponse(error);
  }
}