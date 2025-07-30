CREATE TABLE "agent_launch_log" (
	"id" text PRIMARY KEY NOT NULL,
	"email_agent_id" text NOT NULL,
	"user_id" text NOT NULL,
	"sender_email" text NOT NULL,
	"email_subject" text,
	"cursor_agent_id" text,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_agent" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"github_repository" text NOT NULL,
	"github_ref" text NOT NULL,
	"cursor_api_key" text,
	"model" text NOT NULL,
	"auto_create_pr" boolean NOT NULL,
	"is_active" boolean NOT NULL,
	"allowed_domains" text,
	"allowed_emails" text,
	"inbound_endpoint_id" text,
	"inbound_email_address_id" text,
	"email_address" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
DROP TABLE "webhook_config" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "default_cursor_api_key" text;--> statement-breakpoint
ALTER TABLE "agent_launch_log" ADD CONSTRAINT "agent_launch_log_email_agent_id_email_agent_id_fk" FOREIGN KEY ("email_agent_id") REFERENCES "public"."email_agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_launch_log" ADD CONSTRAINT "agent_launch_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_agent" ADD CONSTRAINT "email_agent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;