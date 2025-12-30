import { NextRequest } from 'next/server';
import pool from '@/lib/db/connection';
import { authenticate } from '@/lib/auth';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

// GET team dashboard data with team transparency
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401);
    }

    const connection = await pool.getConnection();
    
    try {
      console.log('🔵 [Team Dashboard API] Fetching team data for:', {
        userId: auth.userId,
        role: auth.role,
        timestamp: new Date().toISOString()
      });

      // ============================================
      // TEAM TRANSPARENCY RULE #1: ALL USERS CAN SEE ALL USERS
      // ============================================
      
      // Fetch ALL users regardless of role
      const usersQuery = `
        SELECT 
          id, 
          name, 
          email, 
          role, 
          created_at,
          updated_at
        FROM users 
        ORDER BY name ASC
      `;

      const [users]: any = await connection.query(usersQuery);
      console.log('🔵 [Team Dashboard API] Users retrieved:', users.length);

      // ============================================
      // TASK VISIBILITY RULES
      // ============================================
      
      // Fetch ALL tasks for team transparency
      const tasksQuery = `
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
        ORDER BY t.created_at DESC
      `;

      const [tasks]: any = await connection.query(tasksQuery);
      console.log('🔵 [Team Dashboard API] Tasks retrieved:', tasks.length);

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
        
        // Add permission flags based on requester's role
        if (auth.role === 'admin') {
          // ADMIN: Full permissions on all tasks
          task.canEdit = true;
          task.canDelete = true;
          task.isReadOnly = false;
        } else {
          // USER: Can only edit/delete their own tasks
          const isOwner = task.created_by === auth.userId || task.assigned_to === auth.userId;
          task.canEdit = isOwner;
          task.canDelete = isOwner;
          task.isReadOnly = !isOwner;
        }
        
        return task;
      });

      // ============================================
      // ORGANIZE DATA BY USER WITH STATISTICS
      // ============================================
      
      const members = users.map((user: any) => {
        // Get all tasks related to this user
        const userTasks = tasksWithParsedTags.filter((task: any) => 
          task.created_by === user.id || task.assigned_to === user.id
        );
        
        // Calculate completion rate
        const completedCount = userTasks.filter((t: any) => t.status === 'done').length;
        const completionRate = userTasks.length > 0 
          ? Math.round((completedCount / userTasks.length) * 100) 
          : 0;
        
        // Get last active date
        const allUserTasks = [...userTasks];
        const lastActive = allUserTasks.length > 0 
          ? allUserTasks.sort((a: any, b: any) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0]?.updated_at 
          : null;
        
        // Calculate overdue tasks
        const overdueCount = userTasks.filter((t: any) => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        ).length;

        return {
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
          
          // Statistics
          taskCount: userTasks.length,
          completedCount: completedCount,
          inProgressCount: userTasks.filter((t: any) => t.status === 'in_progress').length,
          overdueCount: overdueCount,
          completionRate: completionRate,
          lastActive: lastActive,
          
          // Tasks array
          tasks: userTasks,
          
          // Extended statistics
          statistics: {
            totalTasks: userTasks.length,
            completedTasks: completedCount,
            inProgressTasks: userTasks.filter((t: any) => t.status === 'in_progress').length,
            overdueTasks: overdueCount,
            completionRate: completionRate,
            highPriorityTasks: userTasks.filter((t: any) => t.priority === 'high').length,
            mediumPriorityTasks: userTasks.filter((t: any) => t.priority === 'medium').length,
            lowPriorityTasks: userTasks.filter((t: any) => t.priority === 'low').length
          }
        };
      });

      // ============================================
      // CALCULATE TEAM-LEVEL STATISTICS
      // ============================================
      
      const totalTasks = tasksWithParsedTags.length;
      const completedTasks = tasksWithParsedTags.filter((t: any) => t.status === 'done').length;
      const overdueTasks = tasksWithParsedTags.filter((t: any) => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length;
      
      const activeMembers = members.filter((member: any) => 
        member.inProgressCount > 0
      ).length;
      
      const avgCompletionRate = members.length > 0 
        ? Math.round(members.reduce((sum: number, member: any) => 
            sum + member.completionRate, 0) / members.length
          )
        : 0;

      const admins = members.filter((m: any) => m.role === 'admin');
      const regularUsers = members.filter((m: any) => m.role === 'user');

      // Team statistics
      const teamStats = {
        totalMembers: members.length,
        adminCount: admins.length,
        userCount: regularUsers.length,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        overdueTasks: overdueTasks,
        activeMembers: activeMembers,
        avgCompletionRate: avgCompletionRate
      };

      // ============================================
      // PREPARE FINAL RESPONSE
      // ============================================
      const responseData = {
        // Main data
        teamStats: teamStats,
        members: members,
        memberCount: members.length,
        
        // For frontend compatibility
        summary: teamStats,
        
        // Requester info
        requester: {
          id: auth.userId,
          role: auth.role,
          permissions: {
            canSeeAllUsers: true,
            canSeeAllTasks: true,
            canEditAllTasks: auth.role === 'admin',
            canDeleteAllTasks: auth.role === 'admin',
            canAssignToAnyone: auth.role === 'admin'
          }
        },
        
        // Summary by role
        summaryByRole: {
          admin: {
            count: admins.length,
            totalTasks: admins.reduce((sum, m) => sum + m.taskCount, 0),
            avgCompletionRate: admins.length > 0
              ? Math.round(admins.reduce((sum, m) => sum + m.completionRate, 0) / admins.length)
              : 0
          },
          user: {
            count: regularUsers.length,
            totalTasks: regularUsers.reduce((sum, m) => sum + m.taskCount, 0),
            avgCompletionRate: regularUsers.length > 0
              ? Math.round(regularUsers.reduce((sum, m) => sum + m.completionRate, 0) / regularUsers.length)
              : 0
          }
        },
        
        // System message
        systemMessage: auth.role === 'admin' 
          ? 'Administrator view: Full access to all team data and tasks'
          : 'Team transparency view: You can see all team members and their tasks. Edit/delete permissions are restricted to your own tasks.'
      };

      console.log('✅ [Team Dashboard API] Response prepared:', {
        members: members.length,
        totalTasks: totalTasks,
        requesterRole: auth.role
      });

      return successResponse('Team dashboard data retrieved successfully', responseData);

    } catch (dbError: any) {
      console.error('🔴 [Team Dashboard API] Database error:', dbError);
      return errorResponse('Database error', dbError.message, 500);
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('🔴 [Team Dashboard API] Error:', error);
    return serverErrorResponse(error);
  }
}