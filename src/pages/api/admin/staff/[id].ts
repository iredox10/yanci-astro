import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'name', type: 'string' },
  { key: 'email', type: 'string' },
  { key: 'role', type: 'string' },
  { key: 'category', type: 'string' },
  { key: 'status', type: 'string' },
  { key: 'bio', type: 'string' },
  { key: 'image', type: 'string' },
  { key: 'order', type: 'number' },
  { key: 'pin', type: 'string' },
  { key: 'label', type: 'string' },
  { key: 'lastActive', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('staff', fields, 'admin');
