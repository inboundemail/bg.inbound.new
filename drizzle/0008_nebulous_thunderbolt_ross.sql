ALTER TABLE "email_agent" ALTER COLUMN "model" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_agent" ADD COLUMN "branch_name" text;--> statement-breakpoint
ALTER TABLE "email_agent" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "email_agent" ADD COLUMN "webhook_secret" text;