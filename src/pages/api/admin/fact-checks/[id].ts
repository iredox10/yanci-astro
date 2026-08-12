import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'electionId', type: 'string' },
  { key: 'claim', type: 'string' },
  { key: 'claimant', type: 'string' },
  { key: 'claimantParty', type: 'string' },
  { key: 'verdict', type: 'string' },
  { key: 'analysis', type: 'string' },
  { key: 'source', type: 'string' },
  { key: 'date', type: 'string' },
  { key: 'relatedArticleId', type: 'string' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('factchecks', fields, 'editor');
