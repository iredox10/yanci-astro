import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'electionId', type: 'string' },
  { key: 'name', type: 'string' },
  { key: 'party', type: 'string' },
  { key: 'position', type: 'string' },
  { key: 'state', type: 'string' },
  { key: 'education', type: 'string' },
  { key: 'platform', type: 'string' },
  { key: 'runningMate', type: 'string' },
  { key: 'previousOffice', type: 'string' },
  { key: 'image', type: 'string' },
  { key: 'order', type: 'number' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('candidates', fields, 'editor');
