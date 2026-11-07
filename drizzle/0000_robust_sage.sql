CREATE TABLE "article_revisions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"article_id" varchar(64) NOT NULL,
	"author" varchar(128) NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb,
	"snapshot" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_views" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"article_id" varchar(64) NOT NULL,
	"session_id" text,
	"ip_hash" text,
	"referrer" text,
	"section" text,
	"country" text,
	"device" text,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"headline" text NOT NULL,
	"kicker" text,
	"trail" text,
	"body" text DEFAULT '' NOT NULL,
	"image" text,
	"video_url" text,
	"pillar" varchar(32) DEFAULT 'news' NOT NULL,
	"section" varchar(64) DEFAULT 'headlines' NOT NULL,
	"type" varchar(32) DEFAULT 'standard' NOT NULL,
	"author" varchar(128) DEFAULT 'Yanci' NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"live_updates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"series" text,
	"status" varchar(32) DEFAULT 'published' NOT NULL,
	"publish_at" timestamp with time zone,
	"slug" text,
	"meta_title" text,
	"meta_description" text,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"image_focal_x" integer DEFAULT 50,
	"image_focal_y" integer DEFAULT 50,
	"format" varchar(32),
	"is_breaking" boolean DEFAULT false NOT NULL,
	"breaking_until" timestamp with time zone,
	"review_status" varchar(32) DEFAULT 'approved' NOT NULL,
	"focal_point" jsonb,
	"saved_count" integer DEFAULT 0 NOT NULL,
	"source_url" text,
	"image_caption" text,
	"image_credit" text,
	"image_alt" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"co_author" text,
	"og_title" text,
	"og_description" text,
	"related_articles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autofetch_sources" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"url" text NOT NULL,
	"type" varchar(32) DEFAULT 'rss' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"election_id" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"party" text,
	"party_abbr" varchar(32),
	"running_mate" text,
	"bio" text,
	"avatar" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"manifesto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"article_id" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"body" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"owner_token" text,
	"status" varchar(32) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "election_results" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"election_id" varchar(64) NOT NULL,
	"candidate_id" varchar(64) NOT NULL,
	"state" varchar(64) NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"reporting_units" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"full_name" text,
	"date" text,
	"status" varchar(32) DEFAULT 'upcoming' NOT NULL,
	"type" varchar(32) DEFAULT 'general' NOT NULL,
	"electoral_body" text DEFAULT 'INEC',
	"description" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factchecks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"election_id" varchar(64),
	"claim" text NOT NULL,
	"claimant" text,
	"date" text,
	"verdict" varchar(32) NOT NULL,
	"explanation" text,
	"sources" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"article_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"link" text,
	"image" text,
	"category" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_layout" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_stats" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"change" text,
	"prefix" text,
	"suffix" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"token" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(64) NOT NULL,
	"invited_by" varchar(64),
	"expires_at" timestamp with time zone NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"token" varchar(128) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"description" text,
	"category" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_votes" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports_data" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"live_matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"standings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"upcoming_fixtures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(128) NOT NULL,
	"role" varchar(64) DEFAULT 'contributor' NOT NULL,
	"avatar" text,
	"bio" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_election_id_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revisions_article_id_idx" ON "article_revisions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "revisions_created_at_idx" ON "article_revisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "views_article_id_idx" ON "article_views" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "views_viewed_at_idx" ON "article_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_section_idx" ON "articles" USING btree ("section");--> statement-breakpoint
CREATE INDEX "articles_pillar_idx" ON "articles" USING btree ("pillar");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "articles_views_idx" ON "articles" USING btree ("views");--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "candidates_election_id_idx" ON "candidates" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX "comments_article_id_idx" ON "comments" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "results_election_id_idx" ON "election_results" USING btree ("election_id");--> statement-breakpoint
CREATE INDEX "results_candidate_id_idx" ON "election_results" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "factchecks_election_id_idx" ON "factchecks" USING btree ("election_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "pwd_resets_token_idx" ON "password_resets" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");