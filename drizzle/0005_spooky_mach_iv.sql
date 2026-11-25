CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "posts_caption_trgm_idx" ON "posts" USING gin (lower("caption") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_display_name_trgm_idx" ON "profiles" USING gin (lower("display_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_username_trgm_idx" ON "users" USING gin (lower("username") gin_trgm_ops);