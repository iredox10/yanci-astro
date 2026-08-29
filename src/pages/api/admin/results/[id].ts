import { makeCrudHandler, type FieldSpec } from '@lib/admin-api';

export const prerender = false;

const fields: FieldSpec[] = [
  { key: 'electionId', type: 'string' },
  { key: 'state', type: 'string' },
  { key: 'region', type: 'string' },
  { key: 'candidateVotes', type: 'json' },
  { key: 'met25Threshold', type: 'json' },
  { key: 'winner', type: 'string' },
  { key: 'governor', type: 'string' },
  { key: 'senate', type: 'json' },
  { key: 'registeredVoters', type: 'number' },
  { key: 'accreditedVoters', type: 'number' },
  { key: 'validVotes', type: 'number' },
  { key: 'rejectedVotes', type: 'number' },
  { key: 'totalVotesCast', type: 'number' },
  { key: 'verified', type: 'boolean' },
];

export const { POST, PUT, DELETE } = makeCrudHandler('results', fields, 'editor');
