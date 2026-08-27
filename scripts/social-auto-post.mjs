#!/usr/bin/env node
/**
 * social-auto-post.mjs
 *
 * Standalone background worker to format and publish social media posts
 * (Twitter/X and Facebook Page) for published articles.
 *
 * Usage:
 *   node scripts/social-auto-post.mjs --check-recent [--dry-run]
 *   node scripts/social-auto-post.mjs <article_id> [--dry-run]
 *
 * Environment variables:
 *   PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT_ID,
 *   PUBLIC_APPWRITE_DATABASE_ID, PUBLIC_APPWRITE_COLLECTION_ARTICLES,
 *   APPWRITE_API_KEY, PUBLIC_SITE_URL
 *   TWITTER_BEARER_TOKEN, TWITTER_API_KEY, TWITTER_API_SECRET,
 *   TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 *   FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN
 */

import { Client, Databases, Query } from 'node-appwrite';
import dns from 'node:dns';
import crypto from 'node:crypto';
import { setGlobalDispatcher, Agent } from 'undici';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Force IPv4 DNS resolution for reliability
dns.setDefaultResultOrder('ipv4first');
setGlobalDispatcher(
  new Agent({
    connect: {
      timeout: 60000,
      lookup: (hostname, options, callback) =>
        dns.lookup(hostname, { ...options, family: 4 }, callback),
    },
    headersTimeout: 120000,
    bodyTimeout: 120000,
  }),
);

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

const ENDPOINT = env.PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = env.PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE = env.PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ARTICLES = env.PUBLIC_APPWRITE_COLLECTION_ARTICLES || 'articles';
const API_KEY = env.APPWRITE_API_KEY;
const SITE_URL = (env.PUBLIC_SITE_URL || 'https://yanci.ng').replace(/\/+$/, '');

// Twitter/X credentials
const TWITTER_BEARER_TOKEN = env.TWITTER_BEARER_TOKEN || '';
const TWITTER_API_KEY = env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = env.TWITTER_ACCESS_SECRET || '';

// Facebook credentials
const FACEBOOK_PAGE_ID = env.FACEBOOK_PAGE_ID || 'me';
const FACEBOOK_ACCESS_TOKEN = env.FACEBOOK_ACCESS_TOKEN || '';

const HASHTAGS = '#Yanci #Labarai';

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CHECK_RECENT = args.includes('--check-recent');
const SHOW_HELP = args.includes('--help') || args.includes('-h');
const positionalArgs = args.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));
const ARTICLE_ID = positionalArgs[0] || null;

if (SHOW_HELP || (!CHECK_RECENT && !ARTICLE_ID)) {
  console.log(`
social-auto-post.mjs - Social media auto-poster for Yanci articles

Usage:
  node scripts/social-auto-post.mjs --check-recent [--dry-run]
  node scripts/social-auto-post.mjs <article_id> [--dry-run]

Options:
  --check-recent   Find published articles in the last 24h where social_posted is not true
  --dry-run        Format and preview posts without calling APIs or updating the DB
  --help, -h       Show this help message

Configuration (via .env or environment):
  Appwrite:   PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY
  Twitter:    TWITTER_BEARER_TOKEN or (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
  Facebook:   FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID
`);
  process.exit(SHOW_HELP ? 0 : 1);
}

if (!PROJECT || !DATABASE || !API_KEY) {
  console.error(
    'Error: Missing required Appwrite environment variables (PUBLIC_APPWRITE_PROJECT_ID, PUBLIC_APPWRITE_DATABASE_ID, APPWRITE_API_KEY)',
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new Databases(client);

async function withRetry(fn, label, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const transport =
        error?.type === 'Error' ||
        /fetch failed|ETIMEDOUT|ENETUNREACH|ECONN|timeout/i.test(
          String(error?.cause ?? error),
        );
      if (i >= attempts || (error && !transport)) throw error;
      const wait = Math.min(2000 * 2 ** (i - 1), 15000);
      console.log(
        `    [retry] ${label} (attempt ${i}, wait ${wait}ms): ${error?.cause?.code ?? error?.code ?? 'network error'}`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** Helper: percent-encoding according to RFC 3986 for OAuth 1.0a */
function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Helper: generate OAuth 1.0a HMAC-SHA1 Authorization header */
function getOAuth1Header({ method, url, apiKey, apiSecret, accessToken, accessSecret }) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(', ')}`;
}

function getArticleUrl(article) {
  const identifier = article.slug || article.$id;
  return `${SITE_URL}/article/${identifier}`;
}

/** Formats a tweet text respecting the 280-character limit with 23-char t.co url */
function formatTwitterPost(article, articleUrl) {
  const headline = (article.headline || '').trim();
  const trail = (article.trail || '').trim();
  const tags = HASHTAGS;
  const url = articleUrl;

  // t.co URL counts as 23 characters
  const urlLen = 23;
  const tagLen = tags.length;
  const separatorLen = 4; // newlines & space
  const availableForText = 280 - (urlLen + tagLen + separatorLen);

  if (trail && headline.length + trail.length + 2 <= availableForText) {
    return `${headline}\n\n${trail}\n\n${url} ${tags}`;
  } else if (trail && headline.length + 10 <= availableForText) {
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

/** Formats a Facebook page post */
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
      'Authorization': authHeader,
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
    throw new Error(`Twitter API HTTP ${response.status}: ${JSON.stringify(json)}`);
  }

  return { configured: true, ok: true, id: json?.data?.id, response: json };
}

async function postToFacebook({ message, link }) {
  if (!FACEBOOK_ACCESS_TOKEN) {
    return { configured: false, skipped: true, reason: 'FACEBOOK_ACCESS_TOKEN not configured' };
  }

  const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(FACEBOOK_PAGE_ID)}/feed`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      link,
      access_token: FACEBOOK_ACCESS_TOKEN,
    }),
  });

  const responseBody = await response.text();
  let json;
  try {
    json = JSON.parse(responseBody);
  } catch {
    json = { raw: responseBody };
  }

  if (!response.ok) {
    throw new Error(`Facebook Graph API HTTP ${response.status}: ${JSON.stringify(json)}`);
  }

  return { configured: true, ok: true, id: json?.id, response: json };
}

async function processArticle(article) {
  const id = article.$id;
  const headline = article.headline || '(untitled)';
  const articleUrl = getArticleUrl(article);
  const isPublished = article.status === 'published';

  console.log(`\n------------------------------------------------------------`);
  console.log(`Processing article: ${id}`);
  console.log(`Headline: "${headline}"`);
  console.log(`Status: ${article.status || 'unknown'} (isLive: ${article.isLive})`);
  console.log(`URL: ${articleUrl}`);
  console.log(`social_posted: ${article.social_posted === true}`);

  if (!isPublished) {
    console.warn(`  [warn] Article is not in 'published' status (status="${article.status}").`);
  }

  const tweetText = formatTwitterPost(article, articleUrl);
  const fbPost = formatFacebookPost(article, articleUrl);

  const hasTwitterCreds = Boolean(
    (TWITTER_API_KEY && TWITTER_API_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET) ||
      TWITTER_BEARER_TOKEN,
  );
  const hasFacebookCreds = Boolean(FACEBOOK_ACCESS_TOKEN);

  console.log(`\n  [Twitter/X Post Preview (${tweetText.length} chars)]:`);
  console.log(`  -----------------------------------------`);
  console.log(tweetText.split('\n').map((l) => `  | ${l}`).join('\n'));
  console.log(`  -----------------------------------------`);
  console.log(`  Twitter credentials configured: ${hasTwitterCreds}`);

  console.log(`\n  [Facebook Post Preview]:`);
  console.log(`  -----------------------------------------`);
  console.log(fbPost.message.split('\n').map((l) => `  | ${l}`).join('\n'));
  console.log(`  | Link: ${fbPost.link}`);
  console.log(`  -----------------------------------------`);
  console.log(`  Facebook credentials configured: ${hasFacebookCreds}`);

  if (DRY_RUN) {
    console.log(`\n  [dry-run] Skipping actual social API calls and DB update.`);
    return { ok: true, dryRun: true };
  }

  if (!hasTwitterCreds && !hasFacebookCreds) {
    console.log(
      `\n  [skip] No social credentials configured (Twitter/Facebook tokens missing). Skipping post.`,
    );
    return { ok: false, reason: 'No credentials configured' };
  }

  const results = {};
  let anySuccess = false;

  // Twitter/X
  if (hasTwitterCreds) {
    try {
      console.log(`  Posting to Twitter/X...`);
      const twRes = await postToTwitter(tweetText);
      results.twitter = twRes;
      console.log(`  [Twitter/X] Successfully posted (Tweet ID: ${twRes.id || 'ok'})`);
      anySuccess = true;
    } catch (err) {
      console.error(`  [Twitter/X Error]:`, err.message || err);
      results.twitter = { ok: false, error: err.message };
    }
  }

  // Facebook
  if (hasFacebookCreds) {
    try {
      console.log(`  Posting to Facebook Page (${FACEBOOK_PAGE_ID})...`);
      const fbRes = await postToFacebook(fbPost);
      results.facebook = fbRes;
      console.log(`  [Facebook] Successfully posted (Post ID: ${fbRes.id || 'ok'})`);
      anySuccess = true;
    } catch (err) {
      console.error(`  [Facebook Error]:`, err.message || err);
      results.facebook = { ok: false, error: err.message };
    }
  }

  // If at least one configured network succeeded, mark social_posted: true
  if (anySuccess) {
    try {
      await withRetry(
        () =>
          databases.updateDocument(DATABASE, COLLECTION_ARTICLES, id, {
            social_posted: true,
          }),
        `updateDocument(${id}, social_posted=true)`,
      );
      console.log(`  [Appwrite] Updated article ${id}: social_posted = true`);
    } catch (err) {
      console.error(`  [Appwrite Error] Failed to update social_posted on ${id}:`, err.message || err);
    }
  }

  return { ok: anySuccess, results };
}

async function main() {
  const now = new Date();
  console.log(`\n=== Yanci Social Auto-Post Worker ===`);
  console.log(`Time: ${now.toISOString()}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE'}`);

  if (ARTICLE_ID) {
    console.log(`Target: Single Article ID "${ARTICLE_ID}"`);
    let article;
    try {
      article = await withRetry(
        () => databases.getDocument(DATABASE, COLLECTION_ARTICLES, ARTICLE_ID),
        `getDocument(${ARTICLE_ID})`,
      );
    } catch (err) {
      console.error(`Error: Could not retrieve article "${ARTICLE_ID}":`, err.message || err);
      process.exit(1);
    }
    await processArticle(article);
  } else if (CHECK_RECENT) {
    console.log(`Target: Published articles in last 24h where social_posted != true`);

    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    const cutoffIso = new Date(cutoffTime).toISOString();
    console.log(`Checking articles published since: ${cutoffIso}`);

    const perPage = 100;
    let offset = 0;
    const candidates = [];

    while (true) {
      const result = await withRetry(
        () =>
          databases.listDocuments(DATABASE, COLLECTION_ARTICLES, [
            Query.equal('status', 'published'),
            Query.orderDesc('$createdAt'),
            Query.limit(perPage),
            Query.offset(offset),
          ]),
        'listDocuments(status=published)',
      );

      const docs = result.documents || [];
      for (const doc of docs) {
        if (doc.social_posted === true) continue;
        const pubDateStr = doc.publishAt || doc.$createdAt;
        const pubTime = new Date(pubDateStr).getTime();
        if (!isNaN(pubTime) && pubTime >= cutoffTime) {
          candidates.push(doc);
        }
      }

      if (docs.length < perPage) break;
      offset += perPage;
    }

    console.log(`Found ${candidates.length} recent article(s) needing social media posts.`);

    if (candidates.length === 0) {
      console.log('No recent unposted articles found.\n');
      return;
    }

    let processed = 0;
    for (const article of candidates) {
      await processArticle(article);
      processed++;
    }

    console.log(`\n=== Social auto-post complete: processed ${processed} article(s) ===\n`);
  }
}

main().catch((err) => {
  console.error('\nFatal error in social-auto-post script:', err);
  process.exit(1);
});
