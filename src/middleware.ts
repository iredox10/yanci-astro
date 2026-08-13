import { defineMiddleware } from 'astro:middleware';
import { requireUser } from '@lib/auth';

const isAdminPath = (p: string) => p === '/admin' || p.startsWith('/admin/');
const isPublicAdminPath = (p: string) =>
  p.startsWith('/admin/login') ||
  p.startsWith('/admin/forgot-password') ||
  p.startsWith('/admin/reset-password');

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);
  if (!isAdminPath(pathname) || isPublicAdminPath(pathname)) return next();

  // Re-verify the session with Appwrite on every admin page request — the
  // cookie alone (stale, expired, or revoked session) is never enough.
  const auth = await requireUser(context.request);
  if (!auth.ok) {
    return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }
  return next();
});