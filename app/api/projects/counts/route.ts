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
      const [result]: any = await connection.query(
        `SELECT COUNT(*) as count FROM projects WHERE status = 'active'`
      )

      return successResponse('Project count retrieved', {
        activeProjects: result[0]?.count || 0
      })

    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Projects count error:', error)
    return errorResponse(
      'Failed to fetch project count', 
      error.message, 
      500,
      { activeProjects: 0 }
    )
  }
}