	CREATE TABLE "notes" (
		"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
		"title" text NOT NULL,
		"content" jsonb NOT NULL,
		"userId" uuid NOT NULL,
		"folder_id" uuid,
		"created_at" timestamp DEFAULT now() NOT NULL,
		"updated_at" timestamp DEFAULT now() NOT NULL
	);
	--> statement-breakpoint
	ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
	ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;