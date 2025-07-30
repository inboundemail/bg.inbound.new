ALTER TABLE "slack_connection" ADD COLUMN "webhook_id" text;--> statement-breakpoint
ALTER TABLE "slack_connection" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "slack_connection" ADD COLUMN "webhook_active" boolean;