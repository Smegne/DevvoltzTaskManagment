import { NextRequest } from 'next/server'
import pool from '@/lib/db/connection'
import { authenticate } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) {
      return errorResponse('Authentication required', 'No valid token', 401)
    }

    const connection = await pool.getConnection()
    
    try {
      // Mark all notifications as read for this user
      await connection.query(
        `UPDATE notifications SET is_read = true 
         WHERE user_id = ? AND is_read = false`,
        [auth.userId]
      )

      return successResponse('All notifications marked as read', {
        markedRead: true
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Mark read error:', error)
    return errorResponse(
      'Failed to mark notifications as read', 
      error.message, 
      500
    )
  }
}