CREATE TABLE "post_hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_hashtags_tag_format_check" CHECK ("post_hashtags"."tag" ~ '^[a-z0-9_]{1,30}$'),
	CONSTRAINT "post_hashtags_position_check" CHECK ("post_hashtags"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_hashtags_post_tag_unique" ON "post_hashtags" USING btree ("post_id","tag");--> statement-breakpoint
CREATE UNIQUE INDEX "post_hashtags_post_position_unique" ON "post_hashtags" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "post_hashtags_tag_idx" ON "post_hashtags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "post_hashtags_post_idx" ON "post_hashtags" USING btree ("post_id");