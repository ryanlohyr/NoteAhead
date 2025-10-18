-- Add embeddingsStatus, summary, and linesJsonPages columns to files table
ALTER TABLE "files" ADD COLUMN "embeddings_status" text DEFAULT 'in_progress';
ALTER TABLE "files" ADD COLUMN "summary" text;
ALTER TABLE "files" ADD COLUMN "lines_json_pages" json;

-- Create chunks table
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"file_id" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"page_numbers" integer[] NOT NULL,
	"original_content" text,
	"context" text,
	"user_id" uuid,
	"type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);