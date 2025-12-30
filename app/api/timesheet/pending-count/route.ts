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
      // First, create timesheet_entries table if it doesn't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS timesheet_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          task_id INT,
          project_id INT,
          date DATE NOT NULL,
          hours DECIMAL(5,2) NOT NULL,
          description TEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        )
      `)

      // Get pending timesheet entries count for current user
      const [result]: any = await connection.query(
        `SELECT COUNT(*) as count FROM timesheet_entries 
         WHERE user_id = ? AND status = 'pending'`,
        [auth.userId]
      )

      return successResponse('Timesheet pending count retrieved', {
        pendingEntries: result[0]?.count || 0
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Timesheet count error:', error)
    return errorResponse(
      'Failed to fetch timesheet count', 
      error.message, 
      500,
      { pendingEntries: 0 }
    )
  }
}