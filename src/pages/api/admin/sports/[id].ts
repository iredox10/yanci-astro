import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'liveMatches', type: 'json' },
  { key: 'standings', type: 'json' },
  { key: 'fixtures', type: 'json' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('sports', fields, 'editor');
