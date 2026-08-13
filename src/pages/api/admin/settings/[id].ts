import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'site_name', type: 'string' },
  { key: 'site_url', type: 'string' },
  { key: 'tagline', type: 'string' },
  { key: 'logo_url', type: 'string' },
  { key: 'favicon_url', type: 'string' },
  { key: 'contact_email', type: 'string' },
  { key: 'contact_phone', type: 'string' },
  { key: 'address', type: 'string' },
  { key: 'facebook_url', type: 'string' },
  { key: 'twitter_url', type: 'string' },
  { key: 'instagram_url', type: 'string' },
  { key: 'youtube_url', type: 'string' },
  { key: 'default_meta_desc', type: 'string' },
  { key: 'default_og_image', type: 'string' },
  { key: 'google_analytics_id', type: 'string' },
  { key: 'smtp_host', type: 'string' },
  { key: 'smtp_port', type: 'number' },
  { key: 'smtp_user', type: 'string' },
  { key: 'smtp_pass', type: 'string' },
  { key: 'maintenance_mode', type: 'string' },
  { key: 'maintenance_message', type: 'string' },
  { key: 'comments_enabled', type: 'string' },
  { key: 'newsletter_enabled', type: 'string' },
  { key: 'vapid_public_key', type: 'string' },
  { key: 'vapid_private_key', type: 'string' },
  { key: 'firebase_config', type: 'string' },
  { key: 'ticker_items', type: 'string' },
  { key: 'advertising_email', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('settings', fields, 'admin');