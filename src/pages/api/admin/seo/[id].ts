import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'seo_default_title', type: 'string' },
  { key: 'seo_default_description', type: 'string' },
  { key: 'seo_og_image', type: 'string' },
  { key: 'seo_twitter_handle', type: 'string' },
  { key: 'seo_google_verification', type: 'string' },
  { key: 'seo_bing_verification', type: 'string' },
  { key: 'ga_measurement_id', type: 'string' },
  { key: 'plausible_domain', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('settings', fields, 'admin');
