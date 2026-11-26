CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"media_type" text DEFAULT 'image' NOT NULL,
	"byte_size" integer NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"text_overlay" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '24 hours' NOT NULL,
	CONSTRAINT "stories_media_type_check" CHECK ("stories"."media_type" = 'image'),
	CONSTRAINT "stories_byte_size_check" CHECK ("stories"."byte_size" > 0),
	CONSTRAINT "stories_caption_length_check" CHECK (length("stories"."caption") <= 500),
	CONSTRAINT "stories_text_overlay_length_check" CHECK (length("stories"."text_overlay") <= 120),
	CONSTRAINT "stories_expires_after_created_check" CHECK ("stories"."expires_at" > "stories"."created_at")
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_reactions_emoji_check" CHECK ("story_reactions"."emoji" in ('❤️', '😂', '😮', '🔥', '👏'))
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stories_storage_path_unique" ON "stories" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "stories_user_id_idx" ON "stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stories_expires_at_idx" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stories_user_expires_created_idx" ON "stories" USING btree ("user_id","expires_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_reactions_story_user_unique" ON "story_reactions" USING btree ("story_id","user_id");--> statement-breakpoint
CREATE INDEX "story_reactions_story_idx" ON "story_reactions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_reactions_user_idx" ON "story_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_views_story_viewer_unique" ON "story_views" USING btree ("story_id","viewer_id");--> statement-breakpoint
CREATE INDEX "story_views_story_idx" ON "story_views" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_views_viewer_idx" ON "story_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "story_views_viewed_at_idx" ON "story_views" USING btree ("viewed_at");