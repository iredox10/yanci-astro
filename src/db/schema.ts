import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── USERS & AUTH ────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    role: varchar('role', { length: 64 }).notNull().default('contributor'),
    avatar: text('avatar'),
    bio: text('bio'),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 128 }).primaryKey(), // session token
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_idx').on(table.expiresAt),
  ]
);

export const roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 64 }).notNull().unique(),
    description: text('description'),
    permissions: jsonb('permissions').default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const invitations = pgTable(
  'invitations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    token: varchar('token', { length: 128 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 64 }).notNull(),
    invitedBy: varchar('invited_by', { length: 64 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    accepted: boolean('accepted').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('invitations_token_idx').on(table.token),
    index('invitations_email_idx').on(table.email),
  ]
);

export const passwordResets = pgTable(
  'password_resets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    token: varchar('token', { length: 128 }).notNull().unique(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pwd_resets_token_idx').on(table.token),
  ]
);

// ─── ARTICLES & REVISIONS ────────────────────────────────────────────────────

export const articles = pgTable(
  'articles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    headline: text('headline').notNull(),
    kicker: text('kicker'),
    trail: text('trail'),
    body: text('body').default('').notNull(),
    image: text('image'),
    videoUrl: text('video_url'),
    pillar: varchar('pillar', { length: 32 }).notNull().default('news'),
    section: varchar('section', { length: 64 }).notNull().default('headlines'),
    type: varchar('type', { length: 32 }).default('standard').notNull(),
    author: varchar('author', { length: 128 }).default('Yanci').notNull(),
    isLive: boolean('is_live').default(false).notNull(),
    liveUpdates: jsonb('live_updates').default(sql`'[]'::jsonb`).notNull(),
    series: text('series'),
    status: varchar('status', { length: 32 }).notNull().default('published'),
    publishAt: timestamp('publish_at', { withTimezone: true }),
    slug: text('slug'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    isSensitive: boolean('is_sensitive').default(false).notNull(),
    imageFocalX: integer('image_focal_x').default(50),
    imageFocalY: integer('image_focal_y').default(50),
    format: varchar('format', { length: 32 }),
    isBreaking: boolean('is_breaking').default(false).notNull(),
    breakingUntil: timestamp('breaking_until', { withTimezone: true }),
    reviewStatus: varchar('review_status', { length: 32 }).default('approved').notNull(),
    focalPoint: jsonb('focal_point'),
    savedCount: integer('saved_count').default(0).notNull(),
    sourceUrl: text('source_url'),
    socialPosted: boolean('social_posted').default(false).notNull(),

    // Unpacked fields
    imageCaption: text('image_caption'),
    imageCredit: text('image_credit'),
    imageAlt: text('image_alt'),
    tags: jsonb('tags').default(sql`'[]'::jsonb`).notNull(),
    coAuthor: text('co_author'),
    ogTitle: text('og_title'),
    ogDescription: text('og_description'),
    relatedArticles: jsonb('related_articles').default(sql`'[]'::jsonb`).notNull(),

    views: integer('views').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('articles_status_idx').on(table.status),
    index('articles_section_idx').on(table.section),
    index('articles_pillar_idx').on(table.pillar),
    index('articles_created_at_idx').on(table.createdAt),
    index('articles_views_idx').on(table.views),
    index('articles_slug_idx').on(table.slug),
  ]
);

export const articleRevisions = pgTable(
  'article_revisions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    articleId: varchar('article_id', { length: 64 })
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    author: varchar('author', { length: 128 }).notNull(),
    diff: jsonb('diff').default(sql`'{}'::jsonb`),
    snapshot: jsonb('snapshot').default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('revisions_article_id_idx').on(table.articleId),
    index('revisions_created_at_idx').on(table.createdAt),
  ]
);

export const articleViews = pgTable(
  'article_views',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    articleId: varchar('article_id', { length: 64 }).notNull(),
    sessionId: text('session_id'),
    ipHash: text('ip_hash'),
    referrer: text('referrer'),
    section: text('section'),
    country: text('country'),
    device: text('device'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('views_article_id_idx').on(table.articleId),
    index('views_viewed_at_idx').on(table.viewedAt),
  ]
);

// ─── COMMENTS ────────────────────────────────────────────────────────────────

export const comments = pgTable(
  'comments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    articleId: varchar('article_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    body: text('body').notNull(),
    likes: integer('likes').default(0).notNull(),
    ownerToken: text('owner_token'),
    status: varchar('status', { length: 32 }).default('approved').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('comments_article_id_idx').on(table.articleId),
    index('comments_status_idx').on(table.status),
  ]
);

// ─── POLLS ───────────────────────────────────────────────────────────────────

export const polls = pgTable('polls', {
  id: varchar('id', { length: 64 }).primaryKey(),
  question: text('question').notNull(),
  description: text('description'),
  category: text('category'),
  options: jsonb('options').default(sql`'[]'::jsonb`).notNull(),
  totalVotes: integer('total_votes').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── ELECTIONS ───────────────────────────────────────────────────────────────

export const elections = pgTable('elections', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  fullName: text('full_name'),
  date: text('date'),
  status: varchar('status', { length: 32 }).default('upcoming').notNull(),
  type: varchar('type', { length: 32 }).default('general').notNull(),
  electoralBody: text('electoral_body').default('INEC'),
  description: text('description'),
  published: boolean('published').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const candidates = pgTable(
  'candidates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    electionId: varchar('election_id', { length: 64 })
      .notNull()
      .references(() => elections.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    party: text('party'),
    partyAbbr: varchar('party_abbr', { length: 32 }),
    runningMate: text('running_mate'),
    bio: text('bio'),
    avatar: text('avatar'),
    status: varchar('status', { length: 32 }).default('active').notNull(),
    manifesto: text('manifesto'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('candidates_election_id_idx').on(table.electionId),
  ]
);

export const electionResults = pgTable(
  'election_results',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    electionId: varchar('election_id', { length: 64 })
      .notNull()
      .references(() => elections.id, { onDelete: 'cascade' }),
    candidateId: varchar('candidate_id', { length: 64 })
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 64 }).notNull(),
    votes: integer('votes').default(0).notNull(),
    percentage: numeric('percentage', { precision: 5, scale: 2 }).default('0').notNull(),
    reportingUnits: integer('reporting_units').default(0).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('results_election_id_idx').on(table.electionId),
    index('results_candidate_id_idx').on(table.candidateId),
  ]
);

export const factChecks = pgTable(
  'factchecks',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    electionId: varchar('election_id', { length: 64 }),
    claim: text('claim').notNull(),
    claimant: text('claimant'),
    date: text('date'),
    verdict: varchar('verdict', { length: 32 }).notNull(),
    explanation: text('explanation'),
    sources: text('sources'),
    tags: jsonb('tags').default(sql`'[]'::jsonb`).notNull(),
    articleId: varchar('article_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('factchecks_election_id_idx').on(table.electionId),
  ]
);

// ─── HOMEPAGE, SETTINGS & WIDGETS ────────────────────────────────────────────

export const highlights = pgTable('highlights', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  link: text('link'),
  image: text('image'),
  category: text('category'),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
});

export const homepageStats = pgTable('homepage_stats', {
  id: varchar('id', { length: 64 }).primaryKey(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  change: text('change'),
  prefix: text('prefix'),
  suffix: text('suffix'),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
});

export const sportsData = pgTable('sports_data', {
  id: varchar('id', { length: 64 }).primaryKey(),
  liveMatches: jsonb('live_matches').default(sql`'[]'::jsonb`).notNull(),
  standings: jsonb('standings').default(sql`'[]'::jsonb`).notNull(),
  upcomingFixtures: jsonb('upcoming_fixtures').default(sql`'[]'::jsonb`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const homepageLayout = pgTable('homepage_layout', {
  id: varchar('id', { length: 64 }).primaryKey(),
  config: jsonb('config').default(sql`'{}'::jsonb`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull().default(''),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  active: boolean('active').default(true).notNull(),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const autofetchSources = pgTable('autofetch_sources', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  url: text('url').notNull(),
  type: varchar('type', { length: 32 }).default('rss').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastRun: timestamp('last_run', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb('keys').notNull(),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationsOutbox = pgTable('notifications_outbox', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url').notNull().default('/'),
  audience: varchar('audience', { length: 64 }).notNull().default('all'),
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
  sentCount: integer('sent_count').default(0).notNull(),
});

export const videos = pgTable(
  'videos',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    title: text('title').notNull().default(''),
    url: text('url').notNull().default(''),
    youtubeId: varchar('youtube_id', { length: 64 }).notNull().default(''),
    description: text('description').default(''),
    thumbnail: text('thumbnail').default(''),
    order: integer('order').notNull().default(0),
    published: boolean('published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('videos_order_idx').on(table.order),
  ]
);
