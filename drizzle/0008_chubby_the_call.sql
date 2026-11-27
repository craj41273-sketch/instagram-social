CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"moderation_action_id" uuid,
	"report_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appeals_status_check" CHECK ("appeals"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "appeals_reason_check" CHECK (length("appeals"."reason") between 10 and 2000)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_check" CHECK (length("audit_logs"."action") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "close_friends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "close_friends_no_self_check" CHECK ("close_friends"."owner_id" <> "close_friends"."member_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_requests_status_check" CHECK ("conversation_requests"."status" in ('pending', 'accepted', 'declined')),
	CONSTRAINT "conversation_requests_no_self_check" CHECK ("conversation_requests"."sender_id" <> "conversation_requests"."recipient_id")
);
--> statement-breakpoint
CREATE TABLE "follow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_requests_status_check" CHECK ("follow_requests"."status" in ('pending', 'accepted', 'declined', 'cancelled')),
	CONSTRAINT "follow_requests_no_self_check" CHECK ("follow_requests"."requester_id" <> "follow_requests"."target_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"report_id" uuid,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_actions_action_check" CHECK ("moderation_actions"."action" in (
        'warning', 'restrict', 'suspend', 'ban', 'restore', 'remove_content',
        'dismiss_report', 'resolve_report', 'escalate_report'
      )),
	CONSTRAINT "moderation_actions_reason_check" CHECK (length("moderation_actions"."reason") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"live_url" text,
	"repository_url" text,
	"portfolio_url" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"position" integer NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_projects_title_check" CHECK (length("portfolio_projects"."title") between 1 and 120),
	CONSTRAINT "portfolio_projects_description_check" CHECK (length("portfolio_projects"."description") <= 2000),
	CONSTRAINT "portfolio_projects_position_check" CHECK ("portfolio_projects"."position" between 0 and 100),
	CONSTRAINT "portfolio_projects_status_check" CHECK ("portfolio_projects"."status" in ('planned', 'in_progress', 'completed', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "profile_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"link_type" text NOT NULL,
	"icon" text,
	"position" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"visibility" text DEFAULT 'everyone' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_links_label_check" CHECK (length("profile_links"."label") between 1 and 80),
	CONSTRAINT "profile_links_url_check" CHECK (length("profile_links"."url") between 1 and 500),
	CONSTRAINT "profile_links_position_check" CHECK ("profile_links"."position" between 0 and 100),
	CONSTRAINT "profile_links_visibility_check" CHECK ("profile_links"."visibility" in ('everyone', 'followers'))
);
--> statement-breakpoint
CREATE TABLE "profile_privacy_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"who_can_message" text DEFAULT 'everyone' NOT NULL,
	"message_requests_enabled" boolean DEFAULT true NOT NULL,
	"read_receipts" boolean DEFAULT true NOT NULL,
	"activity_status" boolean DEFAULT true NOT NULL,
	"conversation_privacy" text DEFAULT 'participants' NOT NULL,
	"who_can_comment" text DEFAULT 'everyone' NOT NULL,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"mention_permission" text DEFAULT 'everyone' NOT NULL,
	"tag_approval" boolean DEFAULT false NOT NULL,
	"discoverable" boolean DEFAULT true NOT NULL,
	"contact_visibility" text DEFAULT 'followers' NOT NULL,
	"profile_info_visibility" text DEFAULT 'everyone' NOT NULL,
	"hide_like_counts" boolean DEFAULT false NOT NULL,
	"hide_view_counts" boolean DEFAULT false NOT NULL,
	"hidden_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"story_audience" text DEFAULT 'followers' NOT NULL,
	"story_replies" text DEFAULT 'everyone' NOT NULL,
	"story_interactions" text DEFAULT 'everyone' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_who_can_message_check" CHECK ("profile_privacy_settings"."who_can_message" in ('everyone', 'followers', 'nobody')),
	CONSTRAINT "privacy_conversation_privacy_check" CHECK ("profile_privacy_settings"."conversation_privacy" in ('participants', 'followers')),
	CONSTRAINT "privacy_who_can_comment_check" CHECK ("profile_privacy_settings"."who_can_comment" in ('everyone', 'followers', 'followed', 'nobody')),
	CONSTRAINT "privacy_mention_permission_check" CHECK ("profile_privacy_settings"."mention_permission" in ('everyone', 'followed', 'nobody')),
	CONSTRAINT "privacy_contact_visibility_check" CHECK ("profile_privacy_settings"."contact_visibility" in ('everyone', 'followers', 'nobody')),
	CONSTRAINT "privacy_profile_info_visibility_check" CHECK ("profile_privacy_settings"."profile_info_visibility" in ('everyone', 'followers')),
	CONSTRAINT "privacy_story_audience_check" CHECK ("profile_privacy_settings"."story_audience" in ('followers', 'close_friends', 'custom')),
	CONSTRAINT "privacy_story_controls_check" CHECK ("profile_privacy_settings"."story_replies" in ('everyone', 'followers', 'nobody')
        and "profile_privacy_settings"."story_interactions" in ('everyone', 'followers', 'nobody'))
);
--> statement-breakpoint
CREATE TABLE "report_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_evidence_kind_check" CHECK ("report_evidence"."kind" in ('chat_snapshot', 'target'))
);
--> statement-breakpoint
CREATE TABLE "report_evidence_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_evidence_access_action_check" CHECK ("report_evidence_access"."action" in ('view', 'note'))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"category" text NOT NULL,
	"reason" text,
	"explanation" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assignee_id" uuid,
	"resolution_notes" text DEFAULT '' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" in ('user', 'post', 'comment', 'story', 'message', 'conversation')),
	CONSTRAINT "reports_category_check" CHECK ("reports"."category" in (
        'spam', 'scam_fraud', 'harassment', 'bullying', 'hate_speech',
        'threats_violence', 'impersonation', 'sexual_content', 'exploitation',
        'child_safety', 'privacy_violation', 'self_harm', 'dangerous_content',
        'intellectual_property', 'other'
      )),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('pending', 'reviewing', 'escalated', 'resolved', 'dismissed')),
	CONSTRAINT "reports_priority_check" CHECK ("reports"."priority" in ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "reports_explanation_check" CHECK (length("reports"."explanation") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "risk_assessment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_score" integer,
	"score" integer,
	"reason" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_history_action_check" CHECK ("risk_assessment_history"."action" in ('set', 'remove')),
	CONSTRAINT "risk_history_reason_check" CHECK (length("risk_assessment_history"."reason") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reason" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assessed_by" uuid NOT NULL,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_assessments_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "risk_assessments_score_check" CHECK ("risk_assessments"."score" between 0 and 100),
	CONSTRAINT "risk_assessments_reason_check" CHECK (length("risk_assessments"."reason") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "story_audience_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_audience_kind_check" CHECK ("story_audience_entries"."kind" in ('include', 'exclude'))
);
--> statement-breakpoint
CREATE TABLE "trust_hypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giver_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trust_hypes_state_check" CHECK ("trust_hypes"."state" in ('active', 'withdrawn')),
	CONSTRAINT "trust_hypes_no_self_check" CHECK ("trust_hypes"."giver_id" <> "trust_hypes"."target_id")
);
--> statement-breakpoint
CREATE TABLE "user_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_relationships_kind_check" CHECK ("user_relationships"."kind" in ('block', 'restrict', 'mute')),
	CONSTRAINT "user_relationships_no_self_check" CHECK ("user_relationships"."actor_id" <> "user_relationships"."target_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "account_category" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "professional_roles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "professional_details" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "audience" text DEFAULT 'followers' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_moderation_action_id_moderation_actions_id_fk" FOREIGN KEY ("moderation_action_id") REFERENCES "public"."moderation_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "close_friends" ADD CONSTRAINT "close_friends_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_requests" ADD CONSTRAINT "conversation_requests_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_requests" ADD CONSTRAINT "conversation_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_requests" ADD CONSTRAINT "conversation_requests_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_privacy_settings" ADD CONSTRAINT "profile_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_evidence_access" ADD CONSTRAINT "report_evidence_access_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_evidence_access" ADD CONSTRAINT "report_evidence_access_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment_history" ADD CONSTRAINT "risk_assessment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessment_history" ADD CONSTRAINT "risk_assessment_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_entries" ADD CONSTRAINT "story_audience_entries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_entries" ADD CONSTRAINT "story_audience_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_hypes" ADD CONSTRAINT "trust_hypes_giver_id_users_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_hypes" ADD CONSTRAINT "trust_hypes_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appeals_status_created_idx" ON "appeals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "appeals_user_idx" ON "appeals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "close_friends_owner_member_unique" ON "close_friends" USING btree ("owner_id","member_id");--> statement-breakpoint
CREATE INDEX "close_friends_owner_idx" ON "close_friends" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_requests_conversation_sender_unique" ON "conversation_requests" USING btree ("conversation_id","sender_id");--> statement-breakpoint
CREATE INDEX "conversation_requests_recipient_status_idx" ON "conversation_requests" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "follow_requests_requester_target_unique" ON "follow_requests" USING btree ("requester_id","target_id");--> statement-breakpoint
CREATE INDEX "follow_requests_target_status_idx" ON "follow_requests" USING btree ("target_id","status");--> statement-breakpoint
CREATE INDEX "follow_requests_requester_status_idx" ON "follow_requests" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "moderation_actions_user_created_idx" ON "moderation_actions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_actions_report_idx" ON "moderation_actions" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "portfolio_projects_user_position_idx" ON "portfolio_projects" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "portfolio_projects_user_featured_idx" ON "portfolio_projects" USING btree ("user_id","featured");--> statement-breakpoint
CREATE INDEX "profile_links_user_position_idx" ON "profile_links" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "report_evidence_report_idx" ON "report_evidence" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_evidence_access_report_created_idx" ON "report_evidence_access" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_duplicate_idx" ON "reports" USING btree ("reporter_id","target_type","target_id","category");--> statement-breakpoint
CREATE INDEX "reports_status_priority_created_idx" ON "reports" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_assignee_idx" ON "reports" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "risk_history_user_created_idx" ON "risk_assessment_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "risk_assessments_user_id_idx" ON "risk_assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "risk_assessments_score_idx" ON "risk_assessments" USING btree ("score");--> statement-breakpoint
CREATE UNIQUE INDEX "story_audience_story_user_kind_unique" ON "story_audience_entries" USING btree ("story_id","user_id","kind");--> statement-breakpoint
CREATE INDEX "story_audience_story_idx" ON "story_audience_entries" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_audience_user_idx" ON "story_audience_entries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trust_hypes_giver_target_unique" ON "trust_hypes" USING btree ("giver_id","target_id");--> statement-breakpoint
CREATE INDEX "trust_hypes_target_state_idx" ON "trust_hypes" USING btree ("target_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "user_relationships_actor_target_kind_unique" ON "user_relationships" USING btree ("actor_id","target_id","kind");--> statement-breakpoint
CREATE INDEX "user_relationships_target_idx" ON "user_relationships" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "user_relationships_kind_idx" ON "user_relationships" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "profiles_private_idx" ON "profiles" USING btree ("is_private");--> statement-breakpoint
CREATE INDEX "profiles_account_category_idx" ON "profiles" USING btree ("account_category");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_account_status_idx" ON "users" USING btree ("account_status");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in (
        'follow', 'like', 'comment', 'story_reaction', 'message',
        'moderation', 'report_update', 'appeal_update'
      ));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_category_check" CHECK ("profiles"."account_category" in (
        'personal', 'developer', 'company', 'creator', 'marketer', 'freelancer',
        'ecommerce', 'designer', 'photographer', 'educator', 'founder',
        'professional', 'organization', 'student', 'other'
      ));--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_audience_check" CHECK ("stories"."audience" in ('followers', 'close_friends', 'custom'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'moderator', 'admin'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_status_check" CHECK ("users"."account_status" in ('active', 'warning', 'restricted', 'suspended', 'banned'));