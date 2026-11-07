CREATE TABLE "videos" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"youtube_id" varchar(64) DEFAULT '' NOT NULL,
	"description" text DEFAULT '',
	"thumbnail" text DEFAULT '',
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "videos_order_idx" ON "videos" USING btree ("order");