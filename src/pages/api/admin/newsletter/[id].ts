import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'name', type: 'string' },
  { key: 'email', type: 'string' },
  { key: 'status', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('newsletter', fields, 'editor');
