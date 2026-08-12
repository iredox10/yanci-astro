import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'name', type: 'string' },
  { key: 'url', type: 'string' },
  { key: 'type', type: 'string' },
  { key: 'isActive', type: 'boolean' },
  { key: 'labels', type: 'string[]' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('autofetch', fields, 'editor');
