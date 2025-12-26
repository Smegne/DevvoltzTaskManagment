import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password with hash
export async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export function generateToken(userId: number, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('🔐 Token verification failed:', error);
    return null;
  }
}

// Middleware for protected routes
export async function authenticate(req: Request): Promise<{ userId: number; email: string; role: string } | null> {
  console.log('🔐 [Auth] Authenticating request');
  const authHeader = req.headers.get('authorization');
  console.log('🔐 Auth header present?', !!authHeader);
  
  if (authHeader) {
    console.log('🔐 Auth header:', authHeader.substring(0, 50) + '...');
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('🔐 No Bearer token found in header');
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  console.log('🔐 Token extracted (first 20 chars):', token.substring(0, 20) + '...');
  console.log('🔐 Token length:', token.length);
  
  const decoded = verifyToken(token);
  console.log('🔐 Token decoded:', decoded ? 'Success' : 'Failed');
  
  if (decoded) {
    console.log('🔐 Decoded user:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
  }
  
  return decoded;
}