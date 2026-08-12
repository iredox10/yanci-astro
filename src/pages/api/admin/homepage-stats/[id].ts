import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'label', type: 'string' },
  { key: 'value', type: 'number' },
  { key: 'suffix', type: 'string' },
  { key: 'icon', type: 'string' },
  { key: 'order', type: 'number' },
  { key: 'active', type: 'boolean' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('stats', fields, 'editor');
