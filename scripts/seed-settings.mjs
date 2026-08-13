import { Client, Databases, ID } from 'node-appwrite';
import { readFileSync } from 'node:fs';

const ENV = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const DEFAULT_SETTINGS = {
  site_name: 'Yanci',
  site_url: 'https://yanci.ng',
  tagline: 'Jaridar Hausa mai zuwa. Labarai, siyasa, wasanni da al’adu.',
  contact_email: 'labulabari@yanci.ng',
  advertising_email: 'tallace-tallace@yanci.ng',
  twitter_url: 'https://twitter.com/yanci_ng',
  facebook_url: 'https://facebook.com/yanci.ng',
  instagram_url: 'https://instagram.com/yanci_ng',
  youtube_url: '',
  ticker_items: 'Kasuwanci: Naira ta yi karanci a kasuwar hada-hadar kudade\nSiyasa: Zaben gabaɗaya 2027 na ci gaba da shirye-shirye\nWasanni: Super Eagles ta ci gaba da tashi a wasannin neman gurbi',
  default_meta_desc: 'Yanci: Jaridar Hausa mai zuwa. Labarai, siyasa, wasanni da al’adu a yaren Hausa.',
  maintenance_mode: false,
  maintenance_message: '',
  comments_enabled: true,
  newsletter_enabled: true,
};

const client = new Client()
  .setEndpoint(ENV.PUBLIC_APPWRITE_ENDPOINT)
  .setProject(ENV.PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(ENV.APPWRITE_API_KEY);
const db = new Databases(client);
const dbId = ENV.PUBLIC_APPWRITE_DATABASE_ID;
const collId = ENV.PUBLIC_APPWRITE_COLLECTION_SETTINGS;

if (!dbId || !collId) {
  console.error('Missing settings collection env vars');
  process.exit(1);
}

const existing = await db.listDocuments({ databaseId: dbId, collectionId: collId, queries: [] });
if (existing.documents.length > 0) {
  console.log('settings doc already exists — skipping (update via /admin/settings)');
  process.exit(0);
}

await db.createDocument({
  databaseId: dbId,
  collectionId: collId,
  documentId: ID.unique(),
  data: DEFAULT_SETTINGS,
});
console.log('settings doc seeded');