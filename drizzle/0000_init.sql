CREATE TABLE "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"version" integer NOT NULL,
	"round" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"role" text NOT NULL,
	"decision" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"seq" integer NOT NULL,
	"at" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"summary" text NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"version" integer NOT NULL,
	"rulebook_version" integer NOT NULL,
	"kind" text NOT NULL,
	"stats" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"version" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"role" text NOT NULL,
	"body" text NOT NULL,
	"quote" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"image_text" text DEFAULT '' NOT NULL,
	"image_data" text,
	"image_analysis" jsonb,
	"alt_text" text DEFAULT '' NOT NULL,
	"note" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"channel" text NOT NULL,
	"audience" text NOT NULL,
	"region" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"intent" jsonb,
	"intent_confirmed" boolean DEFAULT false NOT NULL,
	"required_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_round" integer DEFAULT 0 NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"statement" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" text NOT NULL,
	"owner" text NOT NULL,
	"valid_until" text NOT NULL,
	"superseded_by" text,
	"supports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"check_id" integer NOT NULL,
	"content_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"version" integer NOT NULL,
	"rule_code" text NOT NULL,
	"rule_title" text NOT NULL,
	"rulebook_version" integer NOT NULL,
	"source_page" integer,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"field" text NOT NULL,
	"quote" text NOT NULL,
	"start" integer DEFAULT -1 NOT NULL,
	"end" integer DEFAULT -1 NOT NULL,
	"message" text NOT NULL,
	"suggestion" text,
	"fact_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"method" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_reason" text,
	"resolved_by" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rulebook_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"version" integer NOT NULL,
	"note" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"version" integer NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"statement" text NOT NULL,
	"severity" text NOT NULL,
	"check_type" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"examples_do" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examples_dont" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_doc" text NOT NULL,
	"source_page" integer,
	"override_role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"kind" text NOT NULL,
	"term" text NOT NULL,
	"replacement" text,
	"rule_code" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verified_records" (
	"content_id" text PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"hash" text NOT NULL,
	"rulebook_version" integer NOT NULL,
	"approvers" jsonb NOT NULL,
	"open_non_blocking" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand_name" text NOT NULL,
	"active_rulebook_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "approvals_content" ON "approvals" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "audit_ws_seq" ON "audit_events" USING btree ("workspace_id","seq");--> statement-breakpoint
CREATE INDEX "checks_content" ON "checks" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "comments_content" ON "comments" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "cv_content" ON "content_versions" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "contents_ws" ON "contents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "facts_ws" ON "facts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "findings_check" ON "findings" USING btree ("check_id");--> statement-breakpoint
CREATE INDEX "findings_ws" ON "findings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rbv_ws" ON "rulebook_versions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "rules_ws_ver" ON "rules" USING btree ("workspace_id","version");--> statement-breakpoint
CREATE INDEX "terms_ws" ON "terms" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "users_ws" ON "users" USING btree ("workspace_id");