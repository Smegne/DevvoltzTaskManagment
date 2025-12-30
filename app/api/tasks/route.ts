import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// Helper function to generate module name in new format
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

  // CORRECTED: Use 'name' since your table doesn't have 'full_name'
  const userName = (user.name || user.email || 'user')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  
  const moduleSubject = subject || 'project';
  
  return `${finalMonth}-${finalWeek}-${userName}-${moduleSubject}`;
}

// GET - Can fetch either tasks or users
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const { searchParams } = new URL(request.url);
    
    // ========== Check if this is a users request ==========
    if (searchParams.get('type') === 'users') {
      return await handleGetUsers(request, auth);
    }
    // ========== END users request ==========
    
    // ========== Original task fetching logic ==========
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const moduleName = searchParams.get('moduleName');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
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
      let query = `
        SELECT 
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

      // CRITICAL CHANGE: Admin can see all tasks, regular users see only their tasks
      if (auth.role !== 'admin') {
        query += ' AND (t.created_by = ? OR t.assigned_to = ?)';
        params.push(auth.userId, auth.userId);
        console.log('🔵 Regular user filter applied: user ID', auth.userId);
      } else {
        console.log('🔵 Admin user - showing ALL tasks');
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as count_query`;
      const [countResult]: any = await connection.query(countQuery, params);
      const total = countResult[0].total;

      // Add ordering and pagination
      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      console.log('🔵 Executing tasks query for', auth.role === 'admin' ? 'ADMIN' : 'USER', auth.userId);

      const [tasks]: any = await connection.query(query, params);

      console.log('🔵 Tasks retrieved:', tasks.length, 'for user role:', auth.role);

      // Parse JSON tags if they exist
      const tasksWithParsedTags = tasks.map((task: any) => {
        if (task.tags && typeof task.tags === 'string') {
          try {
            task.tags = JSON.parse(task.tags);
          } catch (e) {
            task.tags = [];
          }
        }
        
        // Add user name for display
        if (!task.creator_name && task.creator_email) {
          task.creator_name = task.creator_email.split('@')[0];
        }
        if (!task.assignee_name && task.assignee_email) {
          task.assignee_name = task.assignee_email.split('@')[0];
        }
        
        // Add canEdit flag - admin can edit all, users can edit their own tasks
        task.canEdit = auth.role === 'admin' || 
                      task.created_by === auth.userId || 
                      task.assigned_to === auth.userId;
        
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

    } catch (dbError: any) {
      console.error('🔴 Database error:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 GET /api/tasks error:', error);
    return serverErrorResponse(error);
  }
}

// ========== CORRECTED: Users Fetching Function ==========
async function handleGetUsers(request: NextRequest, auth: any) {
  try {
    const connection = await pool.getConnection();
    
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const limit = parseInt(searchParams.get('limit') || '100');
      const page = parseInt(searchParams.get('page') || '1');
      const offset = (page - 1) * limit;

      console.log('🔵 [handleGetUsers] Fetching users for role:', auth.role, 'user ID:', auth.userId);

      // CORRECTED: Your table has 'name' column, not 'full_name'
      let usersQuery = `
        SELECT 
          id, 
          name, 
          email, 
          role, 
          created_at, 
          updated_at
        FROM users 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      // Add search filter if provided
      if (search) {
        usersQuery += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      // Filter based on user role
      if (auth.role !== 'admin') {
        // Regular users can only see themselves
        usersQuery += ' AND id = ?';
        params.push(auth.userId);
      }
      
      // Order by name
      usersQuery += ' ORDER BY name ASC';
      
      // Add pagination
      usersQuery += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      console.log('🔵 [handleGetUsers] Query:', usersQuery);

      const [users]: any = await connection.query(usersQuery, params);
      
      console.log('🔵 [handleGetUsers] Users retrieved:', users.length);

      // CORRECTED: Map 'name' to 'full_name' for compatibility with frontend
      const formattedUsers = users.map((user: any) => ({
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        full_name: user.name, // Map name to full_name
        role: user.role
      }));

      return successResponse('Users retrieved successfully', {
        users: formattedUsers,
        count: formattedUsers.length
      });

    } catch (dbError: any) {
      console.error('🔴 [handleGetUsers] Database error:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('🔴 [handleGetUsers] Error:', error);
    return serverErrorResponse(error);
  }
}

// POST create new task
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
    if (due_date && due_date !== null && due_date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return errorResponse('Invalid date format', 'Due date must be in YYYY-MM-DD format', 400);
    }

    // Validate estimated_hours
    if (estimated_hours !== undefined && estimated_hours !== null && estimated_hours !== '') {
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
      // Generate module name if not provided
      let finalModuleName = module_name;
      if (!finalModuleName || finalModuleName.trim() === '') {
        finalModuleName = generateModuleName(auth);
        console.log('🔵 Generated module name:', finalModuleName);
      }

      // Handle assigned_to with enhanced logic
      let assignedTo = null;
      
      // Parse assigned_to value
      if (assigned_to === undefined || assigned_to === null || assigned_to === "") {
        assignedTo = null; // Unassigned
      } else if (assigned_to === "current" || assigned_to === "myself") {
        assignedTo = auth.userId; // Assign to current user
      } else if (assigned_to === "unassigned") {
        assignedTo = null; // Unassigned
      } else {
        // It should be a user ID
        const parsedId = parseInt(assigned_to);
        if (isNaN(parsedId)) {
          return errorResponse('Invalid assignee ID', 'Assignee ID must be a number', 400);
        }
        
        // Check if admin is trying to assign to another user
        if (auth.role !== 'admin' && parsedId !== auth.userId) {
          return errorResponse('Permission denied', 'Regular users can only assign tasks to themselves', 403);
        }
        
        // Verify the target user exists (only for admin assigning to others)
        if (auth.role === 'admin' && parsedId !== auth.userId) {
          const [userCheck]: any = await connection.query(
            'SELECT id FROM users WHERE id = ?',
            [parsedId]
          );
          
          if (userCheck.length === 0) {
            return errorResponse('Invalid user', `User with ID ${parsedId} does not exist`, 404);
          }
        }
        
        assignedTo = parsedId;
      }

      // Handle project_id
      let projectId = null;
      if (project_id && project_id !== "none" && project_id !== "null" && project_id !== "") {
        const parsedId = parseInt(project_id);
        if (isNaN(parsedId)) {
          return errorResponse('Invalid project ID', 'Project ID must be a number', 400);
        }
        projectId = parsedId;
      }

      // Convert tags to JSON string
      const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

      // Insert task
      const [result]: any = await connection.query(
        `INSERT INTO tasks 
          (title, description, module_name, status, priority, due_date, estimated_hours, project_id, assigned_to, created_by, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(), 
          description || null, 
          finalModuleName,
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

      // Get the created task
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
      
      // Add user display names
      if (!task.creator_name && task.creator_email) {
        task.creator_name = task.creator_email.split('@')[0];
      }
      if (!task.assignee_name && task.assignee_email) {
        task.assignee_name = task.assignee_email.split('@')[0];
      }
      
      // Add canEdit flag
      task.canEdit = true; // Creator can always edit their own task

      return successResponse('Task created successfully', {
        task,
      }, 201);

    } catch (dbError: any) {
      console.error('🔴 Database error in POST:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 POST /api/tasks error:', error);
    return serverErrorResponse(error);
  }
}

// PUT update task
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    // Get task ID from URL
    const url = new URL(request.url);
    const taskId = url.pathname.split('/').pop();
    
    if (!taskId || isNaN(parseInt(taskId))) {
      return errorResponse('Invalid task ID', 'Task ID is required and must be a number', 400);
    }

    const body = await request.json();
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

    const connection = await pool.getConnection();
    try {
      // First, check if task exists and user has permission
      const [existingTasks]: any = await connection.query(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );

      if (existingTasks.length === 0) {
        return errorResponse('Task not found', `Task with ID ${taskId} does not exist`, 404);
      }

      const existingTask = existingTasks[0];
      
      // Check permissions - admin can edit all, users can only edit their own tasks
      if (auth.role !== 'admin' && 
          existingTask.created_by !== auth.userId && 
          existingTask.assigned_to !== auth.userId) {
        return errorResponse('Permission denied', 'You can only edit your own tasks', 403);
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return errorResponse('Invalid title', 'Title must be a non-empty string', 400);
        }
        updates.push('title = ?');
        params.push(title.trim());
      }
      
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description || null);
      }
      
      if (module_name !== undefined) {
        updates.push('module_name = ?');
        params.push(module_name || null);
      }
      
      if (status !== undefined) {
        const validStatuses = ['todo', 'in_progress', 'review', 'done', 'paused'];
        if (!validStatuses.includes(status)) {
          return errorResponse('Invalid status', `Status must be one of: ${validStatuses.join(', ')}`, 400);
        }
        updates.push('status = ?');
        params.push(status);
      }
      
      if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
          return errorResponse('Invalid priority', `Priority must be one of: ${validPriorities.join(', ')}`, 400);
        }
        updates.push('priority = ?');
        params.push(priority);
      }
      
      if (due_date !== undefined) {
        if (due_date === null || due_date === '') {
          updates.push('due_date = ?');
          params.push(null);
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
          return errorResponse('Invalid date format', 'Due date must be in YYYY-MM-DD format', 400);
        } else {
          updates.push('due_date = ?');
          params.push(due_date);
        }
      }
      
      if (estimated_hours !== undefined) {
        if (estimated_hours === null || estimated_hours === '') {
          updates.push('estimated_hours = ?');
          params.push(null);
        } else {
          const hours = parseFloat(estimated_hours);
          if (isNaN(hours) || hours < 0) {
            return errorResponse('Invalid estimated hours', 'Estimated hours must be a positive number', 400);
          }
          updates.push('estimated_hours = ?');
          params.push(hours);
        }
      }
      
      if (project_id !== undefined) {
        if (project_id === null || project_id === 'none' || project_id === '') {
          updates.push('project_id = ?');
          params.push(null);
        } else {
          const parsedId = parseInt(project_id);
          if (isNaN(parsedId)) {
            return errorResponse('Invalid project ID', 'Project ID must be a number', 400);
          }
          updates.push('project_id = ?');
          params.push(parsedId);
        }
      }
      
      if (assigned_to !== undefined) {
        let assignedTo = null;
        
        // Parse assigned_to value
        if (assigned_to === null || assigned_to === "unassigned" || assigned_to === "") {
          assignedTo = null; // Unassigned
        } else if (assigned_to === "current" || assigned_to === "myself") {
          assignedTo = auth.userId; // Assign to current user
        } else {
          // It should be a user ID
          const parsedId = parseInt(assigned_to);
          if (isNaN(parsedId)) {
            return errorResponse('Invalid assignee ID', 'Assignee ID must be a number', 400);
          }
          
          // Check permissions for assignment
          if (auth.role !== 'admin' && parsedId !== auth.userId) {
            return errorResponse('Permission denied', 'Regular users can only assign tasks to themselves', 403);
          }
          
          // Verify the target user exists (for admin)
          if (auth.role === 'admin' && parsedId !== auth.userId) {
            const [userCheck]: any = await connection.query(
              'SELECT id FROM users WHERE id = ?',
              [parsedId]
            );
            
            if (userCheck.length === 0) {
              return errorResponse('Invalid user', `User with ID ${parsedId} does not exist`, 404);
            }
          }
          
          assignedTo = parsedId;
        }
        
        updates.push('assigned_to = ?');
        params.push(assignedTo);
      }
      
      if (tags !== undefined) {
        if (tags === null || (Array.isArray(tags) && tags.length === 0)) {
          updates.push('tags = ?');
          params.push(null);
        } else if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
          return errorResponse('Invalid tags', 'Tags must be an array of strings', 400);
        } else {
          updates.push('tags = ?');
          params.push(JSON.stringify(tags));
        }
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = CURRENT_TIMESTAMP');

      if (updates.length === 0) {
        return errorResponse('No updates provided', 'Please provide fields to update', 400);
      }

      // Add task ID to params
      params.push(taskId);

      // Execute update
      await connection.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Get the updated task
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

      const updatedTask = updatedTasks[0];
      
      // Parse JSON tags for response
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
      
      // Add canEdit flag
      updatedTask.canEdit = auth.role === 'admin' || 
                           updatedTask.created_by === auth.userId || 
                           updatedTask.assigned_to === auth.userId;

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
    console.error('🔴 PUT /api/tasks error:', error);
    return serverErrorResponse(error);
  }
}

// DELETE task
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    // Get task ID from URL
    const url = new URL(request.url);
    const taskId = url.pathname.split('/').pop();
    
    if (!taskId || isNaN(parseInt(taskId))) {
      return errorResponse('Invalid task ID', 'Task ID is required and must be a number', 400);
    }

    const connection = await pool.getConnection();
    try {
      // First, check if task exists and user has permission
      const [existingTasks]: any = await connection.query(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );

      if (existingTasks.length === 0) {
        return errorResponse('Task not found', `Task with ID ${taskId} does not exist`, 404);
      }

      const existingTask = existingTasks[0];
      
      // Check permissions - admin can delete all, users can only delete their own tasks
      if (auth.role !== 'admin' && existingTask.created_by !== auth.userId) {
        return errorResponse('Permission denied', 'You can only delete your own tasks', 403);
      }

      // Delete the task
      await connection.query(
        `DELETE FROM tasks WHERE id = ?`,
        [taskId]
      );

      return successResponse('Task deleted successfully', {});

    } catch (dbError: any) {
      console.error('🔴 Database error in DELETE:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('🔴 DELETE /api/tasks error:', error);
    return serverErrorResponse(error);
  }
}