import type { APIRoute } from 'astro';
import { Client, Databases, Query, Users } from 'node-appwrite';
import {
  APPWRITE_API_KEY,
  APPWRITE_COLLECTION_INVITATIONS,
} from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
} from 'astro:env/client';
import { sanitizePlainText } from '@lib/sanitize';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Bad JSON' }, 400);
  }

  const token = sanitizePlainText(String(body.token ?? ''), 128);
  const password = String(body.password ?? '');
  const name = sanitizePlainText(String(body.name ?? ''), 120);

  if (!token || password.length < 8) {
    return json({ ok: false, message: 'Password must be at least 8 characters' }, 422);
  }

  if (!APPWRITE_API_KEY || !PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT_ID || !PUBLIC_APPWRITE_DATABASE_ID || !APPWRITE_COLLECTION_INVITATIONS) {
    return json({ ok: false, message: 'Invite flow unavailable' }, 503);
  }

  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const db = new Databases(client);
    const users = new Users(client);

    const found = await db.listDocuments({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: APPWRITE_COLLECTION_INVITATIONS,
      queries: [Query.equal('token', token), Query.limit(1)],
    });
    const invite = found?.documents?.[0];
    if (!invite || String(invite.status ?? 'pending') !== 'pending') {
      return json({ ok: false, message: 'Invitation not found or already used' }, 404);
    }
    if (invite.expires_at && new Date(String(invite.expires_at)).getTime() < Date.now()) {
      return json({ ok: false, message: 'Invitation expired' }, 410);
    }

    const email = String(invite.email ?? '').trim().toLowerCase();
    const role = String(invite.role ?? 'contributor');
    const displayName = name || String(invite.name ?? '') || email.split('@')[0];

    let user;
    try {
      user = await users.create({ userId: 'unique()', email, password, name: displayName });
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (!/already|exists|unique/i.test(msg)) throw error;
      const existing = await users.list({ queries: [Query.equal('email', email), Query.limit(1)] });
      user = existing.users[0];
      if (!user) throw error;
    }
    await users.updateLabels({ userId: user.$id, labels: [role] });

    await db.updateDocument({
      databaseId: PUBLIC_APPWRITE_DATABASE_ID,
      collectionId: APPWRITE_COLLECTION_INVITATIONS,
      documentId: invite.$id,
      data: { status: 'accepted', accepted_by: user.$id, accepted_at: new Date().toISOString() },
    });

    return json({ ok: true, message: 'Account created — you can now sign in.' }, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error';
    console.error('[invite] accept failed', error);
    const emailTaken = /already|exists|unique/i.test(msg);
    return json(
      { ok: false, message: emailTaken ? 'An account with this email already exists' : 'Could not create account — try again' },
      emailTaken ? 409 : 500,
    );
  }
};
