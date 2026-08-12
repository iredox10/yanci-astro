import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'key', type: 'string' },
  { key: 'value', type: 'string' },
  { key: 'description', type: 'string' },
  { key: 'category', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('settings', fields, 'admin');
