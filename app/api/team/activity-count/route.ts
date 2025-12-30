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
      // Count users with recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const oneDayAgoStr = oneDayAgo.toISOString().slice(0, 19).replace('T', ' ')
      
      // First, add last_login column to users table if it doesn't exist
      try {
        await connection.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL
        `)
      } catch (alterError) {
        console.log('Column may already exist or table structure issue:', alterError)
      }

      const [result]: any = await connection.query(
        `SELECT COUNT(DISTINCT u.id) as count 
         FROM users u
         LEFT JOIN tasks t ON u.id = t.assigned_to OR u.id = t.created_by
         WHERE t.updated_at >= ? OR u.last_login >= ?`,
        [oneDayAgoStr, oneDayAgoStr]
      )

      return successResponse('Team activity count retrieved', {
        activeMembers: result[0]?.count || 0
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Team activity count error:', error)
    return errorResponse(
      'Failed to fetch team activity', 
      error.message, 
      500,
      { activeMembers: 0 }
    )
  }
}