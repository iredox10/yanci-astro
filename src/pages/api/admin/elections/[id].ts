import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'name', type: 'string' },
  { key: 'fullName', type: 'string' },
  { key: 'date', type: 'string' },
  { key: 'type', type: 'string' },
  { key: 'status', type: 'string' },
  { key: 'electoralBody', type: 'string' },
  { key: 'description', type: 'string' },
  { key: 'image', type: 'string' },
  { key: 'published', type: 'boolean' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('elections', fields, 'editor');
