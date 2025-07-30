CREATE TABLE "slack_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slack_team_id" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"slack_team_name" text,
	"slack_user_name" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_type" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_connection" ADD CONSTRAINT "slack_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;