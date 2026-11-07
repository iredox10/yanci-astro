#!/usr/bin/env node
/**
 * social-auto-post.mjs
 *
 * Standalone background worker to format and publish social media posts
 * (Twitter/X and Facebook Page) for published articles.
 * Designed to run on Heroku Scheduler (e.g. every 10-30 mins).
 */

import pg from 'pg';
import dns from 'node:dns';
import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

dns.setDefaultResultOrder('ipv4first');

function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };

const SITE_URL = (env.PUBLIC_SITE_URL || 'https://yanci.ng').replace(/\/$/, '');
const DATABASE_URL = env.DATABASE_URL;

// Twitter / X
const TWITTER_BEARER_TOKEN = env.TWITTER_BEARER_TOKEN;
const TWITTER_API_KEY = env.TWITTER_API_KEY;
const TWITTER_API_SECRET = env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = env.TWITTER_ACCESS_SECRET;

// Facebook
const FACEBOOK_PAGE_ID = env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = env.FACEBOOK_ACCESS_TOKEN;

const HASHTAGS = '#Yanci #Labarai #Najeriya #Hausa';
const TCO_LENGTH = 23;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CHECK_RECENT = args.includes('--check-recent');
const ARTICLE_ID = args.find((a) => !a.startsWith('--'));

if (!ARTICLE_ID && !CHECK_RECENT) {
  console.log(`
Usage:
  node scripts/social-auto-post.mjs --check-recent [--dry-run]
  node scripts/social-auto-post.mjs <article_id> [--dry-run]
  `);
  process.exit(0);
}

if (!DATABASE_URL) {
  console.error('[social-auto-post] ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 1,
});

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function getOAuth1Header({ method, url, apiKey, apiSecret, accessToken, accessSecret }) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join('&');
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  oauthParams.oauth_signature = signature;
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

function formatTwitterPost(article, articleUrl) {
  const headline = (article.headline || '').trim();
  const trail = (article.trail || '').trim();
  const url = articleUrl;
  const tags = HASHTAGS;

  const urlAndTags = `\n\n${url} ${tags}`;
  const availableForText = 280 - (TCO_LENGTH + 2 + tags.length + 2);

  if (headline.length + 2 + trail.length <= availableForText) {
    return `${headline}\n\n${trail}${urlAndTags}`;
  } else if (headline.length + 5 <= availableForText && trail.length > 0) {
    const maxTrail = availableForText - headline.length - 5;
    const truncatedTrail = trail.slice(0, maxTrail).replace(/[,\s]+$/, '') + '...';
    return `${headline}\n\n${truncatedTrail}\n\n${url} ${tags}`;
  } else if (headline.length > availableForText) {
    const truncatedHeadline = headline.slice(0, availableForText - 3).replace(/[,\s]+$/, '') + '...';
    return `${truncatedHeadline}\n\n${url} ${tags}`;
  } else {
    return `${headline}\n\n${url} ${tags}`;
  }
}

function formatFacebookPost(article, articleUrl) {
  const headline = (article.headline || '').trim();
  const trail = (article.trail || '').trim();
  const tags = HASHTAGS;

  const parts = [headline];
  if (trail) parts.push(trail);
  parts.push(tags);

  return {
    message: parts.join('\n\n'),
    link: articleUrl,
  };
}

async function postToTwitter(tweetText) {
  const endpoint = 'https://api.twitter.com/2/tweets';
  const hasOAuth1 = TWITTER_API_KEY && TWITTER_API_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET;
  const hasBearer = Boolean(TWITTER_BEARER_TOKEN);

  if (!hasOAuth1 && !hasBearer) {
    return { configured: false, skipped: true, reason: 'No Twitter credentials configured' };
  }

  let authHeader = '';
  if (hasOAuth1) {
    authHeader = getOAuth1Header({
      method: 'POST',
      url: endpoint,
      apiKey: TWITTER_API_KEY,
      apiSecret: TWITTER_API_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_SECRET,
    });
  } else {
    authHeader = `Bearer ${TWITTER_BEARER_TOKEN}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: tweetText }),
  });

  const responseBody = await response.text();
  let json;
  try {
    json = JSON.parse(responseBody);
  } catch {
    json = { raw: responseBody };
  }

  if (!response.ok) {
    throw new Error(`Twitter API error (${response.status}): ${JSON.stringify(json)}`);
  }

  return { ok: true, data: json };
}

async function postToFacebook(fbPost) {
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_ACCESS_TOKEN) {
    return { configured: false, skipped: true, reason: 'No Facebook credentials configured' };
  }

  const endpoint = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`;
  const url = new URL(endpoint);
  url.searchParams.set('message', fbPost.message);
  url.searchParams.set('link', fbPost.link);
  url.searchParams.set('access_token', FACEBOOK_ACCESS_TOKEN);

  const response = await fetch(url.toString(), { method: 'POST' });
  const responseBody = await response.text();
  let json;
  try {
    json = JSON.parse(responseBody);
  } catch {
    json = { raw: responseBody };
  }

  if (!response.ok) {
    throw new Error(`Facebook API error (${response.status}): ${JSON.stringify(json)}`);
  }

  return { ok: true, data: json };
}

async function processArticle(article) {
  const id = article.id;
  const headline = article.headline || '(untitled)';
  const articleUrl = `${SITE_URL}/article/${id}`;

  console.log(`\n----------------------------------------`);
  console.log(`Processing: "${headline}" (ID: ${id})`);
  console.log(`URL: ${articleUrl}`);

  const tweetText = formatTwitterPost(article, articleUrl);
  const fbPost = formatFacebookPost(article, articleUrl);

  if (DRY_RUN) {
    console.log('\n[DRY RUN - Twitter Preview]:\n' + tweetText);
    console.log('\n[DRY RUN - Facebook Preview]:\n' + fbPost.message);
    return { ok: true, dryRun: true };
  }

  let anySuccess = false;

  // Twitter
  try {
    const twRes = await postToTwitter(tweetText);
    if (twRes.ok) {
      console.log(`  [Twitter] Successfully posted!`);
      anySuccess = true;
    }
  } catch (err) {
    console.error(`  [Twitter Error]:`, err.message || err);
  }

  // Facebook
  try {
    const fbRes = await postToFacebook(fbPost);
    if (fbRes.ok) {
      console.log(`  [Facebook] Successfully posted!`);
      anySuccess = true;
    }
  } catch (err) {
    console.error(`  [Facebook Error]:`, err.message || err);
  }

  if (anySuccess) {
    try {
      await pool.query('UPDATE articles SET social_posted = true WHERE id = $1', [id]);
      console.log(`  [DB] Updated article ${id}: social_posted = true`);
    } catch (err) {
      console.error(`  [DB Error] Failed to update social_posted on ${id}:`, err);
    }
  }

  return { ok: anySuccess };
}

async function main() {
  const now = new Date();
  console.log(`\n=== Yanci Social Auto-Post Worker ===`);
  console.log(`Time: ${now.toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  try {
    if (ARTICLE_ID) {
      const res = await pool.query('SELECT * FROM articles WHERE id = $1 LIMIT 1', [ARTICLE_ID]);
      if (!res.rows.length) {
        console.error(`Article ${ARTICLE_ID} not found.`);
        process.exit(1);
      }
      await processArticle(res.rows[0]);
    } else if (CHECK_RECENT) {
      const res = await pool.query(`
        SELECT * FROM articles
        WHERE status = 'published'
          AND (social_posted IS NULL OR social_posted = false)
          AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 50
      `);

      console.log(`Found ${res.rows.length} unposted recent article(s).`);
      for (const row of res.rows) {
        await processArticle(row);
      }
    }
  } catch (err) {
    console.error('[social-auto-post] Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
