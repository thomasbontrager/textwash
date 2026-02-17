import { Response } from 'express';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // CSRF protection: prevents cookies from being sent in cross-site requests
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/'
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, COOKIE_OPTIONS);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  });
}

export function getAuthCookieOptions() {
  return COOKIE_OPTIONS;
}
