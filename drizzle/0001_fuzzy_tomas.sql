CREATE TABLE "notifications_outbox" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text DEFAULT '/' NOT NULL,
	"audience" varchar(64) DEFAULT 'all' NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL
);
