CREATE TABLE "cursor_agent_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"cursor_agent_id" text NOT NULL,
	"email_agent_id" text NOT NULL,
	"original_email_id" text NOT NULL,
	"email_address" text NOT NULL,
	"webhook_secret" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "cursor_agent_mapping_cursor_agent_id_unique" UNIQUE("cursor_agent_id")
);
--> statement-breakpoint
ALTER TABLE "cursor_agent_mapping" ADD CONSTRAINT "cursor_agent_mapping_email_agent_id_email_agent_id_fk" FOREIGN KEY ("email_agent_id") REFERENCES "public"."email_agent"("id") ON DELETE cascade ON UPDATE no action;