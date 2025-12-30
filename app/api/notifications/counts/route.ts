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
      // First, create notifications table if it doesn't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT,
          type ENUM('task', 'project', 'system', 'team') DEFAULT 'system',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      // Get unread notifications count
      const [result]: any = await connection.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND is_read = false`,
        [auth.userId]
      )

      return successResponse('Notification count retrieved', {
        unreadCount: result[0]?.count || 0
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Notifications count error:', error)
    return errorResponse(
      'Failed to fetch notification count', 
      error.message, 
      500,
      { unreadCount: 0 }
    )
  }
}