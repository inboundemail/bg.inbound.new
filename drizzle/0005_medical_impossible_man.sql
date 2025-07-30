CREATE TABLE "webhook_config" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"github_repository" text NOT NULL,
	"github_ref" text NOT NULL,
	"cursor_api_key" text NOT NULL,
	"model" text NOT NULL,
	"auto_create_pr" boolean NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_config" ADD CONSTRAINT "webhook_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;