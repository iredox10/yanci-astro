import type { Poll, PollOption } from '../data/schema';
import { SEED_POLL } from '../data/seed';
import { db } from '@db';
import { polls } from '@db/schema';
import { eq, desc } from 'drizzle-orm';

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

function parseOptions(raw: unknown): PollOption[] {
  if (Array.isArray(raw)) {
    return raw.map((o: unknown, idx: number) => {
      if (typeof o === 'string') {
        try {
          return JSON.parse(o);
        } catch {
          return { id: `opt-${idx + 1}`, text: o, votes: 0 };
        }
      }
      return o as PollOption;
    });
  }
  return [];
}

/**
 * Fetch the active reader poll with vote counts and calculated percentages.
 */
export async function getActivePoll(): Promise<Poll> {
  if (db) {
    try {
      const [row] = await db
        .select()
        .from(polls)
        .where(eq(polls.active, true))
        .orderBy(desc(polls.createdAt))
        .limit(1);

      if (row) {
        return calculatePercentages({
          id: row.id,
          question: row.question,
          description: row.description ?? _memoryPoll.description,
          category: row.category ?? _memoryPoll.category,
          options: parseOptions(row.options),
          totalVotes: row.totalVotes ?? 0,
          active: row.active !== false,
        });
      }
    } catch {
      // Non-blocking fallback to memory
    }
  }

  return calculatePercentages(_memoryPoll);
}

/**
 * Record a vote for a poll option, updating counts and recomputing percentages.
 */
export async function recordVote(pollId: string, optionId: string): Promise<Poll | null> {
  if (!pollId || !optionId) return null;

  if (db) {
    try {
      const [row] = await db
        .select()
        .from(polls)
        .where(eq(polls.id, pollId))
        .limit(1);

      if (row) {
        const parsedOptions = parseOptions(row.options);
        const optionIndex = parsedOptions.findIndex((opt) => opt.id === optionId);
        if (optionIndex !== -1) {
          parsedOptions[optionIndex].votes = (parsedOptions[optionIndex].votes || 0) + 1;
          const newTotal = (row.totalVotes ?? 0) + 1;
          await db
            .update(polls)
            .set({
              options: parsedOptions,
              totalVotes: newTotal,
            })
            .where(eq(polls.id, pollId));

          return calculatePercentages({
            id: row.id,
            question: row.question,
            description: row.description ?? '',
            category: row.category ?? '',
            options: parsedOptions,
            totalVotes: newTotal,
            active: row.active !== false,
          });
        }
      }
    } catch {
      // fallback to memory
    }
  }

  // Memory fallback
  if (_memoryPoll.id !== pollId && _memoryPoll.$id !== pollId) {
    _memoryPoll.id = pollId;
  }

  const optionIndex = _memoryPoll.options.findIndex((opt) => opt.id === optionId);
  if (optionIndex === -1) {
    return null;
  }

  _memoryPoll.options[optionIndex].votes = (_memoryPoll.options[optionIndex].votes || 0) + 1;
  const updated = calculatePercentages(_memoryPoll);
  _memoryPoll = {
    ...updated,
    options: updated.options.map((opt) => ({ ...opt })),
  };

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
