import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'tag', type: 'string' },
  { key: 'title', type: 'string' },
  { key: 'copy', type: 'string' },
  { key: 'icon', type: 'string' },
  { key: 'accent', type: 'string' },
  { key: 'gradient', type: 'string' },
  { key: 'link', type: 'string' },
  { key: 'order', type: 'number' },
  { key: 'active', type: 'boolean' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('highlights', fields, 'editor');
