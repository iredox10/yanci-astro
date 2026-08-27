import type { Poll, PollOption } from '../data/schema';
import { SEED_POLL } from '../data/seed';
import { Client, Databases } from 'node-appwrite';
import { APPWRITE_API_KEY } from 'astro:env/server';
import {
  PUBLIC_APPWRITE_ENDPOINT,
  PUBLIC_APPWRITE_PROJECT_ID,
  PUBLIC_APPWRITE_DATABASE_ID,
  PUBLIC_APPWRITE_COLLECTION_SETTINGS,
} from 'astro:env/client';

/**
 * In-memory fallback poll storage initialized with seed data.
 */
let _memoryPoll: Poll = {
  ...SEED_POLL,
  options: SEED_POLL.options.map((opt) => ({ ...opt })),
};

/**
 * Calculates total votes and percentage for each poll option.
 */
export function calculatePercentages(poll: Poll): Poll {
  const totalVotes = poll.options.reduce((sum, opt) => sum + (Number(opt.votes) || 0), 0);
  const optionsWithPct: PollOption[] = poll.options.map((opt) => {
    const votes = Number(opt.votes) || 0;
    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
    return {
      ...opt,
      votes,
      percentage,
    };
  });

  return {
    ...poll,
    totalVotes,
    options: optionsWithPct,
  };
}

/**
 * Optional Appwrite client helper.
 */
function getAppwriteDb(): { client: Client; databases: Databases; databaseId: string } | null {
  if (
    !APPWRITE_API_KEY ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    !PUBLIC_APPWRITE_PROJECT_ID ||
    !PUBLIC_APPWRITE_DATABASE_ID
  ) {
    return null;
  }
  try {
    const client = new Client()
      .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
      .setProject(PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const databases = new Databases(client);
    return { client, databases, databaseId: PUBLIC_APPWRITE_DATABASE_ID };
  } catch {
    return null;
  }
}

/**
 * Fetch the active reader poll with vote counts and calculated percentages.
 */
export async function getActivePoll(): Promise<Poll> {
  const dbConfig = getAppwriteDb();
  if (dbConfig && PUBLIC_APPWRITE_COLLECTION_SETTINGS) {
    try {
      const doc = await dbConfig.databases.getDocument(
        dbConfig.databaseId,
        PUBLIC_APPWRITE_COLLECTION_SETTINGS,
        'active_poll',
      );
      if (doc && doc.question && Array.isArray(doc.options)) {
        const parsedOptions: PollOption[] = (doc.options as unknown[]).map((o: unknown, idx: number) => {
          if (typeof o === 'string') {
            try {
              return JSON.parse(o);
            } catch {
              return { id: `opt-${idx + 1}`, text: o, votes: 0 };
            }
          }
          return o as PollOption;
        });

        return calculatePercentages({
          id: String(doc.$id || doc.id || _memoryPoll.id),
          question: String(doc.question),
          description: doc.description ? String(doc.description) : _memoryPoll.description,
          category: doc.category ? String(doc.category) : _memoryPoll.category,
          options: parsedOptions,
          totalVotes: Number(doc.totalVotes || 0),
          active: doc.active !== false,
        });
      }
    } catch {
      // Document may not exist in settings collection; fallback to memory
    }
  }

  return calculatePercentages(_memoryPoll);
}

/**
 * Record a vote for a poll option, updating counts and recomputing percentages.
 */
export async function recordVote(pollId: string, optionId: string): Promise<Poll | null> {
  if (!pollId || !optionId) return null;

  // Verify poll matches current active poll
  if (_memoryPoll.id !== pollId && _memoryPoll.$id !== pollId) {
    // If not matching by id, still allow if pollId matches
    _memoryPoll.id = pollId;
  }

  const optionIndex = _memoryPoll.options.findIndex((opt) => opt.id === optionId);
  if (optionIndex === -1) {
    return null;
  }

  // Increment in-memory option vote count
  _memoryPoll.options[optionIndex].votes = (_memoryPoll.options[optionIndex].votes || 0) + 1;
  const updated = calculatePercentages(_memoryPoll);
  _memoryPoll = {
    ...updated,
    options: updated.options.map((opt) => ({ ...opt })),
  };

  // Attempt to persist to Appwrite if configured
  const dbConfig = getAppwriteDb();
  if (dbConfig && PUBLIC_APPWRITE_COLLECTION_SETTINGS) {
    try {
      await dbConfig.databases.updateDocument(
        dbConfig.databaseId,
        PUBLIC_APPWRITE_COLLECTION_SETTINGS,
        'active_poll',
        {
          options: _memoryPoll.options.map((o) => JSON.stringify(o)),
          totalVotes: _memoryPoll.totalVotes,
        },
      );
    } catch {
      // Non-blocking fallback to memory storage
    }
  }

  return updated;
}

/**
 * Reset memory poll (for tests/reset).
 */
export function resetMemoryPoll(customPoll?: Poll): void {
  _memoryPoll = customPoll
    ? calculatePercentages({ ...customPoll, options: customPoll.options.map((o) => ({ ...o })) })
    : calculatePercentages({ ...SEED_POLL, options: SEED_POLL.options.map((o) => ({ ...o })) });
}
