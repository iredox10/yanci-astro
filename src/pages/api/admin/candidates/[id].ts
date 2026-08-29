import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'electionId', type: 'string' },
  { key: 'name', type: 'string' },
  { key: 'party', type: 'string' },
  { key: 'position', type: 'string' },
  { key: 'age', type: 'number' },
  { key: 'state', type: 'string' },
  { key: 'education', type: 'string' },
  { key: 'platform', type: 'json' },
  { key: 'runningMate', type: 'string' },
  { key: 'previousOffice', type: 'string' },
  { key: 'image', type: 'string' },
  { key: 'order', type: 'number' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('candidates', fields, 'editor');
