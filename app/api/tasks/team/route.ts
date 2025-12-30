import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// GET team analytics data
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('statsOnly') === 'true';
    const includeTasks = searchParams.get('includeTasks') === 'true';
    const userId = searchParams.get('userId');

    const connection = await pool.getConnection();
    
    try {
      console.log('🔵 [Team API] Fetching team data for user:', auth.userId, 'role:', auth.role);

      // Fetch all users (admin sees all, regular users see only themselves)
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
      
      const usersParams: any[] = [];
      
      if (auth.role !== 'admin') {
        // Regular users can only see themselves
        usersQuery += ' AND id = ?';
        usersParams.push(auth.userId);
      }
      
      // Filter by specific user if provided (admin only)
      if (userId && auth.role === 'admin') {
        usersQuery += ' AND id = ?';
        usersParams.push(parseInt(userId));
      }
      
      usersQuery += ' ORDER BY name ASC';

      console.log('🔵 [Team API] Users query:', usersQuery);
      console.log('🔵 [Team API] Users params:', usersParams);

      const [users]: any = await connection.query(usersQuery, usersParams);
      
      console.log('🔵 [Team API] Users retrieved:', users.length);

      // If only stats are needed, return basic user info
      if (statsOnly) {
        const basicUsers = users.map((user: any) => ({
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }));

        return successResponse('Team stats retrieved successfully', {
          users: basicUsers,
          count: basicUsers.length
        });
      }

      // Fetch all tasks for analytics (with appropriate permissions)
      let tasksQuery = `
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
      
      const tasksParams: any[] = [];
      
      // Apply permissions filter
      if (auth.role !== 'admin') {
        // Regular users can only see their own tasks
        tasksQuery += ' AND (t.created_by = ? OR t.assigned_to = ?)';
        tasksParams.push(auth.userId, auth.userId);
      }
      
      // Filter by specific user if provided (admin only)
      if (userId && auth.role === 'admin') {
        tasksQuery += ' AND (t.created_by = ? OR t.assigned_to = ?)';
        tasksParams.push(parseInt(userId), parseInt(userId));
      }
      
      tasksQuery += ' ORDER BY t.created_at DESC';

      console.log('🔵 [Team API] Tasks query:', tasksQuery);
      console.log('🔵 [Team API] Tasks params:', tasksParams);

      const [tasks]: any = await connection.query(tasksQuery, tasksParams);
      
      console.log('🔵 [Team API] Tasks retrieved:', tasks.length);

      // Parse JSON tags if they exist
      const tasksWithParsedTags = tasks.map((task: any) => {
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
        
        return task;
      });

      // Calculate user statistics
      const usersWithStats = users.map((user: any) => {
        // Get user's tasks
        const userTasks = tasksWithParsedTags.filter((task: any) => 
          task.created_by === user.id || task.assigned_to === user.id
        );
        
        // Get tasks created by user
        const createdTasks = tasksWithParsedTags.filter((task: any) => 
          task.created_by === user.id
        );
        
        // Get tasks assigned to user
        const assignedTasks = tasksWithParsedTags.filter((task: any) => 
          task.assigned_to === user.id
        );
        
        // Get last active date from user's tasks
        const allUserTasks = [...createdTasks, ...assignedTasks];
        const lastActive = allUserTasks.length > 0 
          ? allUserTasks.sort((a: any, b: any) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0]?.updated_at 
          : null;
        
        // Calculate completion rate
        const completedCount = userTasks.filter((t: any) => t.status === 'done').length;
        const completionRate = userTasks.length > 0 
          ? Math.round((completedCount / userTasks.length) * 100) 
          : 0;
        
        return {
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
          
          // Statistics
          taskCount: userTasks.length,
          createdCount: createdTasks.length,
          assignedCount: assignedTasks.length,
          completedCount: completedCount,
          inProgressCount: userTasks.filter((t: any) => t.status === 'in_progress').length,
          pendingCount: userTasks.filter((t: any) => t.status === 'todo').length,
          reviewCount: userTasks.filter((t: any) => t.status === 'review').length,
          pausedCount: userTasks.filter((t: any) => t.status === 'paused').length,
          overdueCount: userTasks.filter((t: any) => 
            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
          ).length,
          highPriorityCount: userTasks.filter((t: any) => t.priority === 'high').length,
          mediumPriorityCount: userTasks.filter((t: any) => t.priority === 'medium').length,
          lowPriorityCount: userTasks.filter((t: any) => t.priority === 'low').length,
          
          // Performance metrics
          completionRate: completionRate,
          lastActive: lastActive,
          
          // Task IDs for reference
          taskIds: userTasks.map((t: any) => t.id),
          createdTaskIds: createdTasks.map((t: any) => t.id),
          assignedTaskIds: assignedTasks.map((t: any) => t.id)
        };
      });

      // Calculate team statistics
      const teamStats = {
        totalMembers: usersWithStats.length,
        adminCount: usersWithStats.filter((u: any) => u.role === 'admin').length,
        userCount: usersWithStats.filter((u: any) => u.role === 'user').length,
        
        // Task statistics
        totalTasks: tasksWithParsedTags.length,
        completedTasks: tasksWithParsedTags.filter((t: any) => t.status === 'done').length,
        inProgressTasks: tasksWithParsedTags.filter((t: any) => t.status === 'in_progress').length,
        todoTasks: tasksWithParsedTags.filter((t: any) => t.status === 'todo').length,
        reviewTasks: tasksWithParsedTags.filter((t: any) => t.status === 'review').length,
        pausedTasks: tasksWithParsedTags.filter((t: any) => t.status === 'paused').length,
        overdueTasks: tasksWithParsedTags.filter((t: any) => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        ).length,
        
        // Priority breakdown
        highPriorityTasks: tasksWithParsedTags.filter((t: any) => t.priority === 'high').length,
        mediumPriorityTasks: tasksWithParsedTags.filter((t: any) => t.priority === 'medium').length,
        lowPriorityTasks: tasksWithParsedTags.filter((t: any) => t.priority === 'low').length,
        
        // Performance metrics
        activeMembers: usersWithStats.filter((u: any) => u.inProgressCount > 0).length,
        avgCompletionRate: usersWithStats.length > 0 
          ? Math.round(usersWithStats.reduce((sum: number, user: any) => sum + user.completionRate, 0) / usersWithStats.length)
          : 0,
        
        // Time-based metrics (last 30 days)
        recentTasks: tasksWithParsedTags.filter((t: any) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(t.created_at) >= thirtyDaysAgo;
        }).length,
        
        // Top performers
        topPerformers: usersWithStats
          .filter((u: any) => u.taskCount > 0 && u.completionRate >= 80)
          .sort((a: any, b: any) => b.completionRate - a.completionRate)
          .slice(0, 5)
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            completionRate: u.completionRate,
            taskCount: u.taskCount
          })),
        
        // Members needing attention
        membersNeedingAttention: usersWithStats
          .filter((u: any) => u.overdueCount > 0 || (u.taskCount > 0 && u.completionRate < 50))
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            overdueCount: u.overdueCount,
            completionRate: u.completionRate
          }))
      };

      // Prepare response data
      const responseData: any = {
        teamStats,
        members: usersWithStats.sort((a: any, b: any) => b.taskCount - a.taskCount),
        memberCount: usersWithStats.length
      };

      // Include tasks if requested
      if (includeTasks) {
        responseData.tasks = tasksWithParsedTags;
        responseData.taskCount = tasksWithParsedTags.length;
      }

      // Add summary by role
      responseData.summaryByRole = {
        admin: {
          count: usersWithStats.filter((u: any) => u.role === 'admin').length,
          totalTasks: usersWithStats
            .filter((u: any) => u.role === 'admin')
            .reduce((sum: number, u: any) => sum + u.taskCount, 0),
          avgCompletionRate: usersWithStats.filter((u: any) => u.role === 'admin').length > 0
            ? Math.round(usersWithStats
                .filter((u: any) => u.role === 'admin')
                .reduce((sum: number, u: any) => sum + u.completionRate, 0) / 
                usersWithStats.filter((u: any) => u.role === 'admin').length)
            : 0
        },
        user: {
          count: usersWithStats.filter((u: any) => u.role === 'user').length,
          totalTasks: usersWithStats
            .filter((u: any) => u.role === 'user')
            .reduce((sum: number, u: any) => sum + u.taskCount, 0),
          avgCompletionRate: usersWithStats.filter((u: any) => u.role === 'user').length > 0
            ? Math.round(usersWithStats
                .filter((u: any) => u.role === 'user')
                .reduce((sum: number, u: any) => sum + u.completionRate, 0) / 
                usersWithStats.filter((u: any) => u.role === 'user').length)
            : 0
        }
      };

      return successResponse('Team analytics retrieved successfully', responseData);

    } catch (dbError: any) {
      console.error('🔴 [Team API] Database error:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('🔴 [Team API] Error:', error);
    return serverErrorResponse(error);
  }
}