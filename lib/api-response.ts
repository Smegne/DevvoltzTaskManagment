import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(
  message: string,
  data?: T,
  status: number = 200
) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    message,
    data,
  }, { status });
}

export function errorResponse(
  message: string,
  error?: string,
  status: number = 400
) {
  return NextResponse.json<ApiResponse>({
    success: false,
    message,
    error,
  }, { status });
}

export function serverErrorResponse(error: any) {
  console.error('Server error:', error);
  return errorResponse(
    'Internal server error',
    error.message || 'Something went wrong',
    500
  );
}