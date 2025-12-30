import { NextRequest } from 'next/server'
import pool from '@/lib/db/connection'
import { authenticate } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401)
    }

    const connection = await pool.getConnection()
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get pending tasks count
      const [pendingResult]: any = await connection.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE status IN ('todo', 'in_progress', 'review') 
         AND (created_by = ? OR assigned_to = ?)`,
        [auth.userId, auth.userId]
      )
      
      // Get overdue tasks count
      const [overdueResult]: any = await connection.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE due_date < ? 
         AND status != 'done' 
         AND (created_by = ? OR assigned_to = ?)`,
        [today, auth.userId, auth.userId]
      )
      
      // Get today's tasks count
      const [todayResult]: any = await connection.query(
        `SELECT COUNT(*) as count FROM tasks 
         WHERE due_date = ? 
         AND (created_by = ? OR assigned_to = ?)`,
        [today, auth.userId, auth.userId]
      )

      return successResponse('Task counts retrieved', {
        pendingTasks: pendingResult[0]?.count || 0,
        overdueTasks: overdueResult[0]?.count || 0,
        todayTasks: todayResult[0]?.count || 0
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Tasks counts error:', error)
    return errorResponse(
      'Failed to fetch task counts', 
      error.message, 
      500,
      { pendingTasks: 0, overdueTasks: 0, todayTasks: 0 }
    )
  }
}