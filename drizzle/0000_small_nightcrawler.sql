CREATE TABLE "habits" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text,
	"target_count" integer,
	"current_count" integer,
	"category" text,
	"created_by" uuid,
	"next_update" text,
	"cycle" text
);
--> statement-breakpoint
CREATE TABLE "history" (
	"id" integer PRIMARY KEY NOT NULL,
	"habit_id" integer,
	"completed" boolean,
	"current_count" integer,
	"target_count" integer,
	"user_uuid" uuid,
	"type" text,
	"timestamp" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone,
	"username" text,
	"full_name" text,
	"avatar_url" text,
	"website" text
);
--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history" ADD CONSTRAINT "history_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history" ADD CONSTRAINT "history_user_uuid_profiles_id_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;