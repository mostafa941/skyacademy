import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { connectToDatabase } from './db';
import User, { UserRole } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'sky_academy_secret_token_key';
export const TOKEN_COOKIE_NAME = 'sky_auth_token';

export interface TokenPayload {
  userId: string;
  name: string;
  role: UserRole;
  phone?: string;
  email?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export async function getCurrentUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  await connectToDatabase();
  const user = await User.findById(payload.userId).select('-password');
  return user;
}

/**
 * Ensures default Admin and Secretary accounts exist in the database
 */
export async function seedDefaultUsersIfNeeded() {
  await connectToDatabase();
  const existingAdmin = await User.findOne({ email: 'admin@sky.com' });
  if (!existingAdmin) {
    await User.create({
      name: 'مدير النظام',
      email: 'admin@sky.com',
      phone: '01000000000',
      password: 'admin1234',
      role: 'admin',
    });
    console.log('Default Admin user created: admin@sky.com / admin1234');
  } else if (existingAdmin.password !== 'admin1234') {
    existingAdmin.password = 'admin1234';
    await existingAdmin.save();
  }

  const existingSecretary = await User.findOne({ email: 'secretary@sky.com' });
  if (!existingSecretary) {
    await User.create({
      name: 'السكرتيرة',
      email: 'secretary@sky.com',
      phone: '01111111111',
      password: 'sec1234',
      role: 'secretary',
    });
    console.log('Default Secretary user created: secretary@sky.com / sec1234');
  } else if (existingSecretary.password !== 'sec1234') {
    existingSecretary.password = 'sec1234';
    await existingSecretary.save();
  }
}
